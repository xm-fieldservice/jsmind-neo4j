"""
基于AutoGen 0.7.1框架的统一脑图控制器
完全使用AutoGen内生机制，替代原有的自定义存储实现
"""
import asyncio
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from pathlib import Path

# 导入AutoGen内存管理器
from autogen_memory_manager import memory_manager
from autogen_config import MD_STORAGE_PATH, PERFORMANCE_CONFIG


class AutoGenMindmapController:
    """基于AutoGen框架的脑图控制器"""
    
    def __init__(self):
        self.current_project_id: Optional[str] = None
        self.current_data: Optional[Dict[str, Any]] = None
        self.jsmind_instance = None
        self.cache = {}
        self.cache_size = PERFORMANCE_CONFIG["cache_size"]
        
        # 事件回调
        self.on_data_changed: Optional[Callable] = None
        self.on_project_loaded: Optional[Callable] = None
        
    async def initialize(self):
        """异步初始化控制器"""
        try:
            # 确保AutoGen内存管理器已初始化
            stats = memory_manager.get_storage_stats()
            print(f"AutoGen存储状态: {stats}")
            return True
        except Exception as e:
            print(f"初始化失败: {e}")
            return False
    
    def set_jsmind_instance(self, jsmind_instance):
        """设置jsMind实例"""
        self.jsmind_instance = jsmind_instance
    
    def get_default_data(self) -> Dict[str, Any]:
        """获取默认脑图数据"""
        return {
            "id": "root",
            "label": "项目脑图",
            "content": "# 根节点\n\n在此编写内容...",
            "expanded": True,
            "children": [
                {"id": "n1", "label": "需求", "content": "需求说明...", "children": []},
                {"id": "n2", "label": "设计", "content": "设计说明...", "children": []},
                {"id": "n3", "label": "开发", "content": "开发计划...", "children": []},
            ],
        }
    
    async def create_new_mindmap(self, name: str = "新建项目") -> Dict[str, Any]:
        """创建新脑图并存储到AutoGen系统"""
        try:
            # 生成新的项目数据
            mindmap_data = self.get_default_data()
            project_id = f"project_{datetime.now().timestamp()}"
            mindmap_data["id"] = project_id
            
            project_data = {
                "id": project_id,
                "name": name,
                "payload": {
                    "meta": {"name": name},
                    "format": "node_tree",
                    "data": mindmap_data
                },
                "createdAt": datetime.now().timestamp() * 1000,
                "updatedAt": datetime.now().timestamp() * 1000,
                "content_hash": self._compute_hash(json.dumps(mindmap_data)),
                "is_fav": False,
                "tags": ["新建"]
            }
            
            # 存储到AutoGen系统
            success = await memory_manager.store_mindmap_tree(project_data)
            if success:
                self.current_project_id = project_id
                self.current_data = mindmap_data
                
                # 更新缓存
                self._update_cache(project_id, project_data)
                
                # 触发事件
                if self.on_project_loaded:
                    self.on_project_loaded(project_data)
                
                return project_data
            else:
                raise Exception("存储到AutoGen系统失败")
                
        except Exception as e:
            print(f"创建新脑图失败: {e}")
            return {}
    
    async def load_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """根据ID加载项目"""
        try:
            # 先检查缓存
            if project_id in self.cache:
                cached_data = self.cache[project_id]
                self.current_project_id = project_id
                self.current_data = cached_data["payload"]["data"]
                return cached_data
            
            # 从AutoGen系统检索
            # 这里需要实现具体的检索逻辑
            # 暂时从统一MD文档读取
            project_data = await self._load_from_md_storage(project_id)
            
            if project_data:
                self.current_project_id = project_id
                self.current_data = project_data["payload"]["data"]
                self._update_cache(project_id, project_data)
                
                if self.on_project_loaded:
                    self.on_project_loaded(project_data)
                
                return project_data
            
            return None
            
        except Exception as e:
            print(f"加载项目失败: {e}")
            return None
    
    async def save_current_mindmap(self) -> bool:
        """保存当前脑图到AutoGen系统"""
        if not self.current_project_id or not self.current_data:
            return False
        
        try:
            # 构建项目数据
            project_data = {
                "id": self.current_project_id,
                "name": self.current_data.get("label", "未命名项目"),
                "payload": {
                    "meta": {"name": self.current_data.get("label", "未命名项目")},
                    "format": "node_tree",
                    "data": self.current_data
                },
                "updatedAt": datetime.now().timestamp() * 1000,
                "content_hash": self._compute_hash(json.dumps(self.current_data)),
                "tags": ["已保存"]
            }
            
            # 存储到AutoGen系统
            success = await memory_manager.store_mindmap_tree(project_data)
            
            if success:
                # 更新缓存
                self._update_cache(self.current_project_id, project_data)
                
                # 触发数据变更事件
                if self.on_data_changed:
                    self.on_data_changed(project_data)
                
                return True
            
            return False
            
        except Exception as e:
            print(f"保存脑图失败: {e}")
            return False
    
    async def search_projects(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """使用AutoGen系统搜索项目"""
        try:
            results = await memory_manager.retrieve_relevant_projects(query, limit)
            return results
        except Exception as e:
            print(f"搜索项目失败: {e}")
            return []
    
    async def get_all_projects(self) -> List[Dict[str, Any]]:
        """获取所有项目列表"""
        try:
            # 从统一MD文档解析所有项目
            projects = await self._parse_all_projects_from_md()
            return projects
        except Exception as e:
            print(f"获取项目列表失败: {e}")
            return []
    
    def update_node(self, node_id: str, updates: Dict[str, Any]) -> bool:
        """更新节点数据"""
        if not self.current_data:
            return False
        
        try:
            # 递归查找并更新节点
            def update_node_recursive(node, target_id, updates):
                if node.get("id") == target_id:
                    node.update(updates)
                    return True
                
                if "children" in node:
                    for child in node["children"]:
                        if update_node_recursive(child, target_id, updates):
                            return True
                return False
            
            success = update_node_recursive(self.current_data, node_id, updates)
            
            if success and self.on_data_changed:
                self.on_data_changed(self.current_data)
            
            return success
            
        except Exception as e:
            print(f"更新节点失败: {e}")
            return False
    
    def add_node(self, parent_id: str, node_data: Dict[str, Any]) -> bool:
        """添加新节点"""
        if not self.current_data:
            return False
        
        try:
            # 递归查找父节点并添加子节点
            def add_node_recursive(node, target_parent_id, new_node):
                if node.get("id") == target_parent_id:
                    if "children" not in node:
                        node["children"] = []
                    node["children"].append(new_node)
                    return True
                
                if "children" in node:
                    for child in node["children"]:
                        if add_node_recursive(child, target_parent_id, new_node):
                            return True
                return False
            
            success = add_node_recursive(self.current_data, parent_id, node_data)
            
            if success and self.on_data_changed:
                self.on_data_changed(self.current_data)
            
            return success
            
        except Exception as e:
            print(f"添加节点失败: {e}")
            return False
    
    def delete_node(self, node_id: str) -> bool:
        """删除节点"""
        if not self.current_data or node_id == self.current_data.get("id"):
            return False  # 不能删除根节点
        
        try:
            # 递归查找并删除节点
            def delete_node_recursive(node, target_id):
                if "children" in node:
                    for i, child in enumerate(node["children"]):
                        if child.get("id") == target_id:
                            del node["children"][i]
                            return True
                        if delete_node_recursive(child, target_id):
                            return True
                return False
            
            success = delete_node_recursive(self.current_data, node_id)
            
            if success and self.on_data_changed:
                self.on_data_changed(self.current_data)
            
            return success
            
        except Exception as e:
            print(f"删除节点失败: {e}")
            return False
    
    def to_jsmind_tree(self, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """转换为jsMind格式"""
        if data is None:
            data = self.current_data
        
        if not data:
            return {}
        
        def convert_node(node):
            jsmind_node = {
                "id": node.get("id"),
                "topic": node.get("label", ""),
                "expanded": node.get("expanded", True)
            }
            
            if "children" in node and node["children"]:
                jsmind_node["children"] = [convert_node(child) for child in node["children"]]
            
            return jsmind_node
        
        return {
            "meta": {"name": data.get("label", "脑图"), "version": "1.0"},
            "format": "node_tree",
            "data": convert_node(data)
        }
    
    def _compute_hash(self, content: str) -> str:
        """计算内容哈希"""
        return hashlib.md5(content.encode()).hexdigest()
    
    def _update_cache(self, project_id: str, project_data: Dict[str, Any]):
        """更新缓存"""
        if len(self.cache) >= self.cache_size:
            # 简单的LRU：删除第一个项目
            first_key = next(iter(self.cache))
            del self.cache[first_key]
        
        self.cache[project_id] = project_data
    
    async def _load_from_md_storage(self, project_id: str) -> Optional[Dict[str, Any]]:
        """从MD存储加载项目"""
        try:
            if not MD_STORAGE_PATH.exists():
                return None
            
            with open(MD_STORAGE_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 简单解析MD文档中的项目数据
            # 这里需要实现更复杂的解析逻辑
            lines = content.split('\n')
            in_project_section = False
            json_content = ""
            
            for line in lines:
                if f"- ID: {project_id}" in line:
                    in_project_section = True
                elif in_project_section and line.startswith("```json"):
                    continue
                elif in_project_section and line.startswith("```"):
                    break
                elif in_project_section and line.strip():
                    json_content += line + "\n"
            
            if json_content:
                mindmap_data = json.loads(json_content)
                return {
                    "id": project_id,
                    "name": mindmap_data.get("label", "未命名项目"),
                    "payload": {
                        "data": mindmap_data
                    }
                }
            
            return None
            
        except Exception as e:
            print(f"从MD存储加载失败: {e}")
            return None
    
    async def _parse_all_projects_from_md(self) -> List[Dict[str, Any]]:
        """从MD文档解析所有项目"""
        try:
            if not MD_STORAGE_PATH.exists():
                return []
            
            with open(MD_STORAGE_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
            
            projects = []
            # 这里需要实现完整的MD解析逻辑
            # 暂时返回空列表
            return projects
            
        except Exception as e:
            print(f"解析所有项目失败: {e}")
            return []


# 全局实例
autogen_controller = AutoGenMindmapController()


# JavaScript接口适配器
class JSInterfaceAdapter:
    """JavaScript接口适配器，保持与原有前端的兼容性"""
    
    def __init__(self, controller: AutoGenMindmapController):
        self.controller = controller
    
    async def js_create_new_mindmap(self, name: str = "新建项目") -> str:
        """JavaScript调用的创建新脑图接口"""
        result = await self.controller.create_new_mindmap(name)
        return json.dumps(result, ensure_ascii=False)
    
    async def js_load_project(self, project_id: str) -> str:
        """JavaScript调用的加载项目接口"""
        result = await self.controller.load_project_by_id(project_id)
        return json.dumps(result, ensure_ascii=False) if result else "{}"
    
    async def js_save_mindmap(self) -> str:
        """JavaScript调用的保存脑图接口"""
        success = await self.controller.save_current_mindmap()
        return json.dumps({"success": success})
    
    async def js_search_projects(self, query: str, limit: int = 10) -> str:
        """JavaScript调用的搜索项目接口"""
        results = await self.controller.search_projects(query, limit)
        return json.dumps(results, ensure_ascii=False)
    
    async def js_get_all_projects(self) -> str:
        """JavaScript调用的获取所有项目接口"""
        results = await self.controller.get_all_projects()
        return json.dumps(results, ensure_ascii=False)


# 全局JS适配器实例
js_adapter = JSInterfaceAdapter(autogen_controller)


async def main():
    """测试函数"""
    print("AutoGen脑图控制器测试")
    
    # 初始化
    success = await autogen_controller.initialize()
    print(f"初始化结果: {success}")
    
    if success:
        # 测试创建新脑图
        project = await autogen_controller.create_new_mindmap("测试项目")
        print(f"创建项目: {project.get('name', 'Unknown')}")
        
        # 测试保存
        save_result = await autogen_controller.save_current_mindmap()
        print(f"保存结果: {save_result}")
        
        # 测试搜索
        search_results = await autogen_controller.search_projects("测试")
        print(f"搜索结果: {len(search_results)} 个项目")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MD底座初始化同步器
在系统启动时自动同步现有脑图数据到MD底座
"""
import json
import os
import time
import hashlib
from pathlib import Path
from datetime import datetime

class MDSyncInitializer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.data_dir = self.project_root / 'data'
        self.md_file = self.data_dir / 'unified_mindmap_storage.md'
        self.registry_file = self.data_dir / 'mindmap_registry.json'
        
    def initialize_md_sync(self):
        """初始化MD同步：将现有数据同步到MD底座"""
        print("[MD同步] 开始初始化同步...")
        
        try:
            # 1. 确保MD文件存在
            self._ensure_md_file()
            
            # 2. 读取现有注册表数据
            existing_projects = self._load_existing_projects()
            
            if not existing_projects:
                print("[MD同步] 未发现现有项目数据，跳过同步")
                return True
            
            # 3. 检查MD文件是否已有数据
            if self._md_has_projects():
                print("[MD同步] MD底座已有项目数据，跳过初始化")
                return True
            
            # 4. 将现有项目同步到MD底座
            synced_count = self._sync_projects_to_md(existing_projects)
            
            print(f"[MD同步] 初始化完成，已同步 {synced_count} 个项目到MD底座")
            return True
            
        except Exception as e:
            print(f"[MD同步] 初始化失败: {e}")
            return False
    
    def _ensure_md_file(self):
        """确保MD文件存在"""
        if not self.md_file.exists():
            self._create_default_md_file()
    
    def _create_default_md_file(self):
        """创建默认MD文件"""
        default_content = """# 统一脑图存储文档

这是AutoGen混合存储架构的统一MD文档，用于存储所有脑图数据。

## 存储格式说明

每个脑图项目以以下格式存储：

```
## 项目: [项目名称] (ID: [项目ID])
- 创建时间: [时间戳]
- 最后修改: [时间戳]
- 数据温度: [hot/warm/cold/archive]

### 脑图结构
[JSON格式的脑图数据]

### 内容详情
[节点内容和附件信息]

---
```

## 项目列表

*暂无项目，等待第一个脑图创建...*

"""
        self.data_dir.mkdir(exist_ok=True)
        with self.md_file.open('w', encoding='utf-8') as f:
            f.write(default_content)
        print(f"[MD同步] 已创建默认MD文件: {self.md_file}")
    
    def _load_existing_projects(self):
        """加载现有项目数据"""
        projects = []
        
        # 从注册表加载
        if self.registry_file.exists():
            try:
                with self.registry_file.open('r', encoding='utf-8') as f:
                    registry = json.load(f)
                    projects.extend(registry.get('projects', []))
                print(f"[MD同步] 从注册表加载了 {len(projects)} 个项目")
            except Exception as e:
                print(f"[MD同步] 读取注册表失败: {e}")
        
        # TODO: 可以扩展从其他数据源加载
        # 例如：从localStorage备份文件、IndexedDB导出等
        
        return projects
    
    def _md_has_projects(self):
        """检查MD文件是否已有项目数据"""
        try:
            with self.md_file.open('r', encoding='utf-8') as f:
                content = f.read()
            
            # 简单检查：是否包含项目标记
            return '## 项目:' in content and 'ID:' in content
        except Exception:
            return False
    
    def _sync_projects_to_md(self, projects):
        """将项目同步到MD底座"""
        synced_count = 0
        
        try:
            # 读取当前MD内容
            with self.md_file.open('r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 为每个项目生成MD段落
            for project in projects:
                try:
                    project_md = self._generate_project_md(project)
                    if project_md:
                        md_content += project_md
                        synced_count += 1
                        print(f"[MD同步] 已同步项目: {project.get('project_id', 'unknown')}")
                except Exception as e:
                    print(f"[MD同步] 同步项目失败: {e}")
            
            # 写回MD文件
            with self.md_file.open('w', encoding='utf-8') as f:
                f.write(md_content)
            
            return synced_count
            
        except Exception as e:
            print(f"[MD同步] 批量同步失败: {e}")
            return 0
    
    def _generate_project_md(self, project):
        """为单个项目生成MD格式"""
        try:
            # 提取项目信息
            project_id = project.get('project_id') or project.get('payload', {}).get('data', {}).get('id', 'unknown')
            project_name = self._extract_project_name(project)
            
            # 生成时间戳
            created_at = datetime.fromtimestamp(project.get('createdAt', time.time()) / 1000).isoformat() + 'Z'
            updated_at = datetime.fromtimestamp(project.get('updatedAt', time.time()) / 1000).isoformat() + 'Z'
            
            # 评估数据温度
            temperature = self._evaluate_temperature(project)
            access_count = project.get('accessCount', 0)
            
            # 生成MD内容
            md_content = f"""## 项目: {project_name} (ID: {project_id})
- 创建时间: {created_at}
- 最后修改: {updated_at}
- 数据温度: {temperature}
- 访问次数: {access_count}

### 脑图结构
```json
{json.dumps(project.get('payload', {}), ensure_ascii=False, indent=2)}
```

### 节点内容
{self._generate_node_content(project)}

---

"""
            return md_content
            
        except Exception as e:
            print(f"[MD同步] 生成项目MD失败: {e}")
            return None
    
    def _extract_project_name(self, project):
        """提取项目名称"""
        # 优先级：name > payload.data.topic > project_id
        name = project.get('name')
        if name:
            return name
        
        payload = project.get('payload', {})
        if isinstance(payload, dict):
            data = payload.get('data', {})
            if isinstance(data, dict):
                topic = data.get('topic')
                if topic:
                    return topic
        
        return project.get('project_id', '未命名项目')
    
    def _evaluate_temperature(self, project):
        """评估数据温度"""
        access_count = project.get('accessCount', 0)
        updated_at = project.get('updatedAt', 0)
        
        if updated_at:
            days_since_update = (time.time() * 1000 - updated_at) / (1000 * 60 * 60 * 24)
        else:
            days_since_update = 999
        
        if access_count >= 50:
            return 'hot'
        elif access_count >= 10:
            return 'warm'
        elif days_since_update <= 90:
            return 'warm'
        elif days_since_update <= 365:
            return 'cold'
        else:
            return 'archive'
    
    def _generate_node_content(self, project):
        """生成节点内容详情"""
        try:
            payload = project.get('payload', {})
            if not isinstance(payload, dict):
                return "*无节点内容*"
            
            data = payload.get('data', {})
            if not isinstance(data, dict):
                return "*无节点内容*"
            
            return self._convert_node_to_md(data, 0)
            
        except Exception as e:
            return f"*节点内容解析失败: {e}*"
    
    def _convert_node_to_md(self, node, level):
        """递归转换节点为MD格式"""
        if not isinstance(node, dict):
            return ""
        
        indent = '  ' * level
        topic = node.get('topic', '未命名节点')
        node_id = node.get('id', 'unknown')
        
        content = ""
        if node.get('data') and isinstance(node['data'], dict):
            node_content = node['data'].get('content', '')
            if node_content:
                content = f"\n{indent}  - 内容: {node_content}"
        
        md_content = f"{indent}- **{topic}** (ID: {node_id}){content}\n"
        
        # 处理子节点
        children = node.get('children', [])
        if isinstance(children, list):
            for child in children:
                md_content += self._convert_node_to_md(child, level + 1)
        
        return md_content


def main():
    """主函数：执行MD同步初始化"""
    import sys
    
    # 获取项目根目录
    if len(sys.argv) > 1:
        project_root = sys.argv[1]
    else:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 执行初始化
    initializer = MDSyncInitializer(project_root)
    success = initializer.initialize_md_sync()
    
    if success:
        print("[MD同步] 初始化成功")
        sys.exit(0)
    else:
        print("[MD同步] 初始化失败")
        sys.exit(1)


if __name__ == '__main__':
    main()

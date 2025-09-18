"""
混合存储架构设计
本地MD存储 + 服务器端向量库/图库/DB库的冷热数据分层方案
基于AutoGen 0.7.1框架实现
"""
import asyncio
import json
import hashlib
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# 导入AutoGen组件
from autogen_memory_manager import memory_manager
from autogen_config import MD_STORAGE_PATH, DATA_DIR


class DataTemperature(Enum):
    """数据温度分类"""
    HOT = "hot"      # 热数据：频繁访问，本地存储
    WARM = "warm"    # 温数据：中等访问，本地+服务器
    COLD = "cold"    # 冷数据：低频访问，主要在服务器
    ARCHIVE = "archive"  # 归档数据：极少访问，仅服务器


@dataclass
class StorageLocation:
    """存储位置配置"""
    local_md: bool = True          # 本地MD文档
    local_cache: bool = False      # 本地缓存
    server_vector: bool = False    # 服务器向量库
    server_graph: bool = False     # 服务器图库
    server_db: bool = False        # 服务器数据库
    server_archive: bool = False   # 服务器归档


class HybridStorageArchitecture:
    """混合存储架构管理器"""
    
    def __init__(self):
        self.local_md_path = MD_STORAGE_PATH
        self.local_cache_dir = DATA_DIR / "local_cache"
        self.sync_log_path = DATA_DIR / "sync_log.json"
        
        # 存储策略配置
        self.storage_strategies = {
            DataTemperature.HOT: StorageLocation(
                local_md=True, local_cache=True, 
                server_vector=True, server_graph=False, server_db=False
            ),
            DataTemperature.WARM: StorageLocation(
                local_md=True, local_cache=False,
                server_vector=True, server_graph=True, server_db=True
            ),
            DataTemperature.COLD: StorageLocation(
                local_md=False, local_cache=False,
                server_vector=True, server_graph=True, server_db=True
            ),
            DataTemperature.ARCHIVE: StorageLocation(
                local_md=False, local_cache=False,
                server_vector=False, server_graph=False, 
                server_db=True, server_archive=True
            )
        }
        
        # 数据温度评估参数
        self.temperature_thresholds = {
            "hot_access_count": 50,      # 30天内访问50次以上为热数据
            "warm_access_count": 10,     # 30天内访问10-50次为温数据
            "cold_days_threshold": 90,   # 90天未访问为冷数据
            "archive_days_threshold": 365  # 365天未访问为归档数据
        }
        
        # 确保目录存在
        self.local_cache_dir.mkdir(exist_ok=True)
    
    def evaluate_data_temperature(self, project_data: Dict[str, Any]) -> DataTemperature:
        """评估数据温度"""
        try:
            # 获取访问统计
            access_stats = self._get_access_statistics(project_data.get("id"))
            
            # 计算温度评分
            current_time = datetime.now()
            last_access = datetime.fromtimestamp(
                project_data.get("updatedAt", 0) / 1000
            )
            days_since_access = (current_time - last_access).days
            
            access_count_30d = access_stats.get("access_count_30d", 0)
            
            # 温度判断逻辑
            if access_count_30d >= self.temperature_thresholds["hot_access_count"]:
                return DataTemperature.HOT
            elif access_count_30d >= self.temperature_thresholds["warm_access_count"]:
                return DataTemperature.WARM
            elif days_since_access <= self.temperature_thresholds["cold_days_threshold"]:
                return DataTemperature.WARM
            elif days_since_access <= self.temperature_thresholds["archive_days_threshold"]:
                return DataTemperature.COLD
            else:
                return DataTemperature.ARCHIVE
                
        except Exception as e:
            print(f"评估数据温度失败: {e}")
            return DataTemperature.WARM  # 默认为温数据
    
    async def store_project_data(self, project_data: Dict[str, Any]) -> bool:
        """根据数据温度存储项目数据"""
        try:
            # 评估数据温度
            temperature = self.evaluate_data_temperature(project_data)
            storage_config = self.storage_strategies[temperature]
            
            project_id = project_data.get("id")
            print(f"存储项目 {project_id}，温度: {temperature.value}")
            
            success_count = 0
            total_operations = 0
            
            # 1. 本地MD文档存储
            if storage_config.local_md:
                total_operations += 1
                if await self._store_to_local_md(project_data):
                    success_count += 1
                    print(f"✓ 本地MD存储成功")
                else:
                    print(f"✗ 本地MD存储失败")
            
            # 2. 本地缓存存储
            if storage_config.local_cache:
                total_operations += 1
                if await self._store_to_local_cache(project_data):
                    success_count += 1
                    print(f"✓ 本地缓存存储成功")
                else:
                    print(f"✗ 本地缓存存储失败")
            
            # 3. 服务器向量库存储
            if storage_config.server_vector:
                total_operations += 1
                if await self._store_to_server_vector(project_data):
                    success_count += 1
                    print(f"✓ 服务器向量库存储成功")
                else:
                    print(f"✗ 服务器向量库存储失败")
            
            # 4. 服务器图库存储
            if storage_config.server_graph:
                total_operations += 1
                if await self._store_to_server_graph(project_data):
                    success_count += 1
                    print(f"✓ 服务器图库存储成功")
                else:
                    print(f"✗ 服务器图库存储失败")
            
            # 5. 服务器数据库存储
            if storage_config.server_db:
                total_operations += 1
                if await self._store_to_server_db(project_data):
                    success_count += 1
                    print(f"✓ 服务器数据库存储成功")
                else:
                    print(f"✗ 服务器数据库存储失败")
            
            # 6. 服务器归档存储
            if storage_config.server_archive:
                total_operations += 1
                if await self._store_to_server_archive(project_data):
                    success_count += 1
                    print(f"✓ 服务器归档存储成功")
                else:
                    print(f"✗ 服务器归档存储失败")
            
            # 记录同步日志
            await self._log_sync_operation(project_id, temperature, success_count, total_operations)
            
            return success_count == total_operations
            
        except Exception as e:
            print(f"存储项目数据失败: {e}")
            return False
    
    async def retrieve_project_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """智能检索项目数据"""
        try:
            # 1. 先从本地缓存查找（最快）
            if data := await self._retrieve_from_local_cache(project_id):
                print(f"从本地缓存获取数据: {project_id}")
                return data
            
            # 2. 从本地MD文档查找
            if data := await self._retrieve_from_local_md(project_id):
                print(f"从本地MD文档获取数据: {project_id}")
                # 异步更新到缓存
                asyncio.create_task(self._store_to_local_cache(data))
                return data
            
            # 3. 从服务器向量库查找
            if data := await self._retrieve_from_server_vector(project_id):
                print(f"从服务器向量库获取数据: {project_id}")
                # 根据访问频率决定是否缓存到本地
                await self._consider_local_promotion(data)
                return data
            
            # 4. 从服务器数据库查找
            if data := await self._retrieve_from_server_db(project_id):
                print(f"从服务器数据库获取数据: {project_id}")
                return data
            
            # 5. 从服务器归档查找（最慢）
            if data := await self._retrieve_from_server_archive(project_id):
                print(f"从服务器归档获取数据: {project_id}")
                return data
            
            return None
            
        except Exception as e:
            print(f"检索项目数据失败: {e}")
            return None
    
    async def sync_with_server(self, force_sync: bool = False) -> Dict[str, Any]:
        """与服务器同步数据"""
        try:
            sync_stats = {
                "start_time": datetime.now().isoformat(),
                "local_to_server": 0,
                "server_to_local": 0,
                "conflicts_resolved": 0,
                "errors": 0
            }
            
            # 1. 获取本地变更
            local_changes = await self._get_local_changes()
            
            # 2. 获取服务器变更
            server_changes = await self._get_server_changes()
            
            # 3. 同步本地变更到服务器
            for change in local_changes:
                try:
                    if await self._sync_local_to_server(change):
                        sync_stats["local_to_server"] += 1
                    else:
                        sync_stats["errors"] += 1
                except Exception as e:
                    print(f"同步到服务器失败: {e}")
                    sync_stats["errors"] += 1
            
            # 4. 同步服务器变更到本地
            for change in server_changes:
                try:
                    if await self._sync_server_to_local(change):
                        sync_stats["server_to_local"] += 1
                    else:
                        sync_stats["errors"] += 1
                except Exception as e:
                    print(f"从服务器同步失败: {e}")
                    sync_stats["errors"] += 1
            
            # 5. 处理冲突
            conflicts = await self._detect_conflicts()
            for conflict in conflicts:
                if await self._resolve_conflict(conflict):
                    sync_stats["conflicts_resolved"] += 1
            
            sync_stats["end_time"] = datetime.now().isoformat()
            sync_stats["success"] = sync_stats["errors"] == 0
            
            # 记录同步日志
            await self._log_sync_stats(sync_stats)
            
            return sync_stats
            
        except Exception as e:
            print(f"数据同步失败: {e}")
            return {"success": False, "error": str(e)}
    
    async def optimize_storage_distribution(self) -> Dict[str, Any]:
        """优化存储分布"""
        try:
            optimization_stats = {
                "promoted_to_hot": 0,
                "demoted_to_cold": 0,
                "archived": 0,
                "storage_saved_gb": 0
            }
            
            # 1. 分析所有项目的访问模式
            all_projects = await self._get_all_projects()
            
            for project in all_projects:
                current_temp = self.evaluate_data_temperature(project)
                project_id = project.get("id")
                
                # 2. 检查是否需要温度调整
                if await self._should_promote_to_hot(project):
                    await self._promote_to_hot_storage(project)
                    optimization_stats["promoted_to_hot"] += 1
                    print(f"提升为热数据: {project_id}")
                
                elif await self._should_demote_to_cold(project):
                    await self._demote_to_cold_storage(project)
                    optimization_stats["demoted_to_cold"] += 1
                    print(f"降级为冷数据: {project_id}")
                
                elif await self._should_archive(project):
                    await self._archive_project(project)
                    optimization_stats["archived"] += 1
                    print(f"归档项目: {project_id}")
            
            return optimization_stats
            
        except Exception as e:
            print(f"存储优化失败: {e}")
            return {"success": False, "error": str(e)}
    
    # 私有方法实现
    async def _store_to_local_md(self, project_data: Dict[str, Any]) -> bool:
        """存储到本地MD文档"""
        try:
            # 使用现有的AutoGen内存管理器
            return await memory_manager.store_mindmap_tree(project_data)
        except Exception as e:
            print(f"本地MD存储失败: {e}")
            return False
    
    async def _store_to_local_cache(self, project_data: Dict[str, Any]) -> bool:
        """存储到本地缓存"""
        try:
            project_id = project_data.get("id")
            cache_file = self.local_cache_dir / f"{project_id}.json"
            
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(project_data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"本地缓存存储失败: {e}")
            return False
    
    async def _store_to_server_vector(self, project_data: Dict[str, Any]) -> bool:
        """存储到服务器向量库"""
        try:
            # 这里应该调用服务器API
            # 暂时模拟成功
            print(f"模拟存储到服务器向量库: {project_data.get('id')}")
            return True
        except Exception as e:
            print(f"服务器向量库存储失败: {e}")
            return False
    
    async def _store_to_server_graph(self, project_data: Dict[str, Any]) -> bool:
        """存储到服务器图库"""
        try:
            # 这里应该调用Neo4j图数据库API
            print(f"模拟存储到服务器图库: {project_data.get('id')}")
            return True
        except Exception as e:
            print(f"服务器图库存储失败: {e}")
            return False
    
    async def _store_to_server_db(self, project_data: Dict[str, Any]) -> bool:
        """存储到服务器数据库"""
        try:
            # 这里应该调用关系数据库API
            print(f"模拟存储到服务器数据库: {project_data.get('id')}")
            return True
        except Exception as e:
            print(f"服务器数据库存储失败: {e}")
            return False
    
    async def _store_to_server_archive(self, project_data: Dict[str, Any]) -> bool:
        """存储到服务器归档"""
        try:
            # 这里应该调用归档存储API
            print(f"模拟存储到服务器归档: {project_data.get('id')}")
            return True
        except Exception as e:
            print(f"服务器归档存储失败: {e}")
            return False
    
    async def _retrieve_from_local_cache(self, project_id: str) -> Optional[Dict[str, Any]]:
        """从本地缓存检索"""
        try:
            cache_file = self.local_cache_dir / f"{project_id}.json"
            if cache_file.exists():
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            print(f"本地缓存检索失败: {e}")
            return None
    
    async def _retrieve_from_local_md(self, project_id: str) -> Optional[Dict[str, Any]]:
        """从本地MD文档检索"""
        try:
            # 这里应该解析MD文档
            # 暂时返回None
            return None
        except Exception as e:
            print(f"本地MD检索失败: {e}")
            return None
    
    async def _retrieve_from_server_vector(self, project_id: str) -> Optional[Dict[str, Any]]:
        """从服务器向量库检索"""
        try:
            # 这里应该调用服务器向量库API
            return None
        except Exception as e:
            print(f"服务器向量库检索失败: {e}")
            return None
    
    async def _retrieve_from_server_db(self, project_id: str) -> Optional[Dict[str, Any]]:
        """从服务器数据库检索"""
        try:
            # 这里应该调用服务器数据库API
            return None
        except Exception as e:
            print(f"服务器数据库检索失败: {e}")
            return None
    
    async def _retrieve_from_server_archive(self, project_id: str) -> Optional[Dict[str, Any]]:
        """从服务器归档检索"""
        try:
            # 这里应该调用服务器归档API
            return None
        except Exception as e:
            print(f"服务器归档检索失败: {e}")
            return None
    
    def _get_access_statistics(self, project_id: str) -> Dict[str, Any]:
        """获取访问统计"""
        # 这里应该从访问日志中获取统计数据
        # 暂时返回模拟数据
        return {
            "access_count_30d": 25,
            "access_count_7d": 8,
            "last_access_time": datetime.now().timestamp()
        }
    
    async def _log_sync_operation(self, project_id: str, temperature: DataTemperature, 
                                success_count: int, total_operations: int):
        """记录同步操作日志"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "project_id": project_id,
                "temperature": temperature.value,
                "success_count": success_count,
                "total_operations": total_operations,
                "success_rate": success_count / total_operations if total_operations > 0 else 0
            }
            
            # 读取现有日志
            logs = []
            if self.sync_log_path.exists():
                with open(self.sync_log_path, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
            
            # 添加新日志
            logs.append(log_entry)
            
            # 保持最近1000条日志
            if len(logs) > 1000:
                logs = logs[-1000:]
            
            # 写入日志文件
            with open(self.sync_log_path, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            print(f"记录同步日志失败: {e}")
    
    async def _get_local_changes(self) -> List[Dict[str, Any]]:
        """获取本地变更"""
        # 实现本地变更检测逻辑
        return []
    
    async def _get_server_changes(self) -> List[Dict[str, Any]]:
        """获取服务器变更"""
        # 实现服务器变更检测逻辑
        return []
    
    async def _sync_local_to_server(self, change: Dict[str, Any]) -> bool:
        """同步本地变更到服务器"""
        return True
    
    async def _sync_server_to_local(self, change: Dict[str, Any]) -> bool:
        """同步服务器变更到本地"""
        return True
    
    async def _detect_conflicts(self) -> List[Dict[str, Any]]:
        """检测冲突"""
        return []
    
    async def _resolve_conflict(self, conflict: Dict[str, Any]) -> bool:
        """解决冲突"""
        return True
    
    async def _log_sync_stats(self, stats: Dict[str, Any]):
        """记录同步统计"""
        pass
    
    async def _get_all_projects(self) -> List[Dict[str, Any]]:
        """获取所有项目"""
        return []
    
    async def _should_promote_to_hot(self, project: Dict[str, Any]) -> bool:
        """是否应该提升为热数据"""
        return False
    
    async def _should_demote_to_cold(self, project: Dict[str, Any]) -> bool:
        """是否应该降级为冷数据"""
        return False
    
    async def _should_archive(self, project: Dict[str, Any]) -> bool:
        """是否应该归档"""
        return False
    
    async def _promote_to_hot_storage(self, project: Dict[str, Any]):
        """提升为热存储"""
        pass
    
    async def _demote_to_cold_storage(self, project: Dict[str, Any]):
        """降级为冷存储"""
        pass
    
    async def _archive_project(self, project: Dict[str, Any]):
        """归档项目"""
        pass
    
    async def _consider_local_promotion(self, data: Dict[str, Any]):
        """考虑是否提升到本地存储"""
        pass


# 全局混合存储架构实例
hybrid_storage = HybridStorageArchitecture()


async def main():
    """测试函数"""
    print("混合存储架构测试")
    
    # 测试项目数据
    test_project = {
        "id": "test_hybrid_001",
        "name": "混合存储测试项目",
        "payload": {
            "data": {
                "id": "root",
                "label": "测试项目",
                "children": []
            }
        },
        "createdAt": datetime.now().timestamp() * 1000,
        "updatedAt": datetime.now().timestamp() * 1000
    }
    
    # 测试存储
    print("测试存储...")
    success = await hybrid_storage.store_project_data(test_project)
    print(f"存储结果: {success}")
    
    # 测试检索
    print("测试检索...")
    retrieved_data = await hybrid_storage.retrieve_project_data("test_hybrid_001")
    print(f"检索结果: {retrieved_data is not None}")
    
    # 测试同步
    print("测试同步...")
    sync_result = await hybrid_storage.sync_with_server()
    print(f"同步结果: {sync_result}")


if __name__ == "__main__":
    asyncio.run(main())

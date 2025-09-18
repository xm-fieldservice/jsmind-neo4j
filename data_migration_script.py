"""
数据迁移脚本
从外部文件迁移到AutoGen统一MD存储系统
"""
import asyncio
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
import shutil

# 添加.env支持
from dotenv import load_dotenv
load_dotenv()

from autogen_memory_manager import memory_manager
from autogen_config import MIGRATION_CONFIG, DATA_DIR


class DataMigrationScript:
    """数据迁移脚本类"""
    
    def __init__(self):
        self.backup_dir = MIGRATION_CONFIG["backup_dir"]
        self.batch_size = MIGRATION_CONFIG["batch_size"]
        self.validate_migration = MIGRATION_CONFIG["validate_migration"]
        
        # 确保备份目录存在
        self.backup_dir.mkdir(exist_ok=True)
    
    def find_external_data_files(self) -> List[Path]:
        """查找外部数据文件"""
        data_files = []
        
        # 查找JSON备份文件
        json_files = list(Path(".").glob("**/*.json"))
        for json_file in json_files:
            if "mindmap" in json_file.name.lower() or "backup" in json_file.name.lower():
                data_files.append(json_file)
        
        # 查找docs目录中的备份文件
        docs_dir = Path("docs")
        if docs_dir.exists():
            docs_json_files = list(docs_dir.glob("*.json"))
            data_files.extend(docs_json_files)
        
        return data_files
    
    def backup_original_files(self, files: List[Path]):
        """备份原始文件"""
        if not MIGRATION_CONFIG["backup_original"]:
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_subdir = self.backup_dir / f"migration_backup_{timestamp}"
        backup_subdir.mkdir(exist_ok=True)
        
        for file_path in files:
            if file_path.exists():
                backup_path = backup_subdir / file_path.name
                shutil.copy2(file_path, backup_path)
                print(f"备份文件: {file_path} -> {backup_path}")
    
    def parse_external_data(self, file_path: Path) -> List[Dict[str, Any]]:
        """解析外部数据文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 处理不同的数据格式
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # 如果是单个项目数据
                if "id" in data and "label" in data:
                    return [self.convert_mindmap_to_project(data)]
                # 如果是项目列表格式
                elif "projects" in data:
                    return data["projects"]
                else:
                    return [data]
            else:
                print(f"未知数据格式: {file_path}")
                return []
                
        except Exception as e:
            print(f"解析文件失败 {file_path}: {e}")
            return []
    
    def convert_mindmap_to_project(self, mindmap_data: Dict[str, Any]) -> Dict[str, Any]:
        """将脑图数据转换为项目格式"""
        return {
            "id": mindmap_data.get("id", f"migrated_{datetime.now().timestamp()}"),
            "name": mindmap_data.get("label", "迁移项目"),
            "payload": {
                "meta": {"name": mindmap_data.get("label", "迁移项目")},
                "format": "node_tree",
                "data": mindmap_data
            },
            "createdAt": datetime.now().timestamp() * 1000,
            "updatedAt": datetime.now().timestamp() * 1000,
            "content_hash": "",
            "is_fav": False,
            "tags": ["迁移数据"]
        }
    
    async def migrate_batch(self, projects: List[Dict[str, Any]]) -> Tuple[int, int]:
        """批量迁移项目"""
        success_count = 0
        failed_count = 0
        
        for project in projects:
            try:
                success = await memory_manager.store_mindmap_tree(project)
                if success:
                    success_count += 1
                    print(f"✓ 迁移成功: {project.get('name', 'Unknown')}")
                else:
                    failed_count += 1
                    print(f"✗ 迁移失败: {project.get('name', 'Unknown')}")
            except Exception as e:
                failed_count += 1
                print(f"✗ 迁移异常: {project.get('name', 'Unknown')} - {e}")
        
        return success_count, failed_count
    
    async def run_migration(self) -> Dict[str, Any]:
        """执行完整迁移流程"""
        print("开始数据迁移...")
        
        # 1. 查找外部数据文件
        data_files = self.find_external_data_files()
        print(f"找到 {len(data_files)} 个数据文件")
        
        if not data_files:
            print("未找到需要迁移的数据文件")
            return {"status": "no_data", "files": 0, "projects": 0}
        
        # 2. 备份原始文件
        self.backup_original_files(data_files)
        
        # 3. 解析和转换数据
        all_projects = []
        for file_path in data_files:
            print(f"处理文件: {file_path}")
            projects = self.parse_external_data(file_path)
            all_projects.extend(projects)
        
        print(f"总共解析出 {len(all_projects)} 个项目")
        
        # 4. 批量迁移
        total_success = 0
        total_failed = 0
        
        for i in range(0, len(all_projects), self.batch_size):
            batch = all_projects[i:i + self.batch_size]
            print(f"迁移批次 {i//self.batch_size + 1}: {len(batch)} 个项目")
            
            success, failed = await self.migrate_batch(batch)
            total_success += success
            total_failed += failed
        
        # 5. 验证迁移结果
        if self.validate_migration:
            stats = memory_manager.get_storage_stats()
            print("迁移后存储统计:", json.dumps(stats, indent=2, ensure_ascii=False))
        
        result = {
            "status": "completed",
            "files_processed": len(data_files),
            "total_projects": len(all_projects),
            "successful_migrations": total_success,
            "failed_migrations": total_failed,
            "success_rate": total_success / len(all_projects) if all_projects else 0
        }
        
        print("\n迁移完成!")
        print(f"处理文件: {result['files_processed']}")
        print(f"总项目数: {result['total_projects']}")
        print(f"成功迁移: {result['successful_migrations']}")
        print(f"失败数量: {result['failed_migrations']}")
        print(f"成功率: {result['success_rate']:.2%}")
        
        return result


async def main():
    """主函数"""
    print("AutoGen统一MD存储系统 - 数据迁移脚本")
    print("=" * 50)
    
    # 检查环境
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("AZURE_OPENAI_API_KEY"):
        print("警告: 未设置API密钥，某些功能可能无法使用")
        print("请设置 OPENAI_API_KEY 或 AZURE_OPENAI_API_KEY 环境变量")
    
    # 执行迁移
    migration_script = DataMigrationScript()
    result = await migration_script.run_migration()
    
    # 输出最终结果
    if result["status"] == "completed":
        if result["success_rate"] >= 0.9:
            print("\n🎉 迁移成功完成!")
        elif result["success_rate"] >= 0.7:
            print("\n⚠️ 迁移基本完成，但有部分失败")
        else:
            print("\n❌ 迁移存在较多问题，请检查日志")
    else:
        print(f"\n迁移状态: {result['status']}")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复数据覆盖问题的脚本
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

def backup_current_data():
    """备份当前数据"""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    backup_dir = project_root / "backup"
    backup_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 备份注册表
    registry_file = data_dir / "mindmap_registry.json"
    if registry_file.exists():
        backup_file = backup_dir / f"mindmap_registry_before_fix_{timestamp}.json"
        shutil.copy2(registry_file, backup_file)
        print(f"✅ 已备份注册表到: {backup_file}")
    
    return timestamp

def fix_data_corruption():
    """修复数据覆盖问题"""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    
    # 1. 备份当前数据
    timestamp = backup_current_data()
    
    # 2. 读取当前注册表
    registry_file = data_dir / "mindmap_registry.json"
    with open(registry_file, 'r', encoding='utf-8') as f:
        registry = json.load(f)
    
    print(f"当前注册表中有 {len(registry['projects'])} 个项目")
    
    # 3. 读取备份数据（2025-09-20的备份）
    backup_file = data_dir / "all_mindmaps_2025-09-20.json"
    with open(backup_file, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    print(f"备份文件中有 {len(backup_data['mindmaps'])} 个脑图")
    
    # 4. 找到需要修复的项目
    target_project_id = "root-1758256084936-b8"  # 被覆盖的项目ID
    
    # 从备份中找到原始的"脑图优化"数据
    original_mindmap = None
    for mindmap in backup_data['mindmaps']:
        if mindmap['id'] == target_project_id:
            original_mindmap = mindmap
            break
    
    if not original_mindmap:
        print(f"❌ 在备份中未找到项目 {target_project_id}")
        return False
    
    print(f"✅ 在备份中找到原始数据: {original_mindmap['name']}")
    
    # 5. 修复注册表中的项目数据
    fixed = False
    for project in registry['projects']:
        if project['project_id'] == target_project_id:
            # 恢复正确的项目名称和数据
            project['name'] = original_mindmap['name']  # "脑图优化"
            project['payload'] = original_mindmap['data']
            project['last_modified'] = datetime.now().isoformat() + 'Z'
            
            # 确保payload中的data.id与project_id一致
            if 'data' in project['payload'] and 'data' in project['payload']:
                project['payload']['data']['id'] = target_project_id
                project['payload']['data']['label'] = original_mindmap['name']
            
            print(f"✅ 已修复项目: {project['name']} (ID: {project['project_id']})")
            fixed = True
            break
    
    if not fixed:
        print(f"❌ 在注册表中未找到项目 {target_project_id}")
        return False
    
    # 6. 保存修复后的注册表
    with open(registry_file, 'w', encoding='utf-8') as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已保存修复后的注册表")
    
    # 7. 验证修复结果
    print("\n📋 修复后的项目列表:")
    for project in registry['projects']:
        if "笔记页面" in project['name'] or "脑图优化" in project['name']:
            print(f"  - {project['name']} (ID: {project['project_id']})")
            if 'payload' in project and 'data' in project['payload']:
                data_id = project['payload']['data'].get('id', 'unknown')
                data_label = project['payload']['data'].get('label', 'unknown')
                print(f"    数据ID: {data_id}, 数据标签: {data_label}")
    
    return True

if __name__ == "__main__":
    print("🔧 开始修复数据覆盖问题...")
    
    if fix_data_corruption():
        print("\n🎉 数据修复完成！")
        print("请刷新浏览器页面查看修复结果。")
    else:
        print("\n❌ 数据修复失败！")

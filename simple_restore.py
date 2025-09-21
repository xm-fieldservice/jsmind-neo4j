#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最简单的节点恢复方案
直接读取registry数据，构建完整脑图，写入all_mindmaps.json
"""

import json
from pathlib import Path

def main():
    print("🔧 最简单的节点恢复方案")
    print("=" * 50)
    
    root_dir = Path(__file__).parent
    registry_file = root_dir / 'data' / 'mindmap_registry.json'
    all_mindmaps_file = root_dir / 'data' / 'all_mindmaps.json'
    
    # 1. 读取registry数据
    with open(registry_file, 'r', encoding='utf-8') as f:
        registry_data = json.load(f)
    
    # 2. 读取all_mindmaps数据
    with open(all_mindmaps_file, 'r', encoding='utf-8') as f:
        all_mindmaps_data = json.load(f)
    
    # 3. 找到今天创建的节点
    today_nodes = []
    target_date = "2025-09-20"
    
    def find_today_nodes(node):
        if isinstance(node, dict):
            content = node.get('content', '')
            if f"创建: {target_date}" in content:
                today_nodes.append({
                    'id': node.get('id'),
                    'topic': node.get('topic', node.get('label', 'Unknown')),
                    'content': content,
                    'expanded': True,
                    'background-color': '#f5f5f5',
                    'foreground-color': '#333',
                    'data': {'content': content}
                })
            
            if 'children' in node:
                for child in node['children']:
                    find_today_nodes(child)
    
    # 搜索registry中的项目
    for project in registry_data.get('projects', []):
        if 'payload' in project and 'data' in project['payload']:
            find_today_nodes(project['payload']['data'])
    
    print(f"📊 找到今天创建的节点: {len(today_nodes)} 个")
    
    # 4. 找到目标脑图 (root-1758256084936-b8)
    target_id = "root-1758256084936-b8"
    target_mindmap = None
    
    for mindmap in all_mindmaps_data.get('mindmaps', []):
        if mindmap.get('id') == target_id:
            target_mindmap = mindmap
            break
    
    if not target_mindmap:
        print(f"❌ 找不到目标脑图: {target_id}")
        return
    
    print(f"✅ 找到目标脑图: {target_mindmap.get('name', 'Unknown')}")
    
    # 5. 检查现有节点，避免重复
    existing_children = target_mindmap.get('data', {}).get('data', {}).get('children', [])
    existing_ids = {child.get('id') for child in existing_children}
    
    new_nodes = [node for node in today_nodes if node['id'] not in existing_ids]
    
    print(f"📋 需要添加的新节点: {len(new_nodes)} 个")
    print(f"⚠️ 已存在的节点: {len(today_nodes) - len(new_nodes)} 个")
    
    if not new_nodes:
        print("✅ 所有节点都已存在")
        return
    
    # 6. 添加新节点
    if 'data' not in target_mindmap:
        target_mindmap['data'] = {}
    if 'data' not in target_mindmap['data']:
        target_mindmap['data']['data'] = {}
    if 'children' not in target_mindmap['data']['data']:
        target_mindmap['data']['data']['children'] = []
    
    target_mindmap['data']['data']['children'].extend(new_nodes)
    
    # 7. 保存文件
    with open(all_mindmaps_file, 'w', encoding='utf-8') as f:
        json.dump(all_mindmaps_data, f, ensure_ascii=False, indent=2)
    
    print("✅ 数据已保存到 all_mindmaps.json")
    
    # 8. 显示添加的节点
    print("\n📋 已添加的节点:")
    for i, node in enumerate(new_nodes, 1):
        print(f"{i:2d}. {node['topic']} ({node['id']})")
    
    print(f"\n🎯 现在请刷新浏览器页面 (F5) 来查看恢复的节点")

if __name__ == '__main__':
    main()

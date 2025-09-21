#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查节点恢复情况
"""

import json
from pathlib import Path

def main():
    print("🔍 检查节点恢复情况")
    print("=" * 50)
    
    root_dir = Path(__file__).parent
    all_mindmaps_file = root_dir / 'data' / 'all_mindmaps.json'
    
    # 读取数据
    with open(all_mindmaps_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 找到目标脑图
    target_id = "root-1758256084936-b8"
    target_mindmap = None
    
    for mindmap in data.get('mindmaps', []):
        if mindmap.get('id') == target_id:
            target_mindmap = mindmap
            break
    
    if not target_mindmap:
        print(f"❌ 找不到目标脑图: {target_id}")
        return
    
    # 分析节点
    children = target_mindmap.get('data', {}).get('data', {}).get('children', [])
    print(f"📊 总节点数: {len(children)}")
    
    # 统计今天创建的节点
    today_nodes = []
    other_nodes = []
    
    for child in children:
        content = child.get('content', '')
        topic = child.get('topic', 'Unknown')
        
        if "创建: 2025-09-20" in content:
            today_nodes.append({
                'topic': topic,
                'id': child.get('id'),
                'content': content[:100] + '...' if len(content) > 100 else content
            })
        else:
            other_nodes.append({
                'topic': topic,
                'id': child.get('id')
            })
    
    print(f"✅ 今天创建的节点: {len(today_nodes)}")
    print(f"📋 其他节点: {len(other_nodes)}")
    
    if today_nodes:
        print("\n🎯 今天创建的节点列表:")
        for i, node in enumerate(today_nodes, 1):
            print(f"{i:2d}. {node['topic']} ({node['id']})")
    
    if other_nodes:
        print("\n📝 其他节点:")
        for i, node in enumerate(other_nodes, 1):
            print(f"{i:2d}. {node['topic']} ({node['id']})")
    
    # 检查数据结构
    print(f"\n🔧 数据结构检查:")
    print(f"脑图名称: {target_mindmap.get('name', 'Unknown')}")
    print(f"脑图ID: {target_mindmap.get('id')}")
    print(f"根节点ID: {target_mindmap.get('data', {}).get('data', {}).get('id', 'Unknown')}")
    
    # 验证节点完整性
    invalid_nodes = []
    for child in children:
        if not child.get('id') or not child.get('topic'):
            invalid_nodes.append(child)
    
    if invalid_nodes:
        print(f"⚠️ 发现 {len(invalid_nodes)} 个无效节点")
    else:
        print("✅ 所有节点数据完整")

if __name__ == '__main__':
    main()

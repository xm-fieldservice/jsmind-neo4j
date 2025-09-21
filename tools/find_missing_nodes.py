#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
查找丢失节点的脚本
对比mindmap_registry.json和all_mindmaps.json，找出今天创建的丢失节点
"""

import json
import re
from pathlib import Path

def load_json_file(file_path):
    """加载JSON文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载文件失败 {file_path}: {e}")
        return None

def extract_all_node_ids(node, node_ids):
    """递归提取所有节点ID"""
    if isinstance(node, dict):
        if 'id' in node:
            node_ids.add(node['id'])
        if 'children' in node and isinstance(node['children'], list):
            for child in node['children']:
                extract_all_node_ids(child, node_ids)

def find_nodes_created_today(data, target_date="2025-09-20"):
    """找出今天创建的节点"""
    today_nodes = []
    
    def search_nodes(node):
        if isinstance(node, dict):
            # 检查content字段中的创建时间
            content = node.get('content', '')
            if f"创建: {target_date}" in content:
                today_nodes.append({
                    'id': node.get('id'),
                    'label': node.get('label', node.get('topic', 'Unknown')),
                    'content': content[:100] + "..." if len(content) > 100 else content
                })
            
            # 递归搜索子节点
            if 'children' in node and isinstance(node['children'], list):
                for child in node['children']:
                    search_nodes(child)
    
    # 搜索projects中的所有节点
    if 'projects' in data:
        for project in data['projects']:
            if 'payload' in project and 'data' in project['payload']:
                search_nodes(project['payload']['data'])
    elif 'mindmaps' in data:
        for mindmap in data['mindmaps']:
            if 'data' in mindmap and 'data' in mindmap['data']:
                search_nodes(mindmap['data']['data'])
    
    return today_nodes

def main():
    # 文件路径
    root_dir = Path(__file__).parent.parent
    registry_file = root_dir / 'data' / 'mindmap_registry.json'
    current_file = root_dir / 'data' / 'all_mindmaps.json'
    
    print("🔍 查找今天创建的丢失节点...")
    print("=" * 60)
    
    # 加载数据
    registry_data = load_json_file(registry_file)
    current_data = load_json_file(current_file)
    
    if not registry_data or not current_data:
        print("❌ 无法加载必要的数据文件")
        return
    
    # 找出今天创建的节点
    registry_today_nodes = find_nodes_created_today(registry_data)
    current_today_nodes = find_nodes_created_today(current_data)
    
    print(f"📊 Registry中今天创建的节点: {len(registry_today_nodes)} 个")
    print(f"📊 Current中今天创建的节点: {len(current_today_nodes)} 个")
    print()
    
    # 提取节点ID集合
    registry_ids = {node['id'] for node in registry_today_nodes if node['id']}
    current_ids = {node['id'] for node in current_today_nodes if node['id']}
    
    # 找出丢失的节点
    missing_ids = registry_ids - current_ids
    
    if missing_ids:
        print(f"🚨 发现 {len(missing_ids)} 个丢失的节点:")
        print("=" * 60)
        
        for node in registry_today_nodes:
            if node['id'] in missing_ids:
                print(f"❌ ID: {node['id']}")
                print(f"   标题: {node['label']}")
                print(f"   内容: {node['content']}")
                print("-" * 40)
    else:
        print("✅ 没有发现丢失的节点")
    
    # 显示详细对比
    print("\n📋 详细节点对比:")
    print("=" * 60)
    
    print("\n🔵 Registry中今天创建的节点:")
    for i, node in enumerate(registry_today_nodes, 1):
        status = "✅" if node['id'] in current_ids else "❌"
        print(f"{i:2d}. {status} {node['id']}: {node['label']}")
    
    print("\n🟢 Current中今天创建的节点:")
    for i, node in enumerate(current_today_nodes, 1):
        print(f"{i:2d}. ✅ {node['id']}: {node['label']}")

if __name__ == '__main__':
    main()

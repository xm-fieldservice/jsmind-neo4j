#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将丢失的节点添加到当前活跃脑图中
"""

import json
import requests
from pathlib import Path

def load_json_file(file_path):
    """加载JSON文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载文件失败 {file_path}: {e}")
        return None

def save_json_file(file_path, data):
    """保存JSON文件"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存文件失败 {file_path}: {e}")
        return False

def find_node_by_id(node, target_id):
    """递归查找指定ID的节点"""
    if isinstance(node, dict):
        if node.get('id') == target_id:
            return node
        if 'children' in node and isinstance(node['children'], list):
            for child in node['children']:
                result = find_node_by_id(child, target_id)
                if result:
                    return result
    return None

def add_node_to_parent(parent_node, new_node):
    """将新节点添加到父节点的children中"""
    if 'children' not in parent_node:
        parent_node['children'] = []
    
    # 检查节点是否已存在
    existing_ids = {child.get('id') for child in parent_node['children'] if child.get('id')}
    if new_node['id'] not in existing_ids:
        parent_node['children'].append(new_node)
        return True
    return False

def main():
    # 文件路径
    root_dir = Path(__file__).parent.parent
    current_file = root_dir / 'data' / 'all_mindmaps.json'
    
    print("🔧 将丢失节点添加到当前活跃脑图...")
    print("=" * 60)
    
    # 加载当前脑图数据
    current_data = load_json_file(current_file)
    if not current_data:
        print("❌ 无法加载当前脑图数据")
        return
    
    # 找到当前脑图
    current_mindmap = None
    if 'mindmaps' in current_data and current_data['mindmaps']:
        current_mindmap = current_data['mindmaps'][0]  # 假设第一个是当前脑图
    
    if not current_mindmap:
        print("❌ 找不到当前脑图")
        return
    
    mindmap_id = current_mindmap.get('id', 'unknown')
    print(f"📍 当前脑图ID: {mindmap_id}")
    
    # 要添加的丢失节点
    missing_node = {
        "id": "9666ee494a4942d2",
        "topic": "New Node",
        "expanded": True,
        "content": "创建: 2025-09-20 17:22:57\n\n",
        "data": {
            "content": "创建: 2025-09-20 17:22:57\n\n"
        },
        "background-color": "#f5f5f5",
        "foreground-color": "#333"
    }
    
    # 找到"丢失节点"作为父节点
    parent_id = "9665e179afe29e3b"  # "丢失节点"的ID
    mindmap_root = current_mindmap.get('data', {}).get('data', {})
    
    parent_node = find_node_by_id(mindmap_root, parent_id)
    
    if parent_node:
        print(f"✅ 找到父节点: {parent_node.get('topic', 'Unknown')}")
        
        # 添加节点
        if add_node_to_parent(parent_node, missing_node):
            print(f"✅ 成功添加节点: {missing_node['topic']}")
            
            # 保存文件
            if save_json_file(current_file, current_data):
                print("✅ 文件保存成功")
                
                # 尝试通过API通知前端更新
                try:
                    # 假设有一个本地API端点来刷新脑图
                    api_url = "http://localhost:8081/api/refresh_mindmap"
                    response = requests.post(api_url, json={"mindmap_id": mindmap_id}, timeout=5)
                    if response.status_code == 200:
                        print("✅ 已通知前端刷新脑图")
                    else:
                        print("⚠️ 前端刷新通知失败，请手动刷新浏览器")
                except:
                    print("⚠️ 无法连接到API，请手动刷新浏览器")
                    
            else:
                print("❌ 文件保存失败")
        else:
            print("⚠️ 节点可能已存在")
    else:
        print(f"❌ 找不到父节点 (ID: {parent_id})")
        print("尝试将节点添加到根节点...")
        
        # 如果找不到父节点，添加到根节点
        if add_node_to_parent(mindmap_root, missing_node):
            print(f"✅ 成功添加节点到根节点: {missing_node['topic']}")
            if save_json_file(current_file, current_data):
                print("✅ 文件保存成功")
            else:
                print("❌ 文件保存失败")
        else:
            print("❌ 添加节点失败")
    
    print("\n🎯 操作完成！")
    print("请刷新浏览器页面查看新添加的节点")

if __name__ == '__main__':
    main()

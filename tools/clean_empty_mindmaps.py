#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理空的项目脑图数据
删除只有基础三个节点（需求、设计、开发）且无实际内容的重复脑图
"""
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

def main():
    """清理空的项目脑图"""
    try:
        # 获取项目根目录
        project_root = Path(__file__).parent.parent
        all_mindmaps_file = project_root / 'data' / 'all_mindmaps.json'
        
        if not all_mindmaps_file.exists():
            print(f"❌ 文件不存在: {all_mindmaps_file}")
            return False
        
        # 创建备份
        backup_file = project_root / 'data' / f'all_mindmaps_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        shutil.copy2(all_mindmaps_file, backup_file)
        print(f"✅ 已创建备份: {backup_file}")
        
        # 读取数据
        with open(all_mindmaps_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        original_count = len(data.get('mindmaps', []))
        print(f"📊 原始脑图数量: {original_count}")
        
        # 清理逻辑
        cleaned_mindmaps = []
        removed_count = 0
        
        for mindmap in data.get('mindmaps', []):
            if should_keep_mindmap(mindmap):
                cleaned_mindmaps.append(mindmap)
            else:
                removed_count += 1
                print(f"🗑️  删除空脑图: {mindmap.get('id', 'unknown')} - {mindmap.get('name', 'unnamed')}")
        
        # 更新数据
        data['mindmaps'] = cleaned_mindmaps
        data['total_count'] = len(cleaned_mindmaps)
        data['export_time'] = datetime.now().isoformat()
        
        # 保存清理后的数据
        with open(all_mindmaps_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 清理完成!")
        print(f"📊 删除数量: {removed_count}")
        print(f"📊 保留数量: {len(cleaned_mindmaps)}")
        print(f"💾 已保存到: {all_mindmaps_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ 清理失败: {e}")
        return False

def should_keep_mindmap(mindmap):
    """判断是否应该保留这个脑图"""
    try:
        # 获取基本信息
        mindmap_id = mindmap.get('id', '')
        name = mindmap.get('name', '')
        data = mindmap.get('data', {})
        
        # 保留非"项目脑图"的所有内容
        if name != '项目脑图':
            return True
        
        # 保留测试数据（可能有用）
        if 'test' not in mindmap_id.lower():
            # 对于非测试的"项目脑图"，检查是否有实际内容
            return has_meaningful_content(data)
        
        # 删除测试数据
        return False
        
    except Exception as e:
        print(f"⚠️  判断脑图时出错: {e}")
        return True  # 出错时保守保留

def has_meaningful_content(data):
    """检查脑图是否有有意义的内容"""
    try:
        node_data = data.get('data', {})
        if not isinstance(node_data, dict):
            return False
        
        # 检查根节点内容
        root_content = node_data.get('content', '')
        if root_content and root_content.strip() != '# 根节点\n\n在此编写内容...':
            return True
        
        # 检查子节点
        children = node_data.get('children', [])
        if not isinstance(children, list):
            return False
        
        # 如果只有基础的三个节点且内容都是默认内容，则认为是空脑图
        if len(children) == 3:
            expected_topics = {'需求', '设计', '开发'}
            actual_topics = {child.get('topic', '') for child in children}
            
            if actual_topics == expected_topics:
                # 检查这三个节点是否都是默认内容
                for child in children:
                    content = child.get('content', '')
                    if content and not is_default_content(content, child.get('topic', '')):
                        return True  # 有非默认内容，保留
                
                # 所有节点都是默认内容，删除
                return False
        
        # 检查是否有更多实际内容
        return has_deep_content(children)
        
    except Exception as e:
        print(f"⚠️  检查内容时出错: {e}")
        return True  # 出错时保守保留

def is_default_content(content, topic):
    """检查是否是默认内容"""
    if not content:
        return True
    
    content = content.strip()
    
    # 常见的默认内容模式
    default_patterns = [
        '需求说明...',
        '设计说明...',
        '开发计划...',
        '在此编写内容...',
        f'{topic}说明...',
        f'{topic}计划...'
    ]
    
    return content in default_patterns

def has_deep_content(children):
    """递归检查子节点是否有实际内容"""
    try:
        for child in children:
            if not isinstance(child, dict):
                continue
            
            # 检查节点内容
            content = child.get('content', '')
            topic = child.get('topic', '')
            
            if content and not is_default_content(content, topic):
                return True
            
            # 递归检查子节点
            grandchildren = child.get('children', [])
            if isinstance(grandchildren, list) and len(grandchildren) > 0:
                if has_deep_content(grandchildren):
                    return True
        
        return False
        
    except Exception as e:
        print(f"⚠️  检查深度内容时出错: {e}")
        return True  # 出错时保守保留

if __name__ == '__main__':
    success = main()
    if success:
        print("🎉 清理完成!")
    else:
        print("💥 清理失败!")

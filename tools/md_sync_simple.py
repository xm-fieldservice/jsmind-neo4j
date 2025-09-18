#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版MD底座同步器 - Windows兼容
"""
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

def main():
    """简化的MD同步主函数"""
    try:
        # 获取项目根目录
        if len(sys.argv) > 1:
            project_root = Path(sys.argv[1])
        else:
            project_root = Path(__file__).parent.parent
        
        print("[MD同步] 开始初始化...")
        
        # 检查必要文件
        data_dir = project_root / 'data'
        md_file = data_dir / 'unified_mindmap_storage.md'
        registry_file = data_dir / 'mindmap_registry.json'
        
        # 确保data目录存在
        data_dir.mkdir(exist_ok=True)
        
        # 检查MD文件是否已有实际项目数据（不是格式说明）
        if md_file.exists():
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            # 检查是否有实际的项目数据（不仅仅是格式说明）
            lines = content.split('\n')
            has_real_project = False
            for line in lines:
                if line.startswith('## 项目:') and 'ID:' in line and '[项目名称]' not in line:
                    has_real_project = True
                    break
            if has_real_project:
                print("[MD同步] MD底座已有实际项目数据，跳过同步")
                return True
        
        # 检查注册表文件
        if not registry_file.exists():
            print("[MD同步] 未发现注册表文件，跳过同步")
            return True
        
        # 读取注册表
        with open(registry_file, 'r', encoding='utf-8') as f:
            registry = json.load(f)
        
        projects = registry.get('projects', [])
        if not projects:
            print("[MD同步] 注册表中无项目数据，跳过同步")
            return True
        
        print(f"[MD同步] 发现 {len(projects)} 个项目，开始同步...")
        
        # 确保MD文件存在
        if not md_file.exists():
            create_default_md_file(md_file)
        
        # 读取现有MD内容
        with open(md_file, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # 为每个项目生成MD段落
        synced_count = 0
        for project in projects:
            try:
                project_md = generate_project_md(project)
                if project_md:
                    md_content += project_md
                    synced_count += 1
                    project_id = project.get('project_id', 'unknown')
                    print(f"[MD同步] 已同步: {project_id}")
            except Exception as e:
                print(f"[MD同步] 同步项目失败: {e}")
        
        # 写回MD文件
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        print(f"[MD同步] 完成，已同步 {synced_count} 个项目")
        return True
        
    except Exception as e:
        print(f"[MD同步] 失败: {e}")
        return False

def create_default_md_file(md_file):
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

"""
    
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(default_content)

def generate_project_md(project):
    """为项目生成MD格式"""
    try:
        # 提取项目信息
        project_id = project.get('project_id') or 'unknown'
        project_name = extract_project_name(project)
        
        # 生成时间戳
        now = datetime.now().isoformat() + 'Z'
        created_at = now
        updated_at = now
        
        # 评估数据温度
        access_count = project.get('accessCount', 0)
        if access_count >= 50:
            temperature = 'hot'
        elif access_count >= 10:
            temperature = 'warm'
        else:
            temperature = 'warm'
        
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
{generate_node_content(project)}

---

"""
        return md_content
        
    except Exception as e:
        print(f"[MD同步] 生成项目MD失败: {e}")
        return None

def extract_project_name(project):
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

def generate_node_content(project):
    """生成节点内容详情"""
    try:
        payload = project.get('payload', {})
        if not isinstance(payload, dict):
            return "*无节点内容*"
        
        data = payload.get('data', {})
        if not isinstance(data, dict):
            return "*无节点内容*"
        
        return convert_node_to_md(data, 0)
        
    except Exception:
        return "*节点内容解析失败*"

def convert_node_to_md(node, level):
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
            md_content += convert_node_to_md(child, level + 1)
    
    return md_content

if __name__ == '__main__':
    success = main()
    if success:
        print("[MD同步] 初始化成功")
        sys.exit(0)
    else:
        print("[MD同步] 初始化失败")
        sys.exit(1)

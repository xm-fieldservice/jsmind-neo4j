#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""提取文档中有关数据底座的所有语义主题"""

from pathlib import Path
import re

# 读取文档
doc_path = Path(__file__).parent.parent / "docs" / "工作记录：工作栏-货架生态闭环管理方案.md"
content = doc_path.read_text(encoding='utf-8')

# 按"# 程序员"分段
sections = re.split(r'^# 程序员\s*$', content, flags=re.MULTILINE)

print("=" * 80)
print("📦 数据底座相关语义主题清单")
print("=" * 80)

# 定义数据底座相关的语义主题
topics = {
    "1. 数据底座架构设计": {
        "keywords": ["AutogenUnifiedStorage", "三层存储", "存储架构", "数据底座架构"],
        "description": "整体架构设计，包括存储层次、缓存机制等"
    },
    "2. JSON数据底座设计": {
        "keywords": ["JSON底座", "JSON数据底座", "JSON格式", "data.mindmap.json"],
        "description": "JSON格式的数据底座结构和字段定义"
    },
    "3. 数据底座与工作栏集成": {
        "keywords": ["数据底座.*集成", "工作栏.*数据底座", "共享.*数据底座"],
        "description": "工作栏如何访问和使用数据底座"
    },
    "4. 数据加载机制": {
        "keywords": ["数据加载", "retrieve", "load.*数据", "获取数据"],
        "description": "从数据底座读取数据的方法和流程"
    },
    "5. 数据保存机制": {
        "keywords": ["数据保存", "store", "save.*数据", "更新存储"],
        "description": "向数据底座写入数据的方法和流程"
    },
    "6. 数据同步机制": {
        "keywords": ["数据同步", "实时同步", "热重载", "自动同步"],
        "description": "数据变更后的实时同步和广播机制"
    },
    "7. Metadata元数据设计": {
        "keywords": ["metadata", "元数据", "tags", "标签"],
        "description": "数据项的元数据结构和扩展字段"
    },
    "8. 数据类型定义": {
        "keywords": ["数据类型", "task", "mindmap", "note", "万物皆任务"],
        "description": "数据底座支持的数据类型和分类"
    },
    "9. 数据查询接口": {
        "keywords": ["query接口", "查询", "filter", "搜索"],
        "description": "数据查询、过滤和搜索功能"
    },
    "10. 测试数据设计": {
        "keywords": ["测试数据", "demo数据", "示例数据", "完整的一组数据"],
        "description": "用于测试的数据集合和结构"
    },
    "11. 数据持久化": {
        "keywords": ["持久化", "localStorage", "保存到本地", "自动保存"],
        "description": "数据的持久化存储机制"
    },
    "12. 数据迁移方案": {
        "keywords": ["数据迁移", "旧数据", "数据转换", "兼容性"],
        "description": "旧数据到新数据底座的迁移方案"
    },
    "13. 数据传导机制": {
        "keywords": ["数据传导", "参数传递", "id传导", "节点传递"],
        "description": "工作栏之间的数据传递和参数格式"
    },
    "14. 配置数据vs业务数据": {
        "keywords": ["配置数据", "业务数据", "3种数据类型", "数据分类"],
        "description": "不同类型数据的存储策略和区分"
    },
    "15. 数据底座性能优化": {
        "keywords": ["性能优化", "缓存", "内存", "批量操作"],
        "description": "数据底座的性能优化策略"
    }
}

# 统计每个主题
for topic_name, info in topics.items():
    keywords = info["keywords"]
    description = info["description"]
    
    matched_count = 0
    total_chars = 0
    examples = []
    
    for section in sections:
        # 使用正则匹配关键词
        for keyword in keywords:
            if re.search(keyword, section, re.IGNORECASE):
                matched_count += 1
                total_chars += len(section)
                
                # 提取示例片段（关键词前后50字符）
                matches = re.finditer(keyword, section, re.IGNORECASE)
                for match in matches:
                    start = max(0, match.start() - 50)
                    end = min(len(section), match.end() + 50)
                    snippet = section[start:end].replace('\n', ' ').strip()
                    if snippet and len(examples) < 2:
                        examples.append(snippet)
                break
    
    # 输出结果
    print(f"\n{topic_name}")
    print(f"  📝 {description}")
    print(f"  📊 字符数: {total_chars:,}")
    print(f"  🔍 出现次数: {matched_count}")
    
    if examples:
        print(f"  📄 示例片段:")
        for i, ex in enumerate(examples[:2], 1):
            # 截断过长的示例
            if len(ex) > 100:
                ex = ex[:97] + "..."
            print(f"     {i}. {ex}")

print("\n" + "=" * 80)
print("✅ 数据底座主题分析完成！")
print("=" * 80)

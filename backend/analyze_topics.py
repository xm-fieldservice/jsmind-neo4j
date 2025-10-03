#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""分析工作记录文档，统计每个议题的字符数"""

from pathlib import Path
import re

# 读取文档
doc_path = Path(__file__).parent.parent / "docs" / "工作记录：工作栏-货架生态闭环管理方案.md"
content = doc_path.read_text(encoding='utf-8')

# 按"# 程序员"分段
sections = re.split(r'^# 程序员\s*$', content, flags=re.MULTILINE)

print(f"📄 文档总字符数: {len(content):,}")
print(f"📋 共分为 {len(sections)} 个部分\n")

# 定义议题关键词映射
topics = {
    "工作栏库房生态系统设计": ["工作栏库房", "ColumnWarehouse", "UI设计方案", "库房列表"],
    "工作栏接口标准化": ["UniversalColumnInterface", "接口定义", "强制验证"],
    "数据底座架构设计": ["数据底座", "AutogenUnifiedStorage", "JSON底座", "双层存储"],
    "新工作栏方案对比": ["新方案 vs", "原v2方案", "对比评估"],
    "现有栏位改造评估": ["评估报告", "列表栏", "脑图栏", "关系栏", "详情栏", "工作区栏", "改造"],
    "实时数据同步评估": ["实时数据同步", "热重载", "底层架构评估"],
    "配置管理风险评估": ["配置管理", "风险评估", "第一阶段"],
    "纯脑图工作栏开发": ["纯脑图", "极简版", "jsMind", "200行"],
    "图片附件归一化": ["图片", "附件", "归一化", "合并显示"],
    "自动持久化挂接": ["自动持久化", "挂接", "外部标准脚本"],
    "测试数据底座设计": ["测试数据底座", "完整的一组数据"],
    "标签系统数据结构": ["标签系统", "详情栏", "标签面板"],
    "CSS优先级问题": ["CSS", "inline style", "display: none", "优先级"],
    "全屏切换状态混乱": ["全屏切换", "状态混乱"],
    "事件重复绑定": ["事件重复绑定", "重复注册"],
    "目录结构重组": ["目录结构", "重组", "src/"],
    "存储系统统一规划": ["存储系统", "统一规划", "3种数据类型"],
    "JSON底座结构考察": ["JSON数据底座", "结构考察", "重新设计"]
}

# 统计每个议题
topic_stats = {}

for topic_name, keywords in topics.items():
    total_chars = 0
    matched_sections = []
    
    for i, section in enumerate(sections):
        # 检查是否包含关键词
        if any(keyword in section for keyword in keywords):
            total_chars += len(section)
            matched_sections.append(i)
    
    topic_stats[topic_name] = {
        'chars': total_chars,
        'sections': matched_sections
    }

# 按类别输出
categories = {
    "架构设计类": ["工作栏库房生态系统设计", "工作栏接口标准化", "数据底座架构设计"],
    "方案评估类": ["新工作栏方案对比", "现有栏位改造评估", "实时数据同步评估", "配置管理风险评估"],
    "具体实现类": ["纯脑图工作栏开发", "图片附件归一化", "自动持久化挂接", "测试数据底座设计", "标签系统数据结构"],
    "问题修复类": ["CSS优先级问题", "全屏切换状态混乱", "事件重复绑定"],
    "架构优化类": ["目录结构重组", "存储系统统一规划", "JSON底座结构考察"]
}

print("=" * 80)
for category, topic_list in categories.items():
    print(f"\n### {category}")
    for i, topic in enumerate(topic_list, 1):
        stats = topic_stats.get(topic, {'chars': 0, 'sections': []})
        print(f"{i}. **{topic}** ({stats['chars']:,} 字符)")

print("\n" + "=" * 80)
total_analyzed = sum(s['chars'] for s in topic_stats.values())
print(f"📊 已分类字符数: {total_analyzed:,} ({total_analyzed/len(content)*100:.1f}%)")

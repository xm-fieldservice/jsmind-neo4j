#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试文档上传API"""

import requests
from pathlib import Path

# 测试文件路径
test_file = Path(__file__).parent.parent / "docs" / "工作记录：工作栏-货架生态闭环管理方案.md"

if not test_file.exists():
    print(f"❌ 测试文件不存在: {test_file}")
    exit(1)

print(f"📄 测试文件: {test_file}")
print(f"📏 文件大小: {test_file.stat().st_size / 1024:.2f} KB")

# 上传文件
url = "http://localhost:8000/api/upload-document"

try:
    with open(test_file, 'rb') as f:
        files = {'file': (test_file.name, f, 'text/markdown')}
        print(f"\n🚀 正在上传到: {url}")
        
        response = requests.post(url, files=files)
        
        print(f"\n📊 响应状态: {response.status_code}")
        print(f"📦 响应内容:")
        print(response.json())
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 上传成功！")
            print(f"- 项目: {result['parsed']['projects']}个")
            print(f"- 任务: {result['parsed']['tasks']}个")
            print(f"- 人员: {result['parsed']['persons']}个")
            print(f"- 关系: {result['parsed']['relationships']}个")
        else:
            print(f"\n❌ 上传失败！")
            
except Exception as e:
    print(f"\n❌ 错误: {e}")

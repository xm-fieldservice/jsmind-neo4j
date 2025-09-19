#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
缓存版本更新工具
自动更新 index.html 中的版本号，强制浏览器重新加载资源
"""
import re
import time
from pathlib import Path

def update_cache_version():
    """更新 index.html 中的版本号"""
    project_root = Path(__file__).resolve().parents[1]
    index_file = project_root / "index.html"
    
    if not index_file.exists():
        print(f"[缓存更新] 找不到 index.html: {index_file}")
        return False
    
    # 生成新的版本号（基于当前时间戳）
    new_version = str(int(time.time()))
    print(f"[缓存更新] 新版本号: {new_version}")
    
    # 读取文件内容
    content = index_file.read_text(encoding='utf-8')
    
    # 更新版本号的正则表达式
    patterns = [
        (r'script\.js\?v=\d+', f'script.js?v={new_version}'),
        (r'jsmind-controller\.js\?v=\d+', f'jsmind-controller.js?v={new_version}'),
        (r'StorageService\.js\?v=\d+', f'StorageService.js?v={new_version}'),
        (r'MDToMindmap\.js\?v=\d+', f'MDToMindmap.js?v={new_version}'),
    ]
    
    updated = False
    for pattern, replacement in patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            updated = True
            print(f"[缓存更新] 更新: {pattern} -> {replacement}")
    
    if updated:
        # 写回文件
        index_file.write_text(content, encoding='utf-8')
        print(f"[缓存更新] 已更新 index.html")
        return True
    else:
        print(f"[缓存更新] 没有找到需要更新的版本号")
        return False

if __name__ == "__main__":
    update_cache_version()

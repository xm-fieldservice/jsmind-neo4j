#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
强制重新加载脑图 - 绕过所有缓存机制
"""

import json
from pathlib import Path
import time

def main():
    print("🔄 强制重新加载脑图方案")
    print("=" * 50)
    
    root_dir = Path(__file__).parent
    all_mindmaps_file = root_dir / 'data' / 'all_mindmaps.json'
    
    # 1. 读取当前数据
    with open(all_mindmaps_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 2. 找到目标脑图
    target_id = "root-1758256084936-b8"
    target_mindmap = None
    
    for mindmap in data.get('mindmaps', []):
        if mindmap.get('id') == target_id:
            target_mindmap = mindmap
            break
    
    if not target_mindmap:
        print(f"❌ 找不到目标脑图: {target_id}")
        return
    
    # 3. 统计当前节点数
    children = target_mindmap.get('data', {}).get('data', {}).get('children', [])
    print(f"📊 当前脑图节点数: {len(children)}")
    
    # 4. 创建强制刷新脚本
    refresh_script = f'''
// 强制刷新脑图 - 绕过所有缓存
console.log('🔄 开始强制刷新脑图...');

// 1. 完全清除相关缓存
function clearAllCaches() {{
    // 清除全局缓存变量
    try {{
        delete window.__mindFullCache;
        console.log('✅ 清除全局缓存变量');
    }} catch(e) {{}}
    
    // 清除localStorage中的缓存
    const keysToRemove = [
        '__mind_full_cache_v1',
        'mindmap_data_v1',
        'mm:root-1758256084936-b8:data',
        'mm:root-1758256084936-b8:meta'
    ];
    
    keysToRemove.forEach(key => {{
        try {{
            localStorage.removeItem(key);
            console.log(`✅ 清除localStorage: ${{key}}`);
        }} catch(e) {{}}
    }});
    
    // 停止所有自动同步
    try {{
        window.__STORAGE_PAUSE = true;
        window.__REG_SYNC_SUPPRESS = true;
        console.log('⏸️ 停止自动同步机制');
    }} catch(e) {{}}
}}

// 2. 强制重新从文件加载
function forceReloadFromFile() {{
    console.log('📂 强制从文件重新加载...');
    
    // 重新初始化MindmapController
    if (window.mindmapController && typeof window.mindmapController.loadFromStorage === 'function') {{
        try {{
            window.mindmapController.loadFromStorage();
            console.log('✅ MindmapController重新加载');
        }} catch(e) {{
            console.error('❌ MindmapController重新加载失败:', e);
        }}
    }}
    
    // 强制刷新页面
    setTimeout(() => {{
        console.log('🔄 强制刷新页面...');
        window.location.reload(true); // 强制从服务器重新加载
    }}, 2000);
}}

// 3. 执行强制刷新
try {{
    clearAllCaches();
    forceReloadFromFile();
    
    alert('🔄 正在强制刷新脑图...\\n\\n页面将在2秒后自动刷新');
    
}} catch(error) {{
    console.error('❌ 强制刷新失败:', error);
    alert('❌ 强制刷新失败: ' + error.message);
}}
'''
    
    # 5. 保存刷新脚本
    script_file = root_dir / 'force_reload.js'
    with open(script_file, 'w', encoding='utf-8') as f:
        f.write(refresh_script)
    
    # 6. 创建HTML页面
    html_content = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>强制重新加载脑图</title>
    <style>
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }}
        .container {{
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }}
        h1 {{
            font-size: 2.5em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        .info {{
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            font-size: 1.1em;
        }}
        .btn {{
            display: inline-block;
            padding: 15px 40px;
            margin: 15px;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            border: none;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }}
        .btn-success {{
            background: linear-gradient(45deg, #00b894, #00cec9);
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 强制重新加载脑图</h1>
        
        <div class="info">
            <strong>📊 当前状态:</strong><br>
            脑图ID: root-1758256084936-b8<br>
            节点数量: {len(children)}<br>
            已恢复节点: 20个 (可能未显示)
        </div>
        
        <div class="info">
            ⚡ <strong>此操作将:</strong><br>
            • 清除所有缓存机制<br>
            • 停止自动同步干扰<br>
            • 强制从文件重新加载<br>
            • 自动刷新页面显示
        </div>
        
        <button class="btn" onclick="forceReload()">
            🚀 执行强制刷新
        </button>
        
        <button class="btn btn-success" onclick="openMindmap()">
            🧠 打开脑图页面
        </button>
    </div>

    <script>
        {refresh_script}
        
        function forceReload() {{
            if (confirm('确定要强制刷新脑图吗？\\n\\n这将清除所有缓存并重新加载数据。')) {{
                // 执行强制刷新逻辑
                clearAllCaches();
                forceReloadFromFile();
            }}
        }}
        
        function openMindmap() {{
            window.open('http://localhost:8082', '_blank');
        }}
    </script>
</body>
</html>'''
    
    html_file = root_dir / 'force_reload.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"📝 已生成强制刷新脚本: force_reload.js")
    print(f"📄 已生成强制刷新页面: force_reload.html")
    print()
    print("🎯 使用方法:")
    print("1. 在浏览器中打开 force_reload.html")
    print("2. 点击 '执行强制刷新' 按钮")
    print("3. 等待页面自动刷新")
    print("4. 检查脑图是否显示恢复的节点")
    print()
    print("💡 这将绕过所有缓存机制，直接从文件重新加载数据")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
缓存一致性解决方案
创建统一的缓存同步机制
"""

def create_cache_sync_solution():
    """创建缓存同步解决方案"""
    
    sync_script = '''
// 缓存一致性解决方案
console.log('🔄 启动缓存一致性解决方案...');

class CacheConsistencyManager {
    constructor() {
        this.isLocked = false;
        this.syncInProgress = false;
        this.targetMindmapId = 'root-1758256084936-b8';
        this.expectedNodeCount = 25; // 从文件层确认的节点数
        
        // 缓存键映射
        this.cacheKeys = {
            primary: 'mindmap_data_v1',
            fullCache: '__mind_full_cache_v1',
            catalog: 'mm_project_catalog_v1',
            dynamicData: `mm:${this.targetMindmapId}:data`,
            dynamicMeta: `mm:${this.targetMindmapId}:meta`
        };
        
        this.init();
    }
    
    init() {
        console.log('🚀 初始化缓存一致性管理器...');
        
        // 禁用所有自动同步机制
        this.disableAutoSync();
        
        // 清除全局缓存变量
        this.clearGlobalCache();
        
        // 绑定事件监听
        this.bindEvents();
    }
    
    // 步骤1: 禁用自动同步机制
    disableAutoSync() {
        console.log('⏸️ 禁用自动同步机制...');
        
        try {
            // 停止统一存储管理器的同步
            window.__STORAGE_PAUSE = true;
            window.__REG_SYNC_SUPPRESS = true;
            
            // 停止调试面板的监控
            if (window.debugMindmapNaming && window.debugMindmapNaming.stop) {
                window.debugMindmapNaming.stop();
            }
            
            // 清除可能的定时器
            if (window.unifiedStorageManager && window.unifiedStorageManager.syncTimer) {
                clearInterval(window.unifiedStorageManager.syncTimer);
            }
            
            console.log('✅ 自动同步已禁用');
        } catch (error) {
            console.warn('⚠️ 禁用自动同步时出错:', error);
        }
    }
    
    // 步骤2: 清除全局缓存变量
    clearGlobalCache() {
        console.log('🗑️ 清除全局缓存变量...');
        
        try {
            // 删除全局缓存变量
            delete window.__mindFullCache;
            
            // 清除MindmapController的缓存引用
            if (window.mindmapController) {
                window.mindmapController.fullCacheKey = null;
                window.mindmapController.perMindStorageKey = null;
            }
            
            console.log('✅ 全局缓存已清除');
        } catch (error) {
            console.warn('⚠️ 清除全局缓存时出错:', error);
        }
    }
    
    // 步骤3: 从文件层强制同步
    async forceFileSync() {
        console.log('📂 从文件层强制同步...');
        
        if (this.syncInProgress) {
            console.log('⚠️ 同步正在进行中，跳过');
            return false;
        }
        
        this.syncInProgress = true;
        this.isLocked = true;
        
        try {
            // 从API获取最新数据
            const response = await fetch('/api/mindmaps');
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const fileData = await response.json();
            const targetMindmap = fileData.mindmaps?.find(m => m.id === this.targetMindmapId);
            
            if (!targetMindmap) {
                throw new Error(`找不到目标脑图: ${this.targetMindmapId}`);
            }
            
            console.log(`📊 文件层数据: ${targetMindmap.data?.data?.children?.length || 0} 个节点`);
            
            // 同步到所有缓存层
            await this.syncToAllLayers(targetMindmap);
            
            return true;
            
        } catch (error) {
            console.error('❌ 文件同步失败:', error);
            return false;
        } finally {
            this.syncInProgress = false;
            this.isLocked = false;
        }
    }
    
    // 步骤4: 同步到所有缓存层
    async syncToAllLayers(mindmapData) {
        console.log('🔄 同步到所有缓存层...');
        
        // 准备标准化数据格式
        const standardData = this.standardizeData(mindmapData);
        
        // 同步到localStorage层
        this.syncToLocalStorage(standardData);
        
        // 同步到内存层
        this.syncToMemory(standardData);
        
        // 同步到显示层
        await this.syncToDisplay(standardData);
        
        console.log('✅ 所有缓存层同步完成');
    }
    
    // 数据标准化
    standardizeData(mindmapData) {
        console.log('📋 标准化数据格式...');
        
        return {
            // 主数据格式 (mindmap_data_v1)
            primary: {
                meta: {
                    name: mindmapData.name,
                    author: 'system',
                    version: '1.0'
                },
                format: 'node_tree',
                data: mindmapData.data.data
            },
            
            // 全缓存格式 (__mind_full_cache_v1)
            fullCache: {
                meta: {
                    mind_id: mindmapData.id,
                    name: mindmapData.name
                },
                format: 'node_tree',
                data: mindmapData.data.data
            },
            
            // 动态格式 (mm:id:data)
            dynamic: mindmapData.data,
            
            // 元数据
            meta: {
                id: mindmapData.id,
                name: mindmapData.name,
                nodeCount: mindmapData.data?.data?.children?.length || 0,
                lastSync: new Date().toISOString()
            }
        };
    }
    
    // 同步到localStorage层
    syncToLocalStorage(standardData) {
        console.log('💾 同步到localStorage层...');
        
        try {
            // 清除旧的缓存
            Object.values(this.cacheKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // 写入新数据
            localStorage.setItem(this.cacheKeys.primary, JSON.stringify(standardData.primary));
            localStorage.setItem(this.cacheKeys.fullCache, JSON.stringify(standardData.fullCache));
            localStorage.setItem(this.cacheKeys.dynamicData, JSON.stringify(standardData.dynamic));
            localStorage.setItem(this.cacheKeys.dynamicMeta, JSON.stringify(standardData.meta));
            
            console.log(`✅ localStorage同步完成: ${standardData.meta.nodeCount} 个节点`);
        } catch (error) {
            console.error('❌ localStorage同步失败:', error);
        }
    }
    
    // 同步到内存层
    syncToMemory(standardData) {
        console.log('🧠 同步到内存层...');
        
        try {
            // 确保全局变量不存在
            delete window.__mindFullCache;
            
            // 更新MindmapController
            if (window.mindmapController) {
                window.mindmapController.data = standardData.primary;
                window.mindmapController.rootId = standardData.meta.id;
                
                console.log('✅ MindmapController已更新');
            }
            
        } catch (error) {
            console.error('❌ 内存层同步失败:', error);
        }
    }
    
    // 同步到显示层
    async syncToDisplay(standardData) {
        console.log('🖥️ 同步到显示层...');
        
        try {
            if (window.mindmapController && window.mindmapController.mind) {
                // 强制重新显示数据
                window.mindmapController.mind.show(standardData.primary);
                
                // 等待渲染完成
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 验证显示结果
                const container = document.getElementById('mindmap-container');
                if (container) {
                    const visibleNodes = container.querySelectorAll('jmnode').length;
                    console.log(`✅ 显示层同步完成: ${visibleNodes} 个可见节点`);
                    
                    if (visibleNodes !== standardData.meta.nodeCount) {
                        console.warn(`⚠️ 节点数不匹配: 期望${standardData.meta.nodeCount}, 实际${visibleNodes}`);
                    }
                } else {
                    console.warn('⚠️ 找不到脑图容器');
                }
            } else {
                console.warn('⚠️ MindmapController或jsMind实例不存在');
            }
        } catch (error) {
            console.error('❌ 显示层同步失败:', error);
        }
    }
    
    // 验证一致性
    async validateConsistency() {
        console.log('🔍 验证缓存一致性...');
        
        const validation = {
            fileLayer: 0,
            localStorageLayer: 0,
            memoryLayer: 0,
            displayLayer: 0,
            consistent: false
        };
        
        try {
            // 检查文件层
            const response = await fetch('/api/mindmaps');
            if (response.ok) {
                const fileData = await response.json();
                const targetMindmap = fileData.mindmaps?.find(m => m.id === this.targetMindmapId);
                validation.fileLayer = targetMindmap?.data?.data?.children?.length || 0;
            }
            
            // 检查localStorage层
            const lsData = localStorage.getItem(this.cacheKeys.primary);
            if (lsData) {
                const parsed = JSON.parse(lsData);
                validation.localStorageLayer = parsed.data?.children?.length || 0;
            }
            
            // 检查内存层
            if (window.mindmapController && window.mindmapController.data) {
                validation.memoryLayer = window.mindmapController.data.data?.children?.length || 0;
            }
            
            // 检查显示层
            const container = document.getElementById('mindmap-container');
            if (container) {
                validation.displayLayer = container.querySelectorAll('jmnode').length;
            }
            
            // 判断一致性
            const counts = [validation.fileLayer, validation.localStorageLayer, validation.memoryLayer, validation.displayLayer];
            validation.consistent = counts.every(count => count === counts[0] && count > 0);
            
            console.log('📊 一致性验证结果:', validation);
            return validation;
            
        } catch (error) {
            console.error('❌ 一致性验证失败:', error);
            return validation;
        }
    }
    
    // 绑定事件监听
    bindEvents() {
        // 监听页面刷新前的清理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // 监听存储变化
        window.addEventListener('storage', (event) => {
            if (Object.values(this.cacheKeys).includes(event.key)) {
                console.log(`🔄 检测到存储变化: ${event.key}`);
                if (!this.isLocked) {
                    this.handleStorageChange(event);
                }
            }
        });
    }
    
    // 处理存储变化
    handleStorageChange(event) {
        console.log('🔄 处理存储变化...');
        // 这里可以添加自动重新同步逻辑
        // 但要避免无限循环
    }
    
    // 清理资源
    cleanup() {
        console.log('🧹 清理缓存管理器资源...');
        this.isLocked = false;
        this.syncInProgress = false;
    }
    
    // 执行完整的一致性修复
    async executeFullSync() {
        console.log('🚀 执行完整的缓存一致性修复...');
        
        try {
            // 步骤1: 验证当前状态
            const beforeValidation = await this.validateConsistency();
            console.log('修复前状态:', beforeValidation);
            
            // 步骤2: 强制从文件同步
            const syncSuccess = await this.forceFileSync();
            if (!syncSuccess) {
                throw new Error('文件同步失败');
            }
            
            // 步骤3: 等待同步完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 步骤4: 验证修复结果
            const afterValidation = await this.validateConsistency();
            console.log('修复后状态:', afterValidation);
            
            // 步骤5: 重新启用部分自动机制
            this.enableSafeAutoSync();
            
            return {
                success: afterValidation.consistent,
                before: beforeValidation,
                after: afterValidation
            };
            
        } catch (error) {
            console.error('❌ 完整同步失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 重新启用安全的自动同步
    enableSafeAutoSync() {
        console.log('▶️ 重新启用安全的自动同步...');
        
        // 只启用必要的同步，避免冲突
        setTimeout(() => {
            window.__STORAGE_PAUSE = false;
            // 注意：不重新启用 __REG_SYNC_SUPPRESS，避免注册表冲突
        }, 2000);
    }
}

// 创建全局实例
window.cacheConsistencyManager = new CacheConsistencyManager();

// 提供简单的调用接口
window.fixCacheConsistency = async function() {
    console.log('🔧 开始修复缓存一致性...');
    const result = await window.cacheConsistencyManager.executeFullSync();
    
    if (result.success) {
        alert(`✅ 缓存一致性修复成功！\\n\\n修复前: ${JSON.stringify(result.before)}\\n修复后: ${JSON.stringify(result.after)}`);
    } else {
        alert(`❌ 缓存一致性修复失败: ${result.error}`);
    }
    
    return result;
};
'''
    
    return sync_script

def main():
    print("🔄 创建缓存一致性解决方案...")
    print("=" * 50)
    
    # 创建同步脚本
    sync_script = create_cache_sync_solution()
    
    # 保存脚本文件
    script_file = 'cache_consistency_fix.js'
    with open(script_file, 'w', encoding='utf-8') as f:
        f.write(sync_script)
    
    # 创建HTML页面
    html_content = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>缓存一致性修复工具</title>
    <style>
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            max-width: 800px;
            margin: 30px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }}
        .container {{
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }}
        h1 {{
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 30px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        .problem-analysis {{
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
        }}
        .solution-steps {{
            background: rgba(255,255,255,0.15);
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
        }}
        .step {{
            margin: 15px 0;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            border-left: 4px solid #00cec9;
        }}
        .btn {{
            display: inline-block;
            padding: 15px 30px;
            margin: 10px;
            background: linear-gradient(45deg, #00b894, #00cec9);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            border: none;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }}
        .btn-danger {{
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
        }}
        .btn-info {{
            background: linear-gradient(45deg, #74b9ff, #0984e3);
        }}
        .status-display {{
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            max-height: 300px;
            overflow-y: auto;
        }}
        .center {{
            text-align: center;
        }}
        .progress {{
            width: 100%;
            height: 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }}
        .progress-bar {{
            height: 100%;
            background: linear-gradient(45deg, #00b894, #00cec9);
            width: 0%;
            transition: width 0.3s;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 缓存一致性修复工具</h1>
        
        <div class="problem-analysis">
            <h2>🚨 问题分析</h2>
            <p><strong>根本原因</strong>: 4层缓存数据不同步</p>
            <ul>
                <li>📁 <strong>文件层</strong>: all_mindmaps.json (25个节点) ✅</li>
                <li>💾 <strong>localStorage层</strong>: 可能包含过期数据 ❓</li>
                <li>🧠 <strong>内存层</strong>: __mindFullCache被多处重置 ⚠️</li>
                <li>🖥️ <strong>显示层</strong>: 只显示5个节点 ❌</li>
            </ul>
        </div>
        
        <div class="solution-steps">
            <h2>💡 解决方案</h2>
            <div class="step">
                <strong>步骤1</strong>: 禁用所有自动同步机制，防止干扰
            </div>
            <div class="step">
                <strong>步骤2</strong>: 清除全局缓存变量(__mindFullCache)
            </div>
            <div class="step">
                <strong>步骤3</strong>: 从文件层强制同步最新数据
            </div>
            <div class="step">
                <strong>步骤4</strong>: 按顺序同步到所有缓存层
            </div>
            <div class="step">
                <strong>步骤5</strong>: 验证一致性并重新启用安全机制
            </div>
        </div>
        
        <div class="center">
            <button class="btn" onclick="startConsistencyFix()">
                🚀 开始修复缓存一致性
            </button>
            
            <button class="btn btn-info" onclick="validateOnly()">
                🔍 仅验证一致性
            </button>
            
            <button class="btn btn-danger" onclick="openMindmap()">
                🧠 打开脑图页面
            </button>
        </div>
        
        <div class="progress" id="progress-container" style="display: none;">
            <div class="progress-bar" id="progress-bar"></div>
        </div>
        
        <div class="status-display" id="status-display">
            等待操作...
        </div>
    </div>

    <script>
        {sync_script}
        
        let statusDisplay = document.getElementById('status-display');
        let progressContainer = document.getElementById('progress-container');
        let progressBar = document.getElementById('progress-bar');
        
        function updateStatus(message) {{
            const timestamp = new Date().toLocaleTimeString();
            statusDisplay.innerHTML += '[' + timestamp + '] ' + message + '\\n';
            statusDisplay.scrollTop = statusDisplay.scrollHeight;
        }}
        
        function updateProgress(percent) {{
            progressBar.style.width = percent + '%';
        }}
        
        async function startConsistencyFix() {{
            updateStatus('🚀 开始缓存一致性修复...');
            progressContainer.style.display = 'block';
            
            try {{
                updateProgress(20);
                updateStatus('⏸️ 禁用自动同步机制...');
                
                updateProgress(40);
                updateStatus('📂 从文件层获取最新数据...');
                
                updateProgress(60);
                updateStatus('🔄 同步到所有缓存层...');
                
                updateProgress(80);
                updateStatus('🔍 验证一致性...');
                
                const result = await window.fixCacheConsistency();
                
                updateProgress(100);
                
                if (result.success) {{
                    updateStatus('✅ 缓存一致性修复成功！');
                    updateStatus('📊 修复结果: 文件层' + result.after.fileLayer + ', localStorage层' + result.after.localStorageLayer + ', 内存层' + result.after.memoryLayer + ', 显示层' + result.after.displayLayer);
                    
                    setTimeout(() => {{
                        if (confirm('修复完成！是否刷新页面查看结果？')) {{
                            window.location.reload();
                        }}
                    }}, 2000);
                }} else {{
                    updateStatus('❌ 修复失败: ' + result.error);
                }}
                
            }} catch (error) {{
                updateStatus('❌ 修复过程出错: ' + error.message);
            }} finally {{
                setTimeout(() => {{
                    progressContainer.style.display = 'none';
                    updateProgress(0);
                }}, 3000);
            }}
        }}
        
        async function validateOnly() {{
            updateStatus('🔍 开始验证缓存一致性...');
            
            try {{
                const validation = await window.cacheConsistencyManager.validateConsistency();
                
                updateStatus('📊 一致性验证结果:');
                updateStatus('  📁 文件层: ' + validation.fileLayer + ' 个节点');
                updateStatus('  💾 localStorage层: ' + validation.localStorageLayer + ' 个节点');
                updateStatus('  🧠 内存层: ' + validation.memoryLayer + ' 个节点');
                updateStatus('  🖥️ 显示层: ' + validation.displayLayer + ' 个节点');
                updateStatus('  🎯 一致性: ' + (validation.consistent ? '✅ 一致' : '❌ 不一致'));
                
                if (!validation.consistent) {{
                    updateStatus('💡 建议: 执行缓存一致性修复');
                }}
                
            }} catch (error) {{
                updateStatus('❌ 验证失败: ' + error.message);
            }}
        }}
        
        function openMindmap() {{
            window.open('http://localhost:8082', '_blank');
        }}
        
        // 页面加载时自动验证
        window.onload = function() {{
            updateStatus('🔧 缓存一致性修复工具已加载');
            updateStatus('💡 建议: 先点击"仅验证一致性"查看当前状态');
            
            // 自动验证
            setTimeout(validateOnly, 1000);
        }};
    </script>
</body>
</html>'''
    
    html_file = 'cache_consistency_fix.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"📝 已生成缓存同步脚本: {script_file}")
    print(f"📄 已生成一致性修复页面: {html_file}")
    print()
    print("🎯 缓存一致性解决方案:")
    print("1. 📋 系统性问题诊断")
    print("2. 🔄 4层缓存强制同步")
    print("3. ⚠️ 冲突机制禁用")
    print("4. ✅ 一致性验证")
    print("5. 🔒 安全机制重启")
    print()
    print("💡 使用方法:")
    print("1. 在浏览器中打开 cache_consistency_fix.html")
    print("2. 点击 '仅验证一致性' 查看当前状态")
    print("3. 点击 '开始修复缓存一致性' 执行修复")
    print("4. 等待修复完成并刷新页面")
    print()
    print("🚀 这将彻底解决4层缓存数据不同步的问题！")

if __name__ == '__main__':
    main()

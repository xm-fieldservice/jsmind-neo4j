/**
 * ColumnRegistry 自动演示脚本
 * 程序员 - 用于快速验证ColumnRegistry功能
 * 
 * 使用方法：在index.html中引入此脚本，刷新页面即可看到演示
 */

;(function() {
    'use strict';
    
    console.log('[演示] ColumnRegistry自动演示脚本开始');
    
    // 等待ColumnRegistry初始化完成
    function waitForRegistry(callback, maxAttempts = 50) {
        let attempts = 0;
        
        const check = () => {
            attempts++;
            
            if (window.ColumnRegistry && window.ColumnRegistry._initialized) {
                console.log('[演示] ✅ ColumnRegistry已就绪');
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('[演示] ❌ ColumnRegistry初始化超时');
            }
        };
        
        check();
    }
    
    // 等待DOM加载完成
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    whenReady(() => {
        // 延迟1秒执行，确保所有组件都已加载
        setTimeout(() => {
            waitForRegistry(() => {
                registerDemoColumn();
            });
        }, 1000);
    });
    
    function registerDemoColumn() {
        console.log('[演示] 开始注册演示工作栏...');
        
        try {
            const result = window.ColumnRegistry.register({
                id: 'demo-swimlane',
                title: '泳道看板',
                icon: '🏊',
                position: 'after:detail',
                defaultActive: true,
                renderFn: (container) => {
                    container.innerHTML = `
                        <div style="padding:20px;height:100%;display:flex;flex-direction:column;gap:16px;">
                            <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:20px;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                                <h2 style="margin:0 0 8px 0;font-size:24px;">🎉 ColumnRegistry 演示成功！</h2>
                                <p style="margin:0;font-size:14px;opacity:0.9;">这是一个动态注册的工作栏示例</p>
                            </div>
                            
                            <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e5e7eb;">
                                <h3 style="margin:0 0 12px 0;color:#374151;">✨ 核心功能验证</h3>
                                <ul style="margin:0;padding-left:20px;color:#6b7280;line-height:1.8;">
                                    <li>✅ 自动HTML注入（无需手动编辑index.html）</li>
                                    <li>✅ 自动创建顶部切换按钮</li>
                                    <li>✅ 集成ColumnManager管理</li>
                                    <li>✅ 事件系统集成（AutogenEventBus）</li>
                                    <li>✅ 审计日志记录</li>
                                </ul>
                            </div>
                            
                            <div style="background:#f0f9ff;padding:16px;border-radius:8px;border:1px solid #bae6fd;">
                                <h3 style="margin:0 0 12px 0;color:#0369a1;">📊 统计信息</h3>
                                <p style="margin:0;color:#0c4a6e;font-size:14px;">
                                    <strong>注册时间:</strong> ${new Date().toLocaleString('zh-CN')}<br>
                                    <strong>工作栏ID:</strong> demo-swimlane<br>
                                    <strong>代码行数:</strong> 仅需20行配置代码
                                </p>
                            </div>
                            
                            <div style="background:#fef3c7;padding:16px;border-radius:8px;border:1px solid #fcd34d;">
                                <h3 style="margin:0 0 8px 0;color:#92400e;">🎯 下一步操作</h3>
                                <p style="margin:0;color:#78350f;font-size:13px;">
                                    1. 打开浏览器控制台查看注册日志<br>
                                    2. 点击顶部"🏊 泳道看板"按钮测试切换<br>
                                    3. 查看审计日志：<code style="background:#fff;padding:2px 6px;border-radius:4px;">window.ColumnRegistry.getAuditLog()</code>
                                </p>
                            </div>
                            
                            <button onclick="window.ColumnRegistry.unregister('demo-swimlane')" 
                                    style="padding:12px 24px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s;"
                                    onmouseover="this.style.background='#dc2626'"
                                    onmouseout="this.style.background='#ef4444'">
                                🗑️ 注销此工作栏（测试unregister功能）
                            </button>
                        </div>
                    `;
                },
                metadata: {
                    version: '1.0.0',
                    author: '程序员',
                    description: 'ColumnRegistry功能演示工作栏'
                }
            });
            
            if (result) {
                console.log('[演示] ✅ 演示工作栏注册成功');
                console.log('[演示] 💡 提示：查看页面右侧应该出现"泳道看板"工作栏');
                console.log('[演示] 💡 提示：顶部系统栏应该出现"🏊 泳道看板"按钮');
            } else {
                console.error('[演示] ❌ 演示工作栏注册失败');
            }
            
        } catch (error) {
            console.error('[演示] ❌ 注册过程出错:', error);
            console.error('[演示] 错误堆栈:', error.stack);
        }
    }
    
})();

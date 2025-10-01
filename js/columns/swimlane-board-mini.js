/**
 * 泳道看板 - 最小化测试版本
 */
;(function(global) {
    'use strict';
    
    console.log('[泳道看板MINI] 组件加载中...');
    
    // 等待ColumnRegistry就绪
    function waitForRegistry(callback, maxAttempts = 50) {
        let attempts = 0;
        
        const check = () => {
            attempts++;
            
            if (global.ColumnRegistry && global.ColumnRegistry._initialized) {
                console.log('[泳道看板MINI] ✅ ColumnRegistry已就绪');
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('[泳道看板MINI] ❌ ColumnRegistry初始化超时');
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
    
    // 注册泳道看板组件
    function registerSwimlaneBoard() {
        try {
            const result = global.ColumnRegistry.register({
                id: 'swimlane-board-mini',
                title: '泳道看板MINI',
                icon: '🏊',
                position: 'after:detail',
                defaultActive: false,
                renderFn: (container) => {
                    console.log('[泳道看板MINI] renderFn被调用');
                    
                    // 注入样式到 head
                    const styleId = 'swimlane-board-mini-styles';
                    if (!document.getElementById(styleId)) {
                        const style = document.createElement('style');
                        style.id = styleId;
                        style.textContent = `
.swimlane-board-mini-wrapper {
    width: 100%;
    height: 100%;
    min-height: 400px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 32px;
    font-weight: bold;
    text-align: center;
    padding: 40px;
    box-sizing: border-box;
}
`;
                        document.head.appendChild(style);
                        console.log('[泳道看板MINI] ✅ 样式已注入');
                    }
                    
                    // 注入HTML
                    container.innerHTML = `
                        <div class="swimlane-board-mini-wrapper">
                            <div>
                                <div style="font-size: 64px; margin-bottom: 20px;">🏊</div>
                                <div>泳道看板 MINI</div>
                                <div style="font-size: 16px; margin-top: 20px; opacity: 0.9;">
                                    如果你能看到这个，说明渲染成功！
                                </div>
                            </div>
                        </div>
                    `;
                    
                    console.log('[泳道看板MINI] ✅ HTML已注入，内容长度:', container.innerHTML.length);
                },
                metadata: {
                    version: '1.0.0-mini',
                    author: '程序员',
                    description: '泳道看板最小化测试版本'
                }
            });
            
            if (result) {
                console.log('[泳道看板MINI] ✅ 组件注册成功');
            } else {
                console.error('[泳道看板MINI] ❌ 组件注册失败');
            }
            
        } catch (error) {
            console.error('[泳道看板MINI] ❌ 注册过程出错:', error);
        }
    }
    
    // 启动注册流程
    whenReady(() => {
        setTimeout(() => {
            waitForRegistry(() => {
                registerSwimlaneBoard();
            });
        }, 1000);
    });
    
})(window || this);

// 工作区按键切换功能测试
(function() {
    console.log('[测试] 工作区按键切换功能测试开始');
    
    // 等待页面加载完成
    function waitForReady() {
        if (!window.columnManager || !document.querySelector('.view-toggle[data-view="workspace"]')) {
            setTimeout(waitForReady, 100);
            return;
        }
        
        console.log('[测试] 页面组件已就绪，开始测试');
        testWorkspaceToggle();
    }
    
    function testWorkspaceToggle() {
        const workspaceBtn = document.querySelector('.view-toggle[data-view="workspace"]');
        const workspaceColumn = document.getElementById('workspace-column');
        
        if (!workspaceBtn || !workspaceColumn) {
            console.error('[测试] 工作区按键或工作区栏不存在');
            return;
        }
        
        console.log('[测试] 找到工作区按键和工作区栏');
        
        // 测试初始状态
        const initialActive = workspaceBtn.classList.contains('active');
        const initialVisible = workspaceColumn.classList.contains('visible');
        
        console.log('[测试] 初始状态:', {
            按键激活: initialActive,
            栏位可见: initialVisible
        });
        
        // 模拟点击测试
        setTimeout(() => {
            console.log('[测试] 模拟第一次点击工作区按键');
            workspaceBtn.click();
            
            setTimeout(() => {
                const afterFirstClick = {
                    按键激活: workspaceBtn.classList.contains('active'),
                    栏位可见: workspaceColumn.classList.contains('visible')
                };
                console.log('[测试] 第一次点击后状态:', afterFirstClick);
                
                // 第二次点击测试
                setTimeout(() => {
                    console.log('[测试] 模拟第二次点击工作区按键');
                    workspaceBtn.click();
                    
                    setTimeout(() => {
                        const afterSecondClick = {
                            按键激活: workspaceBtn.classList.contains('active'),
                            栏位可见: workspaceColumn.classList.contains('visible')
                        };
                        console.log('[测试] 第二次点击后状态:', afterSecondClick);
                        
                        // 验证切换功能
                        const toggleWorking = (
                            afterFirstClick.按键激活 !== initialActive &&
                            afterFirstClick.栏位可见 !== initialVisible &&
                            afterSecondClick.按键激活 !== afterFirstClick.按键激活 &&
                            afterSecondClick.栏位可见 !== afterFirstClick.栏位可见
                        );
                        
                        if (toggleWorking) {
                            console.log('✅ [测试] 工作区按键切换功能正常工作');
                        } else {
                            console.log('❌ [测试] 工作区按键切换功能异常');
                        }
                        
                        console.log('[测试] 工作区按键切换功能测试完成');
                    }, 100);
                }, 500);
            }, 100);
        }, 1000);
    }
    
    // 开始测试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForReady);
    } else {
        waitForReady();
    }
})();

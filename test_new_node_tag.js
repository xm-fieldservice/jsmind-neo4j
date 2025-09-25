/**
 * 测试新节点默认"议题"标签功能
 */

function testNewNodeDefaultTag() {
    console.log('🧪 开始测试新节点默认"议题"标签功能...');
    
    const tests = [];
    
    // 测试1: 检查增强器是否加载
    tests.push({
        name: '新按钮增强器',
        test: () => {
            const enhancer = window.newButtonEnhancer;
            const newBtn = document.getElementById('mindmap-new-btn');
            
            if (!enhancer) return { success: false, message: '新按钮增强器未加载' };
            if (!newBtn) return { success: false, message: '新按钮不存在' };
            if (!newBtn._enhanced) return { success: false, message: '新按钮未被增强' };
            
            return { success: true, message: '新按钮增强器已就绪' };
        }
    });
    
    // 测试2: 检查MindmapController的getDefaultData方法
    tests.push({
        name: 'getDefaultData方法',
        test: () => {
            const mc = window.mindmapController;
            if (!mc) return { success: false, message: 'MindmapController不存在' };
            if (!mc.getDefaultData) return { success: false, message: 'getDefaultData方法不存在' };
            
            try {
                const defaultData = mc.getDefaultData();
                const rootContent = defaultData.content || '';
                const hasTag = rootContent.includes('标签: 议题') || rootContent.includes('标签：议题');
                
                if (!hasTag) return { success: false, message: '默认数据不包含"议题"标签' };
                
                return { success: true, message: '默认数据包含"议题"标签' };
            } catch (error) {
                return { success: false, message: '获取默认数据失败: ' + error.message };
            }
        }
    });
    
    // 测试3: 模拟新建操作
    tests.push({
        name: '模拟新建脑图',
        test: () => {
            return new Promise((resolve) => {
                const newBtn = document.getElementById('mindmap-new-btn');
                if (!newBtn) {
                    resolve({ success: false, message: '新按钮不存在' });
                    return;
                }
                
                console.log('🔘 模拟点击"新"按钮...');
                
                // 监听脑图创建事件
                const handleCreated = (event) => {
                    if (event.detail && event.detail.source === 'new') {
                        window.removeEventListener('mindmap:imported', handleCreated);
                        
                        setTimeout(() => {
                            const mc = window.mindmapController;
                            if (mc && mc.mind && mc.mind.get_root) {
                                const root = mc.mind.get_root();
                                if (root && root.data && root.data.content) {
                                    const content = root.data.content;
                                    const hasTag = content.includes('标签: 议题') || content.includes('标签：议题');
                                    
                                    if (hasTag) {
                                        resolve({ success: true, message: '新建脑图包含"议题"标签' });
                                    } else {
                                        resolve({ success: false, message: '新建脑图不包含"议题"标签' });
                                    }
                                } else {
                                    resolve({ success: false, message: '无法获取根节点内容' });
                                }
                            } else {
                                resolve({ success: false, message: '无法获取脑图实例' });
                            }
                        }, 800);
                    }
                };
                
                window.addEventListener('mindmap:imported', handleCreated);
                
                // 点击新建按钮
                newBtn.click();
                
                // 超时处理
                setTimeout(() => {
                    window.removeEventListener('mindmap:imported', handleCreated);
                    resolve({ success: false, message: '新建操作超时' });
                }, 5000);
            });
        }
    });
    
    // 执行测试
    async function runTests() {
        console.log('📋 执行测试...');
        const results = [];
        
        for (const test of tests) {
            try {
                console.log(`🔍 测试: ${test.name}`);
                const result = await test.test();
                console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
                results.push({ ...test, ...result });
            } catch (error) {
                console.log(`❌ ${test.name}: 测试异常 - ${error.message}`);
                results.push({ ...test, success: false, message: '测试异常: ' + error.message });
            }
        }
        
        // 统计结果
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        
        console.log(`\n📊 测试结果: ${passed}/${total} 通过`);
        
        if (passed === total) {
            console.log('🎉 所有测试通过！新节点默认标签功能正常');
            showTestNotification('新节点默认标签功能测试全部通过！', 'success');
        } else {
            console.log('⚠️ 部分测试失败，请检查上述错误');
            showTestNotification(`新节点默认标签测试: ${passed}/${total} 通过`, 'warning');
        }
        
        return results;
    }
    
    return runTests();
}

function showTestNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
    `;
    
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// 创建测试按钮
function createTestButton() {
    const button = document.createElement('button');
    button.textContent = '🧪 测试新节点标签';
    button.style.cssText = `
        position: fixed;
        top: 140px;
        right: 20px;
        padding: 8px 12px;
        background: #10b981;
        color: white;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
    `;
    
    button.addEventListener('click', async () => {
        button.textContent = '⏳ 测试中...';
        button.disabled = true;
        
        try {
            await testNewNodeDefaultTag();
        } finally {
            setTimeout(() => {
                button.textContent = '🧪 测试新节点标签';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 新节点标签测试按钮已创建');
}

// 延迟创建测试按钮
setTimeout(() => {
    createTestButton();
    console.log('💡 点击右上角的"测试新节点标签"按钮来测试功能');
}, 5000);

// 导出测试函数
window.testNewNodeDefaultTag = testNewNodeDefaultTag;

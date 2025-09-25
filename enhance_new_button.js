/**
 * 增强"新"按钮功能，确保新建节点包含"议题"标签
 */

class NewButtonEnhancer {
    constructor() {
        this.init();
    }
    
    init() {
        this.waitForComponents();
    }
    
    waitForComponents() {
        const checkReady = () => {
            const newBtn = document.getElementById('mindmap-new-btn');
            const mc = window.mindmapController;
            
            if (newBtn && mc) {
                this.enhanceNewButton(newBtn, mc);
            } else {
                setTimeout(checkReady, 200);
            }
        };
        
        checkReady();
    }
    
    enhanceNewButton(newBtn, mc) {
        if (newBtn._enhanced) return;
        
        console.log('🔧 开始增强"新"按钮功能...');
        
        // 标记已增强，避免重复处理
        newBtn._enhanced = true;
        
        // 保存原始的点击处理器
        const originalClickHandlers = [];
        
        // 移除现有的事件监听器并保存
        const newBtnClone = newBtn.cloneNode(true);
        newBtn.parentNode.replaceChild(newBtnClone, newBtn);
        
        // 添加新的增强点击处理器
        newBtnClone.addEventListener('click', async (event) => {
            console.log('🆕 "新"按钮被点击，开始创建带"议题"标签的脑图...');
            
            try {
                // 防止重复点击
                if (newBtnClone.disabled) return;
                newBtnClone.disabled = true;
                
                setTimeout(() => {
                    newBtnClone.disabled = false;
                }, 1000);
                
                // 创建带标签的默认数据 - 只有一个根节点
                const uid = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                const defaultData = {
                    id: uid,
                    topic: '项目脑图',
                    content: '标签: 议题\n\n# 根节点\n\n在此编写内容...',
                    expanded: true,
                    data: {
                        content: '标签: 议题\n\n# 根节点\n\n在此编写内容...'
                    },
                    children: []  // 空的子节点数组，只创建根节点
                };
                
                // 设置数据并渲染
                mc.data = defaultData;
                mc.renderMindmap();
                
                // 保存到存储
                mc.saveMindmapToStorage();
                
                // 注册到项目管理系统
                const name = '项目脑图';
                const payload = { format: 'node_tree', data: defaultData };
                
                if (window.Registry && window.Registry.cmd) {
                    try {
                        await window.Registry.cmd.register({ 
                            id: uid, 
                            project_id: uid, 
                            name, 
                            payload, 
                            source: 'new' 
                        });
                        window.Registry.cmd.select(uid);
                    } catch (e) {
                        console.warn('[NewButton] Registry注册失败:', e);
                    }
                }
                
                // 触发事件通知
                if (window.AutogenEventBus) {
                    window.AutogenEventBus.emit('mindmap:imported', { name, payload, source: 'new' });
                } else {
                    window.dispatchEvent(new CustomEvent('mindmap:imported', { 
                        detail: { name, payload, source: 'new' } 
                    }));
                }
                
                console.log('✅ 新脑图创建完成，根节点已包含"议题"标签');
                
                // 显示成功通知
                this.showNotification('新脑图已创建，根节点包含"议题"标签', 'success');
                
            } catch (error) {
                console.error('❌ 创建新脑图失败:', error);
                this.showNotification('创建新脑图失败: ' + error.message, 'error');
            }
        });
        
        console.log('✅ "新"按钮功能增强完成');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
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
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// 初始化增强器
let newButtonEnhancer = null;

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        newButtonEnhancer = new NewButtonEnhancer();
        window.newButtonEnhancer = newButtonEnhancer;
        console.log('🎯 "新"按钮增强器已初始化');
    }, 2000);
});

window.NewButtonEnhancer = NewButtonEnhancer;

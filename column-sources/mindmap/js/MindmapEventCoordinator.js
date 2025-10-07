/**
 * 脑图事件协调器
 * 统一管理所有事件（DOM + jsMind + 全局），集成MindmapEventManager和AutogenEventBus
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2 - Task 2.0.2: 架构对齐 - 事件协调器
 * 
 * 解决问题：
 * - 消除30+处直接DOM事件绑定
 * - 统一事件管理（DOM + jsMind + 全局）
 * - 集成MindmapEventManager处理jsMind事件
 * - 集成AutogenEventBus统一事件总线
 */

class MindmapEventCoordinator {
    constructor(jm, eventBus, eventManager) {
        this.jm = jm;
        this.eventBus = eventBus || window.AutogenEventBus;
        this.eventManager = eventManager || window.MindmapEventManager;
        
        // 事件处理器映射
        this.handlers = new Map();
        
        // 统计信息
        this.stats = {
            domEvents: 0,
            jsmindEvents: 0,
            busEvents: 0
        };
        
        console.log('[EventCoordinator] 事件协调器创建完成');
    }
    
    /**
     * 初始化事件系统
     */
    init() {
        this.setupJsMindEvents();
        this.setupGlobalEvents();
        console.log('[EventCoordinator] ✅ 事件系统初始化完成');
    }
    
    /**
     * 设置jsMind事件（优先使用MindmapEventManager）
     */
    setupJsMindEvents() {
        if (this.eventManager && typeof this.eventManager.on === 'function') {
            // 使用MindmapEventManager处理jsMind事件
            this.eventManager.on('node.selected', (data) => {
                this.emit('mindmap:node:selected', data);
            });
            
            this.eventManager.on('node.edited', (data) => {
                this.emit('mindmap:node:edited', data);
            });
            
            this.eventManager.on('node.added', (data) => {
                this.emit('mindmap:node:added', data);
            });
            
            this.eventManager.on('node.deleted', (data) => {
                this.emit('mindmap:node:deleted', data);
            });
            
            console.log('[EventCoordinator] ✅ 已集成MindmapEventManager');
        } else if (this.jm) {
            // 降级：直接监听jsMind事件
            this.jm.add_event_listener((type, data) => {
                this.stats.jsmindEvents++;
                this.emit(`mindmap:jsmind:${type}`, data);
            });
            
            console.log('[EventCoordinator] ⚠️ 降级使用jsMind原生事件');
        }
    }
    
    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        // 页面卸载事件
        window.addEventListener('beforeunload', (e) => {
            this.emit('mindmap:lifecycle:beforeunload', { event: e });
        });
        
        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.emit('mindmap:ui:resize', { 
                width: window.innerWidth, 
                height: window.innerHeight 
            });
        });
        
        console.log('[EventCoordinator] ✅ 全局事件已绑定');
    }
    
    /**
     * 绑定DOM事件到EventBus
     * @param {string} elementId - 元素ID
     * @param {string} domEvent - DOM事件名（如'click'）
     * @param {string} busEvent - EventBus事件名（如'mindmap:action:save'）
     * @param {Function} transformer - 数据转换函数（可选）
     */
    bindDOMEvent(elementId, domEvent, busEvent, transformer = null) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`[EventCoordinator] 元素未找到: ${elementId}`);
            return false;
        }
        
        const handler = (e) => {
            this.stats.domEvents++;
            
            const data = transformer ? transformer(e) : {
                elementId: elementId,
                originalEvent: e,
                timestamp: Date.now()
            };
            
            this.emit(busEvent, data);
        };
        
        element.addEventListener(domEvent, handler);
        
        // 保存处理器引用，便于后续移除
        const key = `${elementId}:${domEvent}`;
        this.handlers.set(key, { element, domEvent, handler, busEvent });
        
        return true;
    }
    
    /**
     * 批量绑定工具栏按钮事件
     * @param {Array} buttons - 按钮配置数组 [{id, event, action}]
     */
    bindToolbarButtons(buttons) {
        let successCount = 0;
        
        buttons.forEach(btn => {
            const success = this.bindDOMEvent(
                btn.id, 
                btn.event || 'click', 
                `mindmap:action:${btn.action}`
            );
            if (success) successCount++;
        });
        
        console.log(`[EventCoordinator] ✅ 已绑定${successCount}个工具栏按钮`);
        return successCount;
    }
    
    /**
     * 发射事件到EventBus
     * @param {string} eventName - 事件名
     * @param {Object} data - 事件数据
     */
    emit(eventName, data = {}) {
        this.stats.busEvents++;
        
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit(eventName, {
                ...data,
                timestamp: data.timestamp || Date.now()
            });
        } else {
            // 降级：使用console输出
            console.log(`[EventCoordinator] Event: ${eventName}`, data);
        }
    }
    
    /**
     * 监听事件
     * @param {string} eventName - 事件名
     * @param {Function} handler - 处理函数
     */
    on(eventName, handler) {
        if (this.eventBus && typeof this.eventBus.on === 'function') {
            this.eventBus.on(eventName, handler);
        } else {
            console.warn('[EventCoordinator] EventBus不可用，无法监听事件');
        }
    }
    
    /**
     * 移除事件监听
     * @param {string} eventName - 事件名
     * @param {Function} handler - 处理函数
     */
    off(eventName, handler) {
        if (this.eventBus && typeof this.eventBus.off === 'function') {
            this.eventBus.off(eventName, handler);
        }
    }
    
    /**
     * 移除DOM事件绑定
     * @param {string} elementId - 元素ID
     * @param {string} domEvent - DOM事件名
     */
    unbindDOMEvent(elementId, domEvent) {
        const key = `${elementId}:${domEvent}`;
        const binding = this.handlers.get(key);
        
        if (binding) {
            binding.element.removeEventListener(binding.domEvent, binding.handler);
            this.handlers.delete(key);
            return true;
        }
        
        return false;
    }
    
    /**
     * 移除所有DOM事件绑定
     */
    unbindAll() {
        this.handlers.forEach((binding, key) => {
            binding.element.removeEventListener(binding.domEvent, binding.handler);
        });
        this.handlers.clear();
        console.log('[EventCoordinator] 已移除所有DOM事件绑定');
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            boundEvents: this.handlers.size,
            hasEventBus: !!this.eventBus,
            hasEventManager: !!this.eventManager
        };
    }
    
    /**
     * 清理资源
     */
    destroy() {
        this.unbindAll();
        console.log('[EventCoordinator] 事件协调器已销毁');
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapEventCoordinator = MindmapEventCoordinator;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapEventCoordinator;
}

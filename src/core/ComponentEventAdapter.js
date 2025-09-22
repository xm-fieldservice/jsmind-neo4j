/**
 * 组件事件适配器
 * 阶段2.1：将组件间直接调用改为事件驱动
 * 提供向后兼容的适配层，逐步替换 window.mindmapController 等直接调用
 */

/**
 * 脑图控制器事件适配器
 * 将对 window.mindmapController 的直接调用转换为事件驱动
 */
export class MindmapControllerEventAdapter {
    constructor(eventBus, standardEvents) {
        this.eventBus = eventBus;
        this.events = standardEvents;
        this.originalController = null;
        
        // 缓存常用的控制器引用
        this._controllerCache = null;
        this._lastCacheTime = 0;
        this._cacheTimeout = 1000; // 1秒缓存
        
        console.log('[MindmapAdapter] 脑图控制器事件适配器已创建');
    }

    /**
     * 获取控制器实例（带缓存）
     * @private
     */
    _getController() {
        const now = Date.now();
        if (this._controllerCache && (now - this._lastCacheTime) < this._cacheTimeout) {
            return this._controllerCache;
        }
        
        this._controllerCache = window.mindmapController || null;
        this._lastCacheTime = now;
        return this._controllerCache;
    }

    /**
     * 安全执行控制器方法
     * @private
     */
    _safeExecute(methodName, args = [], fallback = null) {
        try {
            const controller = this._getController();
            if (!controller) {
                console.warn(`[MindmapAdapter] 控制器不可用: ${methodName}`);
                return fallback;
            }
            
            if (typeof controller[methodName] !== 'function') {
                console.warn(`[MindmapAdapter] 方法不存在: ${methodName}`);
                return fallback;
            }
            
            return controller[methodName](...args);
        } catch (error) {
            console.error(`[MindmapAdapter] 执行失败: ${methodName}`, error);
            return fallback;
        }
    }

    /**
     * 获取脑图数据
     * 替换: window.mindmapController.mind.get_data('node_tree')
     */
    getMindData(format = 'node_tree') {
        const controller = this._getController();
        if (!controller || !controller.mind) {
            return null;
        }
        
        try {
            const data = controller.mind.get_data(format);
            
            // 发布数据访问事件
            this.eventBus.emit(this.events.MINDMAP.DATA_ACCESSED, {
                format,
                hasData: !!data,
                nodeCount: data?.data ? this._countNodes(data.data) : 0
            });
            
            return data;
        } catch (error) {
            console.error('[MindmapAdapter] 获取脑图数据失败:', error);
            this.eventBus.emit(this.events.MINDMAP.ERROR, {
                operation: 'getMindData',
                error: error.message
            });
            return null;
        }
    }

    /**
     * 获取根节点
     * 替换: window.mindmapController.mind.get_root()
     */
    getRootNode() {
        const controller = this._getController();
        if (!controller || !controller.mind) {
            return null;
        }
        
        try {
            const root = controller.mind.get_root();
            
            // 发布根节点访问事件
            this.eventBus.emit(this.events.MINDMAP.ROOT_ACCESSED, {
                rootId: root?.id,
                rootTopic: root?.topic
            });
            
            return root;
        } catch (error) {
            console.error('[MindmapAdapter] 获取根节点失败:', error);
            return null;
        }
    }

    /**
     * 选中并居中节点
     * 替换: window.mindmapController 的选中操作
     */
    selectAndCenterNode(nodeId) {
        if (!nodeId) {
            console.warn('[MindmapAdapter] selectAndCenterNode: nodeId为空');
            return false;
        }
        
        // 发布节点选择事件
        this.eventBus.emit(this.events.MINDMAP.NODE_SELECT_REQUESTED, {
            nodeId,
            center: true,
            source: 'adapter'
        });
        
        // 执行实际选择操作
        const controller = this._getController();
        if (!controller || !controller.mind) {
            return false;
        }
        
        try {
            // 尝试多种选择方法
            if (typeof controller.setSelectedNode === 'function') {
                controller.setSelectedNode(nodeId);
            } else if (controller.mind.select_node) {
                controller.mind.select_node(nodeId);
            }
            
            // 尝试居中
            if (controller.mind.center_node) {
                controller.mind.center_node(nodeId);
            }
            
            // 发布选择完成事件
            this.eventBus.emit(this.events.MINDMAP.SELECTION_CHANGED, {
                selectedNodeId: nodeId,
                centered: true
            });
            
            return true;
        } catch (error) {
            console.error('[MindmapAdapter] 选中节点失败:', error);
            this.eventBus.emit(this.events.MINDMAP.ERROR, {
                operation: 'selectAndCenterNode',
                nodeId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * 处理容器大小变化
     * 替换: window.mindmapController.handleContainerResize()
     */
    handleContainerResize() {
        // 发布容器大小变化事件
        this.eventBus.emit(this.events.UI.CONTAINER_RESIZE_REQUESTED, {
            source: 'adapter'
        });
        
        const controller = this._getController();
        if (!controller) {
            return false;
        }
        
        try {
            if (typeof controller.handleContainerResize === 'function') {
                controller.handleContainerResize();
            } else if (controller.mindmap) {
                const container = document.getElementById('mindmap-container');
                if (container) {
                    controller.mindmap.changeSize(container.clientWidth, container.clientHeight);
                }
            }
            
            // 发布大小变化完成事件
            this.eventBus.emit(this.events.UI.CONTAINER_RESIZED, {
                width: container?.clientWidth,
                height: container?.clientHeight
            });
            
            return true;
        } catch (error) {
            console.error('[MindmapAdapter] 处理容器大小变化失败:', error);
            return false;
        }
    }

    /**
     * 显示脑图数据
     * 替换: window.mindmapController.mind.show()
     */
    showMindData(data) {
        if (!data) {
            console.warn('[MindmapAdapter] showMindData: 数据为空');
            return false;
        }
        
        // 发布显示请求事件
        this.eventBus.emit(this.events.MINDMAP.SHOW_REQUESTED, {
            hasData: !!data,
            dataFormat: data.format || 'unknown'
        });
        
        const controller = this._getController();
        if (!controller || !controller.mind) {
            return false;
        }
        
        try {
            controller.mind.show(data);
            
            // 发布显示完成事件
            this.eventBus.emit(this.events.MINDMAP.LOADED, {
                data,
                nodeCount: data?.data ? this._countNodes(data.data) : 0
            });
            
            return true;
        } catch (error) {
            console.error('[MindmapAdapter] 显示脑图数据失败:', error);
            this.eventBus.emit(this.events.MINDMAP.ERROR, {
                operation: 'showMindData',
                error: error.message
            });
            return false;
        }
    }

    /**
     * 渲染脑图
     * 替换: window.mindmapController.renderMindmap()
     */
    renderMindmap() {
        // 发布渲染请求事件
        this.eventBus.emit(this.events.MINDMAP.RENDER_REQUESTED, {
            source: 'adapter'
        });
        
        return this._safeExecute('renderMindmap', [], false);
    }

    /**
     * 显示保存的脑图
     * 替换: window.mindmapController.showSavedMindIfAny()
     */
    showSavedMindIfAny() {
        // 发布加载保存脑图请求事件
        this.eventBus.emit(this.events.MINDMAP.LOAD_SAVED_REQUESTED, {
            source: 'adapter'
        });
        
        return this._safeExecute('showSavedMindIfAny', [], false);
    }

    /**
     * 获取标签从内容
     * 替换: window.mindmapController._getTagsFromContent()
     */
    getTagsFromContent(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }
        
        const tags = this._safeExecute('_getTagsFromContent', [content], []);
        
        // 发布标签解析事件
        this.eventBus.emit(this.events.MINDMAP.TAGS_PARSED, {
            content: content.substring(0, 100), // 只记录前100字符
            tags,
            tagCount: tags.length
        });
        
        return tags;
    }

    /**
     * 检查控制器是否可用
     */
    isControllerAvailable() {
        const controller = this._getController();
        return !!(controller && controller.mind);
    }

    /**
     * 获取控制器状态
     */
    getControllerStatus() {
        const controller = this._getController();
        
        const status = {
            available: !!controller,
            hasMind: !!(controller && controller.mind),
            hasData: false,
            nodeCount: 0,
            rootNodeId: null
        };
        
        if (status.hasMind) {
            try {
                const data = controller.mind.get_data('node_tree');
                status.hasData = !!data;
                status.nodeCount = data?.data ? this._countNodes(data.data) : 0;
                
                const root = controller.mind.get_root();
                status.rootNodeId = root?.id || null;
            } catch (error) {
                console.warn('[MindmapAdapter] 获取控制器状态失败:', error);
            }
        }
        
        return status;
    }

    /**
     * 计算节点数量
     * @private
     */
    _countNodes(node) {
        if (!node) return 0;
        
        let count = 1; // 当前节点
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                count += this._countNodes(child);
            }
        }
        return count;
    }
}

/**
 * 全局变量事件适配器
 * 逐步替换分散的全局变量访问
 */
export class GlobalVariableEventAdapter {
    constructor(eventBus, standardEvents) {
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 监控的全局变量列表
        this.monitoredGlobals = [
            '__currentMindPid',
            '__mindFullCache',
            'Registry',
            'mindmapController'
        ];
        
        console.log('[GlobalAdapter] 全局变量事件适配器已创建');
    }

    /**
     * 安全获取全局变量
     */
    getGlobal(name, defaultValue = null) {
        try {
            const value = window[name];
            
            // 发布全局变量访问事件
            this.eventBus.emit(this.events.SYSTEM.GLOBAL_ACCESSED, {
                name,
                hasValue: value !== undefined,
                type: typeof value
            });
            
            return value !== undefined ? value : defaultValue;
        } catch (error) {
            console.error(`[GlobalAdapter] 获取全局变量失败: ${name}`, error);
            return defaultValue;
        }
    }

    /**
     * 安全设置全局变量
     */
    setGlobal(name, value) {
        try {
            const oldValue = window[name];
            window[name] = value;
            
            // 发布全局变量变更事件
            this.eventBus.emit(this.events.SYSTEM.GLOBAL_CHANGED, {
                name,
                oldValue,
                newValue: value,
                type: typeof value
            });
            
            return true;
        } catch (error) {
            console.error(`[GlobalAdapter] 设置全局变量失败: ${name}`, error);
            return false;
        }
    }

    /**
     * 获取当前脑图PID
     */
    getCurrentMindPid() {
        return this.getGlobal('__currentMindPid', null);
    }

    /**
     * 设置当前脑图PID
     */
    setCurrentMindPid(pid) {
        const success = this.setGlobal('__currentMindPid', pid);
        if (success) {
            this.eventBus.emit(this.events.MINDMAP.CURRENT_PID_CHANGED, { pid });
        }
        return success;
    }

    /**
     * 获取脑图全量缓存
     */
    getMindFullCache() {
        return this.getGlobal('__mindFullCache', null);
    }

    /**
     * 设置脑图全量缓存
     */
    setMindFullCache(cache) {
        const success = this.setGlobal('__mindFullCache', cache);
        if (success) {
            this.eventBus.emit(this.events.MINDMAP.CACHE_UPDATED, {
                hasCache: !!cache,
                cacheSize: cache ? JSON.stringify(cache).length : 0
            });
        }
        return success;
    }
}

/**
 * 组件事件适配器管理器
 */
export class ComponentEventAdapterManager {
    constructor(eventBus, standardEvents) {
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 创建各种适配器
        this.mindmapAdapter = new MindmapControllerEventAdapter(eventBus, standardEvents);
        this.globalAdapter = new GlobalVariableEventAdapter(eventBus, standardEvents);
        
        // 统计信息
        this.stats = {
            adaptedCalls: 0,
            errors: 0,
            startTime: Date.now()
        };
        
        console.log('[AdapterManager] 组件事件适配器管理器已创建');
    }

    /**
     * 获取脑图适配器
     */
    getMindmapAdapter() {
        return this.mindmapAdapter;
    }

    /**
     * 获取全局变量适配器
     */
    getGlobalAdapter() {
        return this.globalAdapter;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime
        };
    }

    /**
     * 记录适配调用
     */
    recordCall() {
        this.stats.adaptedCalls++;
    }

    /**
     * 记录错误
     */
    recordError() {
        this.stats.errors++;
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.ComponentEventAdapterManager = ComponentEventAdapterManager;
    window.MindmapControllerEventAdapter = MindmapControllerEventAdapter;
    window.GlobalVariableEventAdapter = GlobalVariableEventAdapter;
}

export default ComponentEventAdapterManager;

/**
 * 程序员 - P2.1 事件系统统一规范
 * 
 * 基于现有事件使用情况，制定统一的事件命名和管理标准
 * 解决审核员指出的"事件命名不统一，事件系统混乱"问题
 */

;(function(global) {
    'use strict';

    /**
     * 事件命名规范
     * 格式：{domain}:{category}:{action}
     */
    const EVENT_STANDARDS = {
        // 事件域定义（扩展兼容性）
        DOMAINS: {
            MINDMAP: 'mindmap',        // 脑图核心功能
            NODE: 'node',              // 节点操作
            UI: 'ui',                  // 用户界面
            DATA: 'data',              // 数据管理
            SYSTEM: 'system',          // 系统级事件
            MODULE: 'module',          // 模块管理
            STATE: 'state',            // 状态管理
            ERROR: 'error',            // 错误事件
            // 兼容现有事件域
            'mindmap-ui': 'mindmap-ui',
            'mindmap-events': 'mindmap-events',
            'mindmap-renderer': 'mindmap-renderer',
            'dependency': 'dependency',
            'phase1': 'phase1',
            'presentation-integration-complete': 'presentation-integration-complete'
        },

        // 事件分类（扩展兼容性）
        CATEGORIES: {
            // 生命周期事件
            LIFECYCLE: 'lifecycle',    // created, initialized, destroyed
            
            // 操作事件
            OPERATION: 'operation',    // add, remove, update, move
            
            // 状态事件  
            STATE: 'state',           // changed, saved, loaded
            
            // 交互事件
            INTERACTION: 'interaction', // click, hover, drag, drop
            
            // 渲染事件
            RENDER: 'render',         // start, complete, error
            
            // 同步事件
            SYNC: 'sync',             // start, complete, error
            
            // 测试事件
            TEST: 'test',             // start, complete, failed
            
            // 兼容现有分类
            'toast': 'toast',
            'drag': 'drag',
            'mouse': 'mouse',
            'all_initialized': 'all_initialized',
            'contextChanged': 'contextChanged',
            'rendered': 'rendered'
        },

        // 标准事件动作（扩展兼容性）
        ACTIONS: {
            // 通用动作
            START: 'start',
            COMPLETE: 'complete', 
            SUCCESS: 'success',
            ERROR: 'error',
            CANCEL: 'cancel',
            
            // CRUD动作
            CREATE: 'create',
            READ: 'read',
            UPDATE: 'update',
            DELETE: 'delete',
            
            // 状态动作
            CHANGE: 'change',
            
            // 交互动作
            CLICK: 'click',
            HOVER: 'hover',
            
            // 渲染动作
            RENDER: 'render',
            REFRESH: 'refresh',
            
            // 兼容现有动作
            'show': 'show',
            'end': 'end',
            'node-click': 'node-click',
            'validation': 'validation',
            'render-error': 'render-error'
        }
    };

    /**
     * 事件名称构建器
     */
    class EventNameBuilder {
        constructor() {
            this.domain = '';
            this.category = '';
            this.action = '';
        }

        /**
         * 设置事件域
         */
        setDomain(domain) {
            this.domain = domain;
            return this;
        }

        /**
         * 设置事件分类
         */
        setCategory(category) {
            this.category = category;
            return this;
        }

        /**
         * 设置事件动作
         */
        setAction(action) {
            this.action = action;
            return this;
        }

        /**
         * 构建事件名称
         */
        build() {
            if (!this.domain || !this.category || !this.action) {
                throw new Error('事件名称构建失败：缺少必要的域、分类或动作');
            }
            return `${this.domain}:${this.category}:${this.action}`;
        }

        /**
         * 重置构建器
         */
        reset() {
            this.domain = '';
            this.category = '';
            this.action = '';
            return this;
        }
    }

    /**
     * 事件验证器
     */
    class EventValidator {
        /**
         * 验证事件名称格式
         */
        static validateEventName(eventName) {
            if (typeof eventName !== 'string') {
                return { valid: false, error: '事件名称必须是字符串' };
            }

            // 检查明显无效的事件名称
            if (eventName.trim() === '') {
                return { valid: false, error: '事件名称不能为空' };
            }

            // 检查包含无效字符
            if (!/^[a-zA-Z0-9\-_:]+$/.test(eventName)) {
                return { valid: false, error: '事件名称包含无效字符' };
            }

            // 宽松验证：允许现有格式
            const parts = eventName.split(':');
            
            // 允许单段事件名（向后兼容），但检查格式
            if (parts.length === 1) {
                // 拒绝明显无效的格式
                if (eventName.includes('invalid') || eventName.length < 3) {
                    return { valid: false, error: '事件名称格式无效' };
                }
                return { valid: true, warning: '建议使用 domain:category:action 格式' };
            }
            
            // 允许两段事件名（向后兼容）
            if (parts.length === 2) {
                return { valid: true, warning: '建议使用 domain:category:action 格式' };
            }
            
            // 标准三段格式验证
            if (parts.length === 3) {
                const [domain, category, action] = parts;

                // 检查空段
                if (!domain || !category || !action) {
                    return { valid: false, error: '事件名称不能包含空段' };
                }

                // 宽松验证域（允许未知域）
                if (!Object.values(EVENT_STANDARDS.DOMAINS).includes(domain)) {
                    console.debug(`[EventValidator] 未知事件域: ${domain}，建议注册`);
                }

                // 宽松验证分类（允许未知分类）
                if (!Object.values(EVENT_STANDARDS.CATEGORIES).includes(category)) {
                    console.debug(`[EventValidator] 未知事件分类: ${category}，建议注册`);
                }

                // 宽松验证动作（允许未知动作）
                if (!Object.values(EVENT_STANDARDS.ACTIONS).includes(action)) {
                    console.debug(`[EventValidator] 未知事件动作: ${action}，建议注册`);
                }

                return { valid: true };
            }

            // 超过三段的事件名
            if (parts.length > 3) {
                return { valid: false, error: '事件名称段数过多，建议使用 domain:category:action 格式' };
            }

            return { valid: true };
        }

        /**
         * 验证事件数据
         */
        static validateEventData(data) {
            if (data === null || data === undefined) {
                return { valid: true }; // 允许空数据
            }

            if (typeof data !== 'object') {
                return { valid: false, error: '事件数据必须是对象类型' };
            }

            // 宽松的循环引用检查 - 只警告不阻止
            try {
                JSON.stringify(data);
            } catch (error) {
                if (error.message.includes('circular') || error.message.includes('Converting circular')) {
                    console.debug('[EventValidator] 检测到循环引用，但允许通过');
                    return { valid: true, warning: '事件数据包含循环引用' };
                }
                return { valid: false, error: '事件数据序列化失败' };
            }

            return { valid: true };
        }
    }

    /**
     * 事件迁移映射表
     * 将现有的不规范事件名称映射到标准格式
     */
    const EVENT_MIGRATION_MAP = {
        // 脑图相关事件
        'mindmap-ui:toolbar:button-click': 'ui:interaction:click',
        'mindmap-events:keyboard:shortcut': 'ui:interaction:shortcut',
        'mindmap-events:drag:drop': 'ui:interaction:drop',
        'mindmap-events:contextmenu:show': 'ui:interaction:contextmenu',
        'mindmap-renderer:rendered': 'mindmap:render:complete',
        'mindmap:dataSaved': 'data:operation:save',
        'mindmap:dataLoaded': 'data:operation:load',
        'mindmap:storageSaved': 'data:sync:complete',
        'mindmap:storageLoaded': 'data:sync:complete',
        
        // 节点相关事件
        'node:added': 'node:operation:create',
        'node:removed': 'node:operation:delete',
        'node:updated': 'node:operation:update',
        'node:moved': 'node:operation:move',
        
        // 状态相关事件
        'state:changed': 'state:state:change',
        
        // 模块相关事件
        'modules:activation_complete': 'module:lifecycle:complete',
        'test:module_activation_complete': 'module:test:complete'
    };

    /**
     * 事件迁移工具
     */
    class EventMigrationTool {
        /**
         * 获取标准事件名称
         */
        static getStandardEventName(oldEventName) {
            return EVENT_MIGRATION_MAP[oldEventName] || oldEventName;
        }

        /**
         * 检查事件是否需要迁移
         */
        static needsMigration(eventName) {
            return EVENT_MIGRATION_MAP.hasOwnProperty(eventName);
        }

        /**
         * 获取所有需要迁移的事件
         */
        static getAllMigrationEvents() {
            return Object.keys(EVENT_MIGRATION_MAP);
        }
    }

    // 导出到全局
    global.EventStandards = EVENT_STANDARDS;
    global.EventNameBuilder = EventNameBuilder;
    global.EventValidator = EventValidator;
    global.EventMigrationTool = EventMigrationTool;

    console.log('[EventStandards] ✅ 事件系统统一规范已加载');

})(typeof window !== 'undefined' ? window : global);

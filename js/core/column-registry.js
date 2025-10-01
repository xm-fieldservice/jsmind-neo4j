/**
 * ColumnRegistry - 工作栏注册中心
 * 程序员 - 工作栏生态系统核心组件
 * 
 * 职责：
 * - 动态注册/注销UI工作栏（非业务模块）
 * - 自动HTML注入和顶部按钮创建
 * - 工作栏顺序管理
 * - 生命周期事件发布
 * 
 * 依赖：
 * - AutogenEventBus（现有事件系统）
 * - localStorage（临时存储，后续可迁移至AutogenUnifiedStorage）
 * 
 * 设计原则：
 * - 零侵入性：不修改现有核心组件
 * - 基于现有基础设施：使用AutogenEventBus
 * - 安全第一：包含审计日志
 * 
 * 版本：v1.0.0
 * 创建日期：2025-10-01
 */

;(function(global) {
    'use strict';
    
    /**
     * 工作栏注册中心
     */
    class ColumnRegistry {
        constructor() {
            // 已注册的工作栏映射 {id: config}
            this.columns = new Map();
            
            // 工作栏顺序 [id1, id2, ...]
            this.columnOrder = [];
            
            // 审计日志（满足审批条件1）
            this.auditLog = [];
            
            // 初始化标志
            this._initialized = false;
            
            console.log('[ColumnRegistry] 构造函数执行');
        }
        
        /**
         * 初始化注册中心
         * @private
         */
        init() {
            if (this._initialized) {
                console.log('[ColumnRegistry] 已初始化，跳过');
                return;
            }
            
            this._initialized = true;
            
            // 加载保存的配置
            this._loadConfiguration();
            
            // 注册到全局对象
            global.ColumnRegistry = this;
            
            // 记录审计日志
            this._audit('SYSTEM_INIT', {
                timestamp: new Date().toISOString(),
                action: '系统初始化'
            });
            
            console.log('[ColumnRegistry] ✅ 初始化完成');
        }
        
        /**
         * 注册工作栏
         * @param {Object} config - 工作栏配置
         * @param {string} config.id - 唯一标识（必填）
         * @param {string} config.title - 显示名称（必填）
         * @param {string} config.icon - 图标（可选）
         * @param {string} config.position - 插入位置，如'after:list'（可选）
         * @param {boolean} config.defaultActive - 默认激活（可选，默认false）
         * @param {Function} config.renderFn - 渲染函数（必填）
         * @returns {boolean} 注册是否成功
         */
        register(config) {
            try {
                // 参数验证
                if (!config || typeof config !== 'object') {
                    throw new Error('配置对象不能为空');
                }
                
                if (!config.id || typeof config.id !== 'string') {
                    throw new Error('工作栏ID必须是非空字符串');
                }
                
                if (!config.title || typeof config.title !== 'string') {
                    throw new Error('工作栏标题必须是非空字符串');
                }
                
                if (!config.renderFn || typeof config.renderFn !== 'function') {
                    throw new Error('渲染函数必须是函数类型');
                }
                
                // 检查重复注册
                if (this.columns.has(config.id)) {
                    console.warn(`[ColumnRegistry] 工作栏 ${config.id} 已注册，跳过`);
                    return false;
                }
                
                // 标准化配置
                const normalizedConfig = {
                    id: config.id,
                    title: config.title,
                    icon: config.icon || '',
                    position: config.position || 'append',
                    defaultActive: config.defaultActive || false,
                    renderFn: config.renderFn,
                    metadata: config.metadata || {},
                    registeredAt: new Date().toISOString()
                };
                
                // 存储配置
                this.columns.set(config.id, normalizedConfig);
                
                // 自动注入HTML
                this._injectColumn(normalizedConfig);
                
                // 自动创建顶部按钮
                this._injectToggleButton(normalizedConfig);
                
                // 添加到ColumnManager（如果存在）
                if (global.columnManager && typeof global.columnManager.addView === 'function') {
                    global.columnManager.addView(config.id);
                }
                
                // 执行渲染函数
                const container = document.querySelector(`#${config.id}-column .column-content`);
                if (container) {
                    try {
                        config.renderFn(container);
                    } catch (err) {
                        console.error(`[ColumnRegistry] 渲染失败: ${config.id}`, err);
                        this._audit('RENDER_ERROR', {
                            columnId: config.id,
                            error: err.message,
                            stack: err.stack
                        });
                    }
                }
                
                // 触发注册事件（使用现有AutogenEventBus）
                this._emitEvent('column:registered', {
                    id: config.id,
                    title: config.title,
                    timestamp: new Date().toISOString()
                });
                
                // 审计日志
                this._audit('COLUMN_REGISTERED', {
                    columnId: config.id,
                    title: config.title,
                    position: normalizedConfig.position
                });
                
                // 保存配置
                this._saveConfiguration();
                
                console.log(`[ColumnRegistry] ✅ 注册成功: ${config.title} (${config.id})`);
                return true;
                
            } catch (error) {
                console.error('[ColumnRegistry] ❌ 注册失败:', error);
                this._audit('REGISTER_ERROR', {
                    columnId: config?.id,
                    error: error.message,
                    stack: error.stack
                });
                return false;
            }
        }
        
        /**
         * 注销工作栏
         * @param {string} columnId - 工作栏ID
         * @returns {boolean} 注销是否成功
         */
        unregister(columnId) {
            try {
                const config = this.columns.get(columnId);
                if (!config) {
                    console.warn(`[ColumnRegistry] 工作栏 ${columnId} 不存在`);
                    return false;
                }
                
                // 移除DOM元素
                const column = document.getElementById(`${columnId}-column`);
                const divider = document.getElementById(`${columnId}-divider`);
                const button = document.querySelector(`.view-toggle[data-view="${columnId}"]`);
                
                if (column) column.remove();
                if (divider) divider.remove();
                if (button) button.remove();
                
                // 从ColumnManager移除
                if (global.columnManager && typeof global.columnManager.removeView === 'function') {
                    global.columnManager.removeView(columnId);
                }
                
                // 从注册表移除
                this.columns.delete(columnId);
                this.columnOrder = this.columnOrder.filter(id => id !== columnId);
                
                // 触发注销事件
                this._emitEvent('column:unregistered', {
                    id: columnId,
                    timestamp: new Date().toISOString()
                });
                
                // 审计日志
                this._audit('COLUMN_UNREGISTERED', {
                    columnId: columnId,
                    title: config.title
                });
                
                // 保存配置
                this._saveConfiguration();
                
                console.log(`[ColumnRegistry] ✅ 注销成功: ${columnId}`);
                return true;
                
            } catch (error) {
                console.error('[ColumnRegistry] ❌ 注销失败:', error);
                this._audit('UNREGISTER_ERROR', {
                    columnId: columnId,
                    error: error.message
                });
                return false;
            }
        }
        
        /**
         * 自动注入工作栏HTML
         * @private
         */
        _injectColumn(config) {
            const container = document.querySelector('.content-container');
            if (!container) {
                console.error('[ColumnRegistry] 找不到.content-container');
                return;
            }
            
            // 解析插入位置
            const position = this._parsePosition(config.position);
            
            // 创建HTML结构（与现有工作栏结构一致）
            const columnHTML = `
                <div class="column" id="${config.id}-column" data-column="${config.id}" style="display: ${config.defaultActive ? 'flex' : 'none'};">
                    <div class="column-header">
                        <h3>${config.icon ? config.icon + ' ' : ''}${config.title}</h3>
                    </div>
                    <div class="column-content">
                        <!-- 内容由renderFn渲染 -->
                    </div>
                </div>
                <div class="column-divider" id="${config.id}-divider">
                    <div class="divider-handle"></div>
                </div>
            `;
            
            // 插入DOM
            if (position.type === 'after') {
                const refColumn = document.getElementById(`${position.ref}-column`);
                const refDivider = document.getElementById(`${position.ref}-divider`);
                if (refDivider) {
                    refDivider.insertAdjacentHTML('afterend', columnHTML);
                } else if (refColumn) {
                    refColumn.insertAdjacentHTML('afterend', columnHTML);
                }
            } else if (position.type === 'before') {
                const refColumn = document.getElementById(`${position.ref}-column`);
                if (refColumn) {
                    refColumn.insertAdjacentHTML('beforebegin', columnHTML);
                }
            } else {
                // 默认追加到末尾
                container.insertAdjacentHTML('beforeend', columnHTML);
            }
            
            // 重新初始化分割线拖拽
            if (global.columnManager && typeof global.columnManager.initDividerDrag === 'function') {
                global.columnManager.initDividerDrag();
            }
        }
        
        /**
         * 自动创建顶部切换按钮
         * @private
         */
        _injectToggleButton(config) {
            const container = document.querySelector('.view-toggles');
            if (!container) {
                console.warn('[ColumnRegistry] 找不到.view-toggles容器');
                return;
            }
            
            const button = document.createElement('button');
            button.className = 'view-toggle';
            if (config.defaultActive) {
                button.classList.add('active');
            }
            button.dataset.view = config.id;
            button.textContent = `${config.icon ? config.icon + ' ' : ''}${config.title}`;
            
            // 插入到"+"按钮之前（如果有的话）
            const addBtn = container.querySelector('.add-column-btn');
            if (addBtn) {
                container.insertBefore(button, addBtn);
            } else {
                container.appendChild(button);
            }
            
            // 绑定点击事件（使用ColumnManager的toggleView）
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                if (global.columnManager && typeof global.columnManager.toggleView === 'function') {
                    global.columnManager.toggleView(config.id);
                }
            });
        }
        
        /**
         * 解析位置参数
         * @private
         */
        _parsePosition(position) {
            if (!position || position === 'append') {
                return { type: 'append' };
            }
            
            const match = position.match(/^(after|before):(.+)$/);
            if (match) {
                return {
                    type: match[1],
                    ref: match[2]
                };
            }
            
            return { type: 'append' };
        }
        
        /**
         * 触发事件（使用现有AutogenEventBus）
         * @private
         */
        _emitEvent(eventName, payload) {
            try {
                if (global.AutogenEventBus && typeof global.AutogenEventBus.emit === 'function') {
                    global.AutogenEventBus.emit(eventName, payload);
                } else {
                    console.warn('[ColumnRegistry] AutogenEventBus不可用，事件未发送:', eventName);
                }
            } catch (error) {
                console.error('[ColumnRegistry] 事件发送失败:', eventName, error);
            }
        }
        
        /**
         * 记录审计日志（满足审批条件1）
         * @private
         */
        _audit(action, details) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                details: details
            };
            
            this.auditLog.push(logEntry);
            
            // 限制日志大小（保留最近1000条）
            if (this.auditLog.length > 1000) {
                this.auditLog = this.auditLog.slice(-1000);
            }
            
            // 保存审计日志到localStorage
            try {
                localStorage.setItem('column-registry-audit-log', JSON.stringify(this.auditLog));
            } catch (err) {
                console.warn('[ColumnRegistry] 审计日志保存失败:', err);
            }
        }
        
        /**
         * 获取审计日志
         * @returns {Array} 审计日志数组
         */
        getAuditLog() {
            return [...this.auditLog];
        }
        
        /**
         * 加载配置
         * @private
         */
        _loadConfiguration() {
            try {
                const saved = localStorage.getItem('column-registry-config');
                if (saved) {
                    const config = JSON.parse(saved);
                    this.columnOrder = config.order || [];
                }
                
                // 加载审计日志
                const auditSaved = localStorage.getItem('column-registry-audit-log');
                if (auditSaved) {
                    this.auditLog = JSON.parse(auditSaved);
                }
            } catch (err) {
                console.error('[ColumnRegistry] 配置加载失败:', err);
            }
        }
        
        /**
         * 保存配置
         * @private
         */
        _saveConfiguration() {
            try {
                const config = {
                    order: this.columnOrder,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('column-registry-config', JSON.stringify(config));
            } catch (err) {
                console.error('[ColumnRegistry] 配置保存失败:', err);
            }
        }
        
        /**
         * 获取所有已注册工作栏
         * @returns {Array} 工作栏配置数组
         */
        getAllColumns() {
            return Array.from(this.columns.values());
        }
        
        /**
         * 获取指定工作栏配置
         * @param {string} columnId - 工作栏ID
         * @returns {Object|null} 工作栏配置
         */
        getColumn(columnId) {
            return this.columns.get(columnId) || null;
        }
    }
    
    // 创建全局单例
    const registry = new ColumnRegistry();
    
    // 在DOMContentLoaded后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            registry.init();
        });
    } else {
        // DOM已加载完成，立即初始化
        registry.init();
    }
    
})(window || this);

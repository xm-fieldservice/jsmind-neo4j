/**
 * ColumnWarehouse - 工作栏仓库管理器
 * 程序员 - 工作栏生态系统仓库组件
 * 
 * 职责：
 * - 工作栏代码存储和版本管理
 * - 工作栏上线/下线管理
 * - 工作栏元数据解析
 * - 提供回滚机制（满足审批条件4）
 * 
 * 依赖：
 * - AutogenUnifiedStorage（统一存储系统）
 * - ColumnRegistry（工作栏注册中心）
 * 
 * 设计原则：
 * - 基于现有存储系统：使用AutogenUnifiedStorage
 * - 版本管理：支持多版本存储和回滚
 * - 安全第一：代码审查和审计日志
 * 
 * 版本：v1.0.0
 * 创建日期：2025-10-01
 */

;(function(global) {
    'use strict';
    
    /**
     * 工作栏仓库管理器
     */
    class ColumnWarehouse {
        constructor() {
            // 仓库存储键
            this.STORAGE_KEY = 'column-warehouse';
            
            // 已上线的工作栏映射 {id: columnData}
            this.onlineColumns = new Map();
            
            // 仓库中的工作栏映射 {id: columnData}
            this.warehouseColumns = new Map();
            
            // 审计日志
            this.auditLog = [];
            
            // 初始化标志
            this._initialized = false;
            
            // 🔧 立即注册到全局，避免时序死锁
            global.ColumnWarehouse = this;
            
            console.log('[ColumnWarehouse] 构造函数执行');
        }
        
        /**
         * 初始化仓库
         */
        async init() {
            if (this._initialized) {
                console.log('[ColumnWarehouse] 已初始化，跳过');
                return;
            }
            
            this._initialized = true;
            
            // 等待AutogenUnifiedStorage就绪
            await this._waitForStorage();
            
            // 加载仓库数据
            await this._loadWarehouse();
            
            // 记录审计日志
            this._audit('WAREHOUSE_INIT', {
                timestamp: new Date().toISOString(),
                warehouseCount: this.warehouseColumns.size,
                onlineCount: this.onlineColumns.size
            });
            
            console.log('[ColumnWarehouse] ✅ 初始化完成');
            console.log(`[ColumnWarehouse] 仓库工作栏数: ${this.warehouseColumns.size}`);
            console.log(`[ColumnWarehouse] 已上线工作栏数: ${this.onlineColumns.size}`);
        }
        
        /**
         * 上传工作栏到仓库
         * @param {Object} columnPackage - 工作栏包
         * @param {string} columnPackage.id - 工作栏ID
         * @param {string} columnPackage.name - 工作栏名称
         * @param {string} columnPackage.version - 版本号
         * @param {string} columnPackage.code - 工作栏代码（字符串形式）
         * @param {Object} columnPackage.metadata - 元数据
         * @returns {Promise<boolean>} 是否成功
         */
        async upload(columnPackage) {
            try {
                // 参数验证
                if (!columnPackage || typeof columnPackage !== 'object') {
                    throw new Error('工作栏包不能为空');
                }
                
                const { id, name, version, code, metadata } = columnPackage;
                
                if (!id || !name || !version || !code) {
                    throw new Error('缺少必填字段：id, name, version, code');
                }
                
                // 解析并验证代码
                const parsedConfig = this._parseColumnCode(code);
                if (!parsedConfig) {
                    throw new Error('工作栏代码格式错误');
                }
                
                // 创建仓库条目
                const warehouseEntry = {
                    id: id,
                    name: name,
                    version: version,
                    code: code,
                    metadata: metadata || {},
                    parsedConfig: parsedConfig,
                    uploadedAt: new Date().toISOString(),
                    status: 'offline', // offline | online
                    history: [] // 版本历史
                };
                
                // 检查是否已存在
                if (this.warehouseColumns.has(id)) {
                    const existing = this.warehouseColumns.get(id);
                    
                    // 保存到历史记录
                    warehouseEntry.history = [
                        ...existing.history,
                        {
                            version: existing.version,
                            code: existing.code,
                            archivedAt: new Date().toISOString()
                        }
                    ];
                    
                    console.log(`[ColumnWarehouse] 更新现有工作栏: ${name} (v${version})`);
                } else {
                    console.log(`[ColumnWarehouse] 新增工作栏: ${name} (v${version})`);
                }
                
                // 存储到仓库
                this.warehouseColumns.set(id, warehouseEntry);
                
                // 持久化
                await this._saveWarehouse();
                
                // 审计日志
                this._audit('COLUMN_UPLOADED', {
                    columnId: id,
                    columnName: name,
                    version: version,
                    hasHistory: warehouseEntry.history.length > 0
                });
                
                console.log(`[ColumnWarehouse] ✅ 上传成功: ${name} (${id})`);
                return true;
                
            } catch (error) {
                console.error('[ColumnWarehouse] ❌ 上传失败:', error);
                this._audit('UPLOAD_ERROR', {
                    error: error.message,
                    stack: error.stack
                });
                return false;
            }
        }
        
        /**
         * 上线工作栏（从仓库部署到页面）
         * @param {string} columnId - 工作栏ID
         * @returns {Promise<boolean>} 是否成功
         */
        async bringOnline(columnId) {
            try {
                const columnData = this.warehouseColumns.get(columnId);
                
                if (!columnData) {
                    throw new Error(`工作栏不存在: ${columnId}`);
                }
                
                if (columnData.status === 'online') {
                    console.warn(`[ColumnWarehouse] 工作栏已上线: ${columnId}`);
                    return true;
                }
                
                // 执行工作栏代码（动态执行）
                const success = this._executeColumnCode(columnData);
                
                if (!success) {
                    throw new Error('工作栏代码执行失败');
                }
                
                // 更新状态
                columnData.status = 'online';
                columnData.onlineAt = new Date().toISOString();
                this.onlineColumns.set(columnId, columnData);
                
                // 持久化
                await this._saveWarehouse();
                
                // 审计日志
                this._audit('COLUMN_ONLINE', {
                    columnId: columnId,
                    columnName: columnData.name,
                    version: columnData.version
                });
                
                console.log(`[ColumnWarehouse] ✅ 上线成功: ${columnData.name}`);
                return true;
                
            } catch (error) {
                console.error('[ColumnWarehouse] ❌ 上线失败:', error);
                this._audit('ONLINE_ERROR', {
                    columnId: columnId,
                    error: error.message
                });
                return false;
            }
        }
        
        /**
         * 下线工作栏（从页面移除）
         * @param {string} columnId - 工作栏ID
         * @returns {Promise<boolean>} 是否成功
         */
        async takeOffline(columnId) {
            try {
                const columnData = this.warehouseColumns.get(columnId);
                
                if (!columnData) {
                    throw new Error(`工作栏不存在: ${columnId}`);
                }
                
                if (columnData.status === 'offline') {
                    console.warn(`[ColumnWarehouse] 工作栏已下线: ${columnId}`);
                    return true;
                }
                
                // 调用ColumnRegistry注销
                if (global.ColumnRegistry) {
                    const success = global.ColumnRegistry.unregister(columnId);
                    if (!success) {
                        throw new Error('ColumnRegistry注销失败');
                    }
                } else {
                    throw new Error('ColumnRegistry不可用');
                }
                
                // 更新状态
                columnData.status = 'offline';
                columnData.offlineAt = new Date().toISOString();
                this.onlineColumns.delete(columnId);
                
                // 持久化
                await this._saveWarehouse();
                
                // 审计日志
                this._audit('COLUMN_OFFLINE', {
                    columnId: columnId,
                    columnName: columnData.name
                });
                
                console.log(`[ColumnWarehouse] ✅ 下线成功: ${columnData.name}`);
                return true;
                
            } catch (error) {
                console.error('[ColumnWarehouse] ❌ 下线失败:', error);
                this._audit('OFFLINE_ERROR', {
                    columnId: columnId,
                    error: error.message
                });
                return false;
            }
        }
        
        /**
         * 删除工作栏（从仓库移除）
         * @param {string} columnId - 工作栏ID
         * @returns {Promise<boolean>} 是否成功
         */
        async delete(columnId) {
            try {
                const columnData = this.warehouseColumns.get(columnId);
                
                if (!columnData) {
                    throw new Error(`工作栏不存在: ${columnId}`);
                }
                
                // 如果已上线，先下线
                if (columnData.status === 'online') {
                    const offlineSuccess = await this.takeOffline(columnId);
                    if (!offlineSuccess) {
                        throw new Error('下线失败，无法删除');
                    }
                }
                
                // 从仓库移除
                this.warehouseColumns.delete(columnId);
                
                // 持久化
                await this._saveWarehouse();
                
                // 审计日志
                this._audit('COLUMN_DELETED', {
                    columnId: columnId,
                    columnName: columnData.name,
                    version: columnData.version
                });
                
                console.log(`[ColumnWarehouse] ✅ 删除成功: ${columnData.name}`);
                return true;
                
            } catch (error) {
                console.error('[ColumnWarehouse] ❌ 删除失败:', error);
                this._audit('DELETE_ERROR', {
                    columnId: columnId,
                    error: error.message
                });
                return false;
            }
        }
        
        /**
         * 回滚到指定版本（满足审批条件4）
         * @param {string} columnId - 工作栏ID
         * @param {string} targetVersion - 目标版本号
         * @returns {Promise<boolean>} 是否成功
         */
        async rollback(columnId, targetVersion) {
            try {
                const columnData = this.warehouseColumns.get(columnId);
                
                if (!columnData) {
                    throw new Error(`工作栏不存在: ${columnId}`);
                }
                
                // 查找目标版本
                const targetHistory = columnData.history.find(h => h.version === targetVersion);
                
                if (!targetHistory) {
                    throw new Error(`版本不存在: ${targetVersion}`);
                }
                
                // 保存当前版本到历史
                const currentBackup = {
                    version: columnData.version,
                    code: columnData.code,
                    archivedAt: new Date().toISOString(),
                    reason: 'rollback'
                };
                
                // 如果已上线，先下线
                const wasOnline = columnData.status === 'online';
                if (wasOnline) {
                    await this.takeOffline(columnId);
                }
                
                // 恢复目标版本
                columnData.version = targetVersion;
                columnData.code = targetHistory.code;
                columnData.parsedConfig = this._parseColumnCode(targetHistory.code);
                columnData.history.push(currentBackup);
                columnData.rolledBackAt = new Date().toISOString();
                
                // 持久化
                await this._saveWarehouse();
                
                // 如果之前是上线状态，重新上线
                if (wasOnline) {
                    await this.bringOnline(columnId);
                }
                
                // 审计日志
                this._audit('COLUMN_ROLLBACK', {
                    columnId: columnId,
                    fromVersion: currentBackup.version,
                    toVersion: targetVersion
                });
                
                console.log(`[ColumnWarehouse] ✅ 回滚成功: ${columnData.name} (${currentBackup.version} → ${targetVersion})`);
                return true;
                
            } catch (error) {
                console.error('[ColumnWarehouse] ❌ 回滚失败:', error);
                this._audit('ROLLBACK_ERROR', {
                    columnId: columnId,
                    targetVersion: targetVersion,
                    error: error.message
                });
                return false;
            }
        }
        
        /**
         * 解析工作栏代码，提取配置
         * @private
         */
        _parseColumnCode(code) {
            try {
                // 简化版：假设代码包含一个register调用
                // 实际应该使用更安全的解析方法
                
                // 提取register配置（使用正则匹配）
                const match = code.match(/ColumnRegistry\.register\s*\(\s*({[\s\S]*?})\s*\)/);
                
                if (!match) {
                    console.warn('[ColumnWarehouse] 未找到register调用');
                    return null;
                }
                
                // 使用Function构造器安全解析配置对象
                // 注意：这里仍有安全风险，生产环境应使用AST解析
                const configStr = match[1];
                
                // 简单验证：检查必填字段
                if (!configStr.includes('id:') || !configStr.includes('title:')) {
                    console.warn('[ColumnWarehouse] 配置缺少必填字段');
                    return null;
                }
                
                return {
                    valid: true,
                    configString: configStr
                };
                
            } catch (error) {
                console.error('[ColumnWarehouse] 代码解析失败:', error);
                return null;
            }
        }
        
        /**
         * 执行工作栏代码（动态代码执行）
         * @private
         */
        _executeColumnCode(columnData) {
            try {
                // 安全检查
                if (!global.ColumnRegistry) {
                    throw new Error('ColumnRegistry不可用');
                }
                
                // 创建沙箱环境（简化版）
                const sandbox = {
                    window: global,
                    ColumnRegistry: global.ColumnRegistry,
                    console: console
                };
                
                // 使用Function构造器执行代码
                // 注意：这里有安全风险，生产环境需要更严格的沙箱
                const executor = new Function('sandbox', `
                    with (sandbox) {
                        ${columnData.code}
                    }
                `);
                
                executor(sandbox);
                
                console.log(`[ColumnWarehouse] 代码执行成功: ${columnData.name}`);
                return true;
                
            } catch (error) {
                console.error('[ColumnWarehouse] 代码执行失败:', error);
                this._audit('CODE_EXECUTION_ERROR', {
                    columnId: columnData.id,
                    error: error.message,
                    stack: error.stack
                });
                return false;
            }
        }
        
        /**
         * 等待AutogenUnifiedStorage就绪
         * @private
         */
        async _waitForStorage() {
            return new Promise((resolve) => {
                const check = () => {
                    if (global.AutogenUnifiedStorage && global.AutogenUnifiedStorage._initialized) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }
        
        /**
         * 加载仓库数据
         * @private
         */
        async _loadWarehouse() {
            try {
                const data = await global.AutogenUnifiedStorage.get(this.STORAGE_KEY);
                
                if (data) {
                    // 恢复仓库数据
                    if (data.columns) {
                        data.columns.forEach(col => {
                            this.warehouseColumns.set(col.id, col);
                            if (col.status === 'online') {
                                this.onlineColumns.set(col.id, col);
                            }
                        });
                    }
                    
                    // 恢复审计日志
                    if (data.auditLog) {
                        this.auditLog = data.auditLog;
                    }
                    
                    console.log(`[ColumnWarehouse] 加载 ${this.warehouseColumns.size} 个工作栏`);
                }
                
            } catch (error) {
                console.error('[ColumnWarehouse] 加载失败:', error);
            }
        }
        
        /**
         * 保存仓库数据
         * @private
         */
        async _saveWarehouse() {
            try {
                const data = {
                    columns: Array.from(this.warehouseColumns.values()),
                    auditLog: this.auditLog.slice(-1000), // 保留最近1000条
                    savedAt: new Date().toISOString()
                };
                
                await global.AutogenUnifiedStorage.set(this.STORAGE_KEY, data);
                
            } catch (error) {
                console.error('[ColumnWarehouse] 保存失败:', error);
            }
        }
        
        /**
         * 记录审计日志
         * @private
         */
        _audit(action, details) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                details: details
            };
            
            this.auditLog.push(logEntry);
            
            // 限制日志大小
            if (this.auditLog.length > 1000) {
                this.auditLog = this.auditLog.slice(-1000);
            }
        }
        
        /**
         * 获取所有仓库工作栏
         * @returns {Array} 工作栏列表
         */
        getAllColumns() {
            return Array.from(this.warehouseColumns.values());
        }
        
        /**
         * 获取已上线工作栏
         * @returns {Array} 工作栏列表
         */
        getOnlineColumns() {
            return Array.from(this.onlineColumns.values());
        }
        
        /**
         * 获取审计日志
         * @returns {Array} 审计日志
         */
        getAuditLog() {
            return [...this.auditLog];
        }
    }
    
    // 在DOM加载后初始化
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    whenReady(() => {
        const warehouse = new ColumnWarehouse();
        
        // 延迟初始化，等待AutogenUnifiedStorage
        setTimeout(() => {
            warehouse.init();
        }, 500);
    });
    
})(window || this);

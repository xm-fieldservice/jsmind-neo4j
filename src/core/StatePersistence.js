/**
 * 状态持久化系统
 * 阶段2.2：自动保存和恢复应用状态
 * 支持多种存储后端和智能同步策略
 */

/**
 * 状态持久化管理器
 */
export class StatePersistenceManager {
    constructor(stateManager, eventBus, standardEvents, options = {}) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 配置选项
        this.options = {
            autoSave: true,                    // 自动保存
            saveInterval: 5000,                // 保存间隔（毫秒）
            storageKey: 'app_state_v2',        // 存储键
            maxBackups: 5,                     // 最大备份数量
            compressState: true,               // 压缩状态
            validateOnLoad: true,              // 加载时验证
            ...options
        };
        
        // 持久化状态
        this.isEnabled = true;
        this.lastSaveTime = null;
        this.saveTimer = null;
        this.isDirty = false;
        
        // 统计信息
        this.stats = {
            saves: 0,
            loads: 0,
            errors: 0,
            lastSaveSize: 0,
            totalSaveTime: 0
        };
        
        console.log('[StatePersistence] 状态持久化管理器已创建');
        
        this._initialize();
    }

    /**
     * 初始化持久化系统
     * @private
     */
    _initialize() {
        // 订阅状态变化
        this.stateManager.subscribe((newState, oldState, action) => {
            this._onStateChanged(newState, oldState, action);
        });
        
        // 监听页面卸载事件
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this._saveStateSync();
            });
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.isDirty) {
                    this._saveStateSync();
                }
            });
        }
        
        // 自动加载状态
        this._loadState();
        
        // 启动自动保存
        if (this.options.autoSave) {
            this._startAutoSave();
        }
    }

    /**
     * 保存状态
     * @param {boolean} force - 强制保存
     * @returns {Promise<boolean>} 保存结果
     */
    async saveState(force = false) {
        if (!this.isEnabled) {
            return false;
        }
        
        if (!force && !this.isDirty) {
            return true; // 无需保存
        }
        
        try {
            const startTime = Date.now();
            const state = this.stateManager.getState();
            
            // 创建持久化数据
            const persistData = {
                state,
                version: state.meta.version,
                savedAt: new Date().toISOString(),
                checksum: this._calculateChecksum(state)
            };
            
            // 压缩数据（如果启用）
            const dataToSave = this.options.compressState ? 
                this._compressData(persistData) : persistData;
            
            // 保存到存储
            await this._saveToStorage(dataToSave);
            
            // 创建备份
            await this._createBackup(dataToSave);
            
            // 更新统计
            const saveTime = Date.now() - startTime;
            this.stats.saves++;
            this.stats.lastSaveSize = JSON.stringify(dataToSave).length;
            this.stats.totalSaveTime += saveTime;
            this.lastSaveTime = Date.now();
            this.isDirty = false;
            
            // 发布保存成功事件
            this.eventBus.emit('state:saved', {
                size: this.stats.lastSaveSize,
                saveTime,
                timestamp: this.lastSaveTime
            });
            
            console.log(`[StatePersistence] 状态已保存 (${this.stats.lastSaveSize} bytes, ${saveTime}ms)`);
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error('[StatePersistence] 保存状态失败:', error);
            
            // 发布保存失败事件
            this.eventBus.emit('state:save_failed', {
                error: error.message,
                timestamp: Date.now()
            });
            
            return false;
        }
    }

    /**
     * 加载状态
     * @returns {Promise<boolean>} 加载结果
     */
    async loadState() {
        if (!this.isEnabled) {
            return false;
        }
        
        try {
            const startTime = Date.now();
            
            // 从存储加载
            const rawData = await this._loadFromStorage();
            if (!rawData) {
                console.log('[StatePersistence] 没有找到保存的状态');
                return false;
            }
            
            // 解压数据（如果需要）
            const persistData = this.options.compressState ? 
                this._decompressData(rawData) : rawData;
            
            // 验证数据完整性
            if (!this._validatePersistedData(persistData)) {
                console.error('[StatePersistence] 状态数据验证失败');
                return await this._loadFromBackup();
            }
            
            // 验证状态格式（如果启用）
            if (this.options.validateOnLoad) {
                const validation = this.stateManager.validator.validate(persistData.state);
                if (!validation.isValid) {
                    console.error('[StatePersistence] 状态格式验证失败:', validation.errors);
                    return await this._loadFromBackup();
                }
            }
            
            // 恢复状态
            this.stateManager.state = persistData.state;
            
            // 更新统计
            const loadTime = Date.now() - startTime;
            this.stats.loads++;
            
            // 发布加载成功事件
            this.eventBus.emit('state:loaded', {
                version: persistData.version,
                savedAt: persistData.savedAt,
                loadTime,
                timestamp: Date.now()
            });
            
            console.log(`[StatePersistence] 状态已加载 (${loadTime}ms)`);
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error('[StatePersistence] 加载状态失败:', error);
            
            // 尝试从备份恢复
            return await this._loadFromBackup();
        }
    }

    /**
     * 清除保存的状态
     */
    async clearState() {
        try {
            // 清除主存储
            localStorage.removeItem(this.options.storageKey);
            
            // 清除备份
            for (let i = 0; i < this.options.maxBackups; i++) {
                localStorage.removeItem(`${this.options.storageKey}_backup_${i}`);
            }
            
            // 重置统计
            this.stats = {
                saves: 0,
                loads: 0,
                errors: 0,
                lastSaveSize: 0,
                totalSaveTime: 0
            };
            
            console.log('[StatePersistence] 状态存储已清除');
            
            // 发布清除事件
            this.eventBus.emit('state:cleared', {
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('[StatePersistence] 清除状态失败:', error);
        }
    }

    /**
     * 启用/禁用持久化
     */
    setEnabled(enabled) {
        this.isEnabled = !!enabled;
        
        if (this.isEnabled) {
            this._startAutoSave();
        } else {
            this._stopAutoSave();
        }
        
        console.log(`[StatePersistence] 持久化${this.isEnabled ? '已启用' : '已禁用'}`);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            isEnabled: this.isEnabled,
            isDirty: this.isDirty,
            lastSaveTime: this.lastSaveTime,
            averageSaveTime: this.stats.saves > 0 ? 
                Math.round(this.stats.totalSaveTime / this.stats.saves) : 0,
            storageUsage: this._getStorageUsage()
        };
    }

    /**
     * 获取备份列表
     */
    getBackups() {
        const backups = [];
        
        for (let i = 0; i < this.options.maxBackups; i++) {
            const backupKey = `${this.options.storageKey}_backup_${i}`;
            const backup = localStorage.getItem(backupKey);
            
            if (backup) {
                try {
                    const data = JSON.parse(backup);
                    backups.push({
                        index: i,
                        savedAt: data.savedAt,
                        version: data.version,
                        size: backup.length
                    });
                } catch (error) {
                    // 忽略损坏的备份
                }
            }
        }
        
        return backups.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }

    /**
     * 从备份恢复
     */
    async restoreFromBackup(backupIndex = 0) {
        try {
            const backupKey = `${this.options.storageKey}_backup_${backupIndex}`;
            const backupData = localStorage.getItem(backupKey);
            
            if (!backupData) {
                throw new Error(`备份 ${backupIndex} 不存在`);
            }
            
            const persistData = JSON.parse(backupData);
            
            // 验证备份数据
            if (!this._validatePersistedData(persistData)) {
                throw new Error('备份数据验证失败');
            }
            
            // 恢复状态
            this.stateManager.state = persistData.state;
            
            console.log(`[StatePersistence] 已从备份 ${backupIndex} 恢复状态`);
            
            // 发布恢复事件
            this.eventBus.emit('state:restored', {
                backupIndex,
                savedAt: persistData.savedAt,
                timestamp: Date.now()
            });
            
            return true;
            
        } catch (error) {
            console.error('[StatePersistence] 从备份恢复失败:', error);
            return false;
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 状态变化处理
     * @private
     */
    _onStateChanged(newState, oldState, action) {
        // 忽略某些不需要持久化的Action
        const ignoredActions = [
            'UI_SET_SEARCH_QUERY',  // 搜索查询变化
            'SYSTEM_UPDATE_PERFORMANCE', // 性能更新
        ];
        
        if (ignoredActions.includes(action.type)) {
            return;
        }
        
        this.isDirty = true;
        
        // 如果是重要状态变化，立即保存
        const criticalActions = [
            'MINDMAP_SET_CURRENT_PID',
            'MINDMAP_SET_CACHE_DATA',
            'REGISTRY_ADD_PROJECT',
            'SYSTEM_SET_INITIALIZED'
        ];
        
        if (criticalActions.includes(action.type)) {
            this.saveState(true);
        }
    }

    /**
     * 启动自动保存
     * @private
     */
    _startAutoSave() {
        this._stopAutoSave();
        
        this.saveTimer = setInterval(() => {
            if (this.isDirty) {
                this.saveState();
            }
        }, this.options.saveInterval);
    }

    /**
     * 停止自动保存
     * @private
     */
    _stopAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }

    /**
     * 同步保存状态
     * @private
     */
    _saveStateSync() {
        if (!this.isEnabled || !this.isDirty) {
            return;
        }
        
        try {
            const state = this.stateManager.getState();
            const persistData = {
                state,
                version: state.meta.version,
                savedAt: new Date().toISOString(),
                checksum: this._calculateChecksum(state)
            };
            
            localStorage.setItem(this.options.storageKey, JSON.stringify(persistData));
            this.isDirty = false;
            
        } catch (error) {
            console.error('[StatePersistence] 同步保存失败:', error);
        }
    }

    /**
     * 保存到存储
     * @private
     */
    async _saveToStorage(data) {
        return new Promise((resolve, reject) => {
            try {
                const serialized = JSON.stringify(data);
                localStorage.setItem(this.options.storageKey, serialized);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 从存储加载
     * @private
     */
    async _loadFromStorage() {
        return new Promise((resolve) => {
            try {
                const data = localStorage.getItem(this.options.storageKey);
                resolve(data ? JSON.parse(data) : null);
            } catch (error) {
                console.error('[StatePersistence] 从存储加载失败:', error);
                resolve(null);
            }
        });
    }

    /**
     * 创建备份
     * @private
     */
    async _createBackup(data) {
        try {
            // 轮转备份
            for (let i = this.options.maxBackups - 1; i > 0; i--) {
                const currentKey = `${this.options.storageKey}_backup_${i - 1}`;
                const nextKey = `${this.options.storageKey}_backup_${i}`;
                
                const currentBackup = localStorage.getItem(currentKey);
                if (currentBackup) {
                    localStorage.setItem(nextKey, currentBackup);
                }
            }
            
            // 创建新备份
            const backupKey = `${this.options.storageKey}_backup_0`;
            localStorage.setItem(backupKey, JSON.stringify(data));
            
        } catch (error) {
            console.warn('[StatePersistence] 创建备份失败:', error);
        }
    }

    /**
     * 从备份加载
     * @private
     */
    async _loadFromBackup() {
        for (let i = 0; i < this.options.maxBackups; i++) {
            try {
                const backupKey = `${this.options.storageKey}_backup_${i}`;
                const backupData = localStorage.getItem(backupKey);
                
                if (backupData) {
                    const persistData = JSON.parse(backupData);
                    
                    if (this._validatePersistedData(persistData)) {
                        this.stateManager.state = persistData.state;
                        
                        console.log(`[StatePersistence] 已从备份 ${i} 恢复状态`);
                        
                        this.eventBus.emit('state:recovered_from_backup', {
                            backupIndex: i,
                            savedAt: persistData.savedAt
                        });
                        
                        return true;
                    }
                }
            } catch (error) {
                console.warn(`[StatePersistence] 备份 ${i} 损坏:`, error);
            }
        }
        
        console.error('[StatePersistence] 所有备份都不可用');
        return false;
    }

    /**
     * 验证持久化数据
     * @private
     */
    _validatePersistedData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        if (!data.state || !data.version || !data.savedAt) {
            return false;
        }
        
        // 验证校验和
        if (data.checksum) {
            const calculatedChecksum = this._calculateChecksum(data.state);
            if (calculatedChecksum !== data.checksum) {
                console.error('[StatePersistence] 校验和不匹配');
                return false;
            }
        }
        
        return true;
    }

    /**
     * 计算校验和
     * @private
     */
    _calculateChecksum(state) {
        try {
            const stateStr = JSON.stringify(state);
            let hash = 0;
            
            for (let i = 0; i < stateStr.length; i++) {
                const char = stateStr.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }
            
            return hash.toString(36);
        } catch (error) {
            return null;
        }
    }

    /**
     * 压缩数据
     * @private
     */
    _compressData(data) {
        // 简单的压缩：移除不必要的空格
        return JSON.parse(JSON.stringify(data));
    }

    /**
     * 解压数据
     * @private
     */
    _decompressData(data) {
        return data;
    }

    /**
     * 获取存储使用情况
     * @private
     */
    _getStorageUsage() {
        try {
            let totalSize = 0;
            
            // 主存储
            const mainData = localStorage.getItem(this.options.storageKey);
            if (mainData) {
                totalSize += mainData.length;
            }
            
            // 备份存储
            for (let i = 0; i < this.options.maxBackups; i++) {
                const backupKey = `${this.options.storageKey}_backup_${i}`;
                const backupData = localStorage.getItem(backupKey);
                if (backupData) {
                    totalSize += backupData.length;
                }
            }
            
            return {
                totalSize,
                mainSize: mainData ? mainData.length : 0,
                backupCount: this.getBackups().length,
                formattedSize: this._formatBytes(totalSize)
            };
            
        } catch (error) {
            return { totalSize: 0, mainSize: 0, backupCount: 0, formattedSize: '0 B' };
        }
    }

    /**
     * 格式化字节数
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 加载状态（私有方法）
     * @private
     */
    async _loadState() {
        const loaded = await this.loadState();
        if (!loaded) {
            console.log('[StatePersistence] 使用默认状态');
        }
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.StatePersistenceManager = StatePersistenceManager;
}

export default StatePersistenceManager;

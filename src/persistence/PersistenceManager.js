/**
 * 持久化管理器 - 方案B-Lite
 * 统一管理脑图数据的读写、镜像、快照和迁移
 * 解决localStorage冲突和数据一致性问题
 */

class PersistenceManager {
    constructor() {
        this.adapters = {
            localStorage: new LocalStorageAdapter(),
            jsonMirror: new JsonMirrorAdapter(),
            snapshot: new SnapshotAdapter()
        };
        
        // 防抖定时器
        this.saveTimers = new Map();
        this.mirrorTimers = new Map();
        
        // 配置
        this.config = {
            saveDebounceMs: 800,        // 保存防抖
            mirrorThrottleMs: 300000,   // 镜像节流 (5分钟)
            maxSnapshots: 50,           // 最大快照数
            validateData: true          // 数据校验开关
        };
        
        // 统计
        this.stats = {
            loads: 0,
            saves: 0,
            mirrors: 0,
            snapshots: 0,
            migrations: 0,
            errors: 0
        };
        
        console.log('[PersistenceManager] 初始化完成');
    }
    
    /**
     * 加载脑图数据
     * @param {string} mindId - 脑图ID
     * @returns {Promise<Object|null>} 脑图数据包
     */
    async loadMind(mindId) {
        try {
            this.stats.loads++;
            console.log(`[PersistenceManager] 加载脑图: ${mindId}`);
            
            // 1. 优先从主存储(localStorage)读取
            const primaryKey = this._getStorageKey(mindId);
            let mindPack = this.adapters.localStorage.read(primaryKey);
            
            if (mindPack && this._validateMindPack(mindPack)) {
                console.log(`[PersistenceManager] 从主存储加载成功: ${mindId}`);
                return mindPack;
            }
            
            // 2. 尝试从遗留键迁移
            const migrated = await this._tryMigrateLegacyData(mindId);
            if (migrated) {
                console.log(`[PersistenceManager] 从遗留数据迁移成功: ${mindId}`);
                return migrated;
            }
            
            // 3. 尝试从JSON镜像恢复
            const fromMirror = await this.adapters.jsonMirror.load(mindId);
            if (fromMirror && this._validateMindPack(fromMirror)) {
                console.log(`[PersistenceManager] 从JSON镜像恢复: ${mindId}`);
                // 恢复到主存储
                this.adapters.localStorage.write(primaryKey, fromMirror);
                return fromMirror;
            }
            
            console.warn(`[PersistenceManager] 未找到脑图数据: ${mindId}`);
            return null;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[PersistenceManager] 加载失败: ${mindId}`, error);
            return null;
        }
    }
    
    /**
     * 保存脑图数据
     * @param {string} mindId - 脑图ID
     * @param {Object} mindPack - 脑图数据包
     * @param {Object} options - 保存选项
     * @returns {Promise<void>}
     */
    async saveMind(mindId, mindPack, options = {}) {
        try {
            this.stats.saves++;
            
            // 数据校验和修复
            const validatedPack = this._validateAndFixMindPack(mindPack, mindId);
            
            // 防抖保存
            if (this.saveTimers.has(mindId)) {
                clearTimeout(this.saveTimers.get(mindId));
            }
            
            const saveTimer = setTimeout(async () => {
                try {
                    // 保存到主存储
                    const primaryKey = this._getStorageKey(mindId);
                    this.adapters.localStorage.write(primaryKey, validatedPack);
                    
                    // 更新遗留键(兼容性)
                    this.adapters.localStorage.write('mindmap_data_v1', validatedPack);
                    
                    console.log(`[PersistenceManager] 保存成功: ${mindId}`);
                    
                    // 异步镜像(不阻塞主流程)
                    this._scheduleMirror(mindId, validatedPack);
                    
                    // 自动快照(重要操作)
                    if (options.snapshot) {
                        this._scheduleSnapshot(mindId, validatedPack, options.reason || 'auto');
                    }
                    
                } catch (error) {
                    this.stats.errors++;
                    console.error(`[PersistenceManager] 保存失败: ${mindId}`, error);
                }
                
                this.saveTimers.delete(mindId);
            }, this.config.saveDebounceMs);
            
            this.saveTimers.set(mindId, saveTimer);
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[PersistenceManager] 保存准备失败: ${mindId}`, error);
        }
    }
    
    /**
     * 获取最新数据(快速访问)
     * @param {string} mindId - 脑图ID
     * @returns {Promise<Object|null>}
     */
    async getLatest(mindId) {
        const primaryKey = this._getStorageKey(mindId);
        return this.adapters.localStorage.read(primaryKey);
    }
    
    /**
     * 创建快照
     * @param {string} mindId - 脑图ID
     * @param {Object} mindPack - 脑图数据包
     * @param {string} reason - 快照原因
     * @returns {Promise<string>} 快照ID
     */
    async snapshot(mindId, mindPack, reason = 'manual') {
        try {
            this.stats.snapshots++;
            const snapshotId = await this.adapters.snapshot.save(mindId, mindPack, reason);
            console.log(`[PersistenceManager] 快照创建: ${snapshotId} (${reason})`);
            return snapshotId;
        } catch (error) {
            this.stats.errors++;
            console.error(`[PersistenceManager] 快照失败: ${mindId}`, error);
            throw error;
        }
    }
    
    /**
     * 迁移遗留数据
     * @param {string} mindId - 脑图ID
     * @returns {Promise<Object>} 迁移报告
     */
    async migrate(mindId) {
        try {
            this.stats.migrations++;
            console.log(`[PersistenceManager] 开始迁移: ${mindId}`);
            
            const report = {
                mindId,
                timestamp: new Date().toISOString(),
                migrated: false,
                source: null,
                errors: []
            };
            
            // 尝试从 mindmap_data_v1 迁移
            const legacyData = this.adapters.localStorage.read('mindmap_data_v1');
            if (legacyData && this._validateMindPack(legacyData)) {
                const legacyMindId = this._extractMindId(legacyData);
                if (legacyMindId === mindId) {
                    const primaryKey = this._getStorageKey(mindId);
                    this.adapters.localStorage.write(primaryKey, legacyData);
                    report.migrated = true;
                    report.source = 'mindmap_data_v1';
                    console.log(`[PersistenceManager] 迁移成功: ${mindId} <- mindmap_data_v1`);
                }
            }
            
            return report;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[PersistenceManager] 迁移失败: ${mindId}`, error);
            throw error;
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计数据
     */
    getStats() {
        return {
            ...this.stats,
            timestamp: new Date().toISOString(),
            adapters: {
                localStorage: this.adapters.localStorage.getStats(),
                jsonMirror: this.adapters.jsonMirror.getStats(),
                snapshot: this.adapters.snapshot.getStats()
            }
        };
    }
    
    // ========== 私有方法 ==========
    
    /**
     * 生成存储键
     * @param {string} mindId - 脑图ID
     * @returns {string} 存储键
     */
    _getStorageKey(mindId) {
        return `mm:${mindId}:data`;
    }
    
    /**
     * 验证脑图数据包
     * @param {Object} mindPack - 数据包
     * @returns {boolean} 是否有效
     */
    _validateMindPack(mindPack) {
        if (!this.config.validateData) return true;
        
        return mindPack &&
               typeof mindPack === 'object' &&
               mindPack.format === 'node_tree' &&
               mindPack.data &&
               mindPack.data.id &&
               Array.isArray(mindPack.data.children);
    }
    
    /**
     * 验证并修复数据包
     * @param {Object} mindPack - 原始数据包
     * @param {string} mindId - 脑图ID
     * @returns {Object} 修复后的数据包
     */
    _validateAndFixMindPack(mindPack, mindId) {
        const fixed = JSON.parse(JSON.stringify(mindPack)); // 深拷贝
        
        // 确保基本结构
        if (!fixed.format) fixed.format = 'node_tree';
        if (!fixed.data) fixed.data = { id: mindId, children: [] };
        if (!fixed.data.id) fixed.data.id = mindId;
        if (!Array.isArray(fixed.data.children)) fixed.data.children = [];
        
        // 确保元信息
        if (!fixed.meta) fixed.meta = {};
        fixed.meta.mind_id = mindId;
        fixed.meta.updated_at = new Date().toISOString();
        
        // 修复节点内容双写问题
        this._patchNodeContent(fixed.data);
        
        return fixed;
    }
    
    /**
     * 修复节点内容双写
     * @param {Object} node - 节点对象
     */
    _patchNodeContent(node) {
        if (!node) return;
        
        // 确保 content 字段存在且一致
        if (node.data && node.data.content !== undefined) {
            node.content = node.data.content;
        } else if (node.content !== undefined) {
            if (!node.data) node.data = {};
            node.data.content = node.content;
        } else {
            // 都没有则设为空字符串
            node.content = '';
            if (!node.data) node.data = {};
            node.data.content = '';
        }
        
        // 递归处理子节点
        if (Array.isArray(node.children)) {
            node.children.forEach(child => this._patchNodeContent(child));
        }
    }
    
    /**
     * 提取脑图ID
     * @param {Object} mindPack - 数据包
     * @returns {string|null} 脑图ID
     */
    _extractMindId(mindPack) {
        return mindPack?.meta?.mind_id || mindPack?.data?.id || null;
    }
    
    /**
     * 尝试迁移遗留数据
     * @param {string} mindId - 目标脑图ID
     * @returns {Promise<Object|null>} 迁移的数据
     */
    async _tryMigrateLegacyData(mindId) {
        const legacyData = this.adapters.localStorage.read('mindmap_data_v1');
        if (!legacyData || !this._validateMindPack(legacyData)) {
            return null;
        }
        
        const legacyMindId = this._extractMindId(legacyData);
        if (legacyMindId !== mindId) {
            return null;
        }
        
        // 迁移到新键
        const primaryKey = this._getStorageKey(mindId);
        const fixedData = this._validateAndFixMindPack(legacyData, mindId);
        this.adapters.localStorage.write(primaryKey, fixedData);
        
        console.log(`[PersistenceManager] 自动迁移: ${mindId}`);
        return fixedData;
    }
    
    /**
     * 调度镜像同步
     * @param {string} mindId - 脑图ID
     * @param {Object} mindPack - 数据包
     */
    _scheduleMirror(mindId, mindPack) {
        // 节流镜像
        if (this.mirrorTimers.has(mindId)) {
            return; // 已有镜像任务在队列中
        }
        
        const mirrorTimer = setTimeout(async () => {
            try {
                await this.adapters.jsonMirror.sync(mindId, mindPack);
                this.stats.mirrors++;
                console.log(`[PersistenceManager] 镜像同步完成: ${mindId}`);
            } catch (error) {
                console.warn(`[PersistenceManager] 镜像同步失败: ${mindId}`, error);
            }
            this.mirrorTimers.delete(mindId);
        }, this.config.mirrorThrottleMs);
        
        this.mirrorTimers.set(mindId, mirrorTimer);
    }
    
    /**
     * 调度快照创建
     * @param {string} mindId - 脑图ID
     * @param {Object} mindPack - 数据包
     * @param {string} reason - 快照原因
     */
    _scheduleSnapshot(mindId, mindPack, reason) {
        setTimeout(async () => {
            try {
                await this.snapshot(mindId, mindPack, reason);
            } catch (error) {
                console.warn(`[PersistenceManager] 自动快照失败: ${mindId}`, error);
            }
        }, 1000); // 延迟1秒创建快照
    }
}

// 全局单例
window.PersistenceManager = window.PersistenceManager || new PersistenceManager();

/**
 * JSON镜像适配器
 * 负责将数据异步同步到JSON基座(backend/json_base_api.py)
 */

class JsonMirrorAdapter {
    constructor() {
        this.stats = {
            syncs: 0,
            loads: 0,
            errors: 0,
            lastSyncTime: null,
            lastErrorTime: null
        };
        
        this.config = {
            apiBaseUrl: '/api',
            timeout: 10000, // 10秒超时
            retryAttempts: 3,
            retryDelay: 2000 // 2秒重试间隔
        };
        
        console.log('[JsonMirrorAdapter] 初始化完成');
    }
    
    /**
     * 从JSON基座加载数据
     * @param {string} mindId - 脑图ID
     * @returns {Promise<Object|null>} 脑图数据
     */
    async load(mindId) {
        try {
            this.stats.loads++;
            console.log(`[JsonMirrorAdapter] 从JSON基座加载: ${mindId}`);
            
            const response = await this._fetchWithTimeout(`${this.config.apiBaseUrl}/mindmaps`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const mindmap = data.mindmaps?.find(m => m.id === mindId);
            
            if (!mindmap || !mindmap.data) {
                console.log(`[JsonMirrorAdapter] 未找到脑图: ${mindId}`);
                return null;
            }
            
            // 转换为标准格式
            const mindPack = {
                format: 'node_tree',
                data: mindmap.data.data || mindmap.data,
                meta: {
                    mind_id: mindId,
                    name: mindmap.name,
                    updated_at: mindmap.updated_at || new Date().toISOString(),
                    source: 'json_base'
                }
            };
            
            console.log(`[JsonMirrorAdapter] 加载成功: ${mindId}`);
            return mindPack;
            
        } catch (error) {
            this.stats.errors++;
            this.stats.lastErrorTime = new Date().toISOString();
            console.warn(`[JsonMirrorAdapter] 加载失败: ${mindId}`, error);
            return null;
        }
    }
    
    /**
     * 同步数据到JSON基座
     * @param {string} mindId - 脑图ID
     * @param {Object} mindPack - 脑图数据包
     * @returns {Promise<boolean>} 是否成功
     */
    async sync(mindId, mindPack) {
        let attempt = 0;
        
        while (attempt < this.config.retryAttempts) {
            try {
                this.stats.syncs++;
                console.log(`[JsonMirrorAdapter] 同步到JSON基座: ${mindId} (尝试 ${attempt + 1})`);
                
                // 准备同步数据
                const syncData = {
                    id: mindId,
                    name: mindPack.meta?.name || `脑图-${mindId}`,
                    data: {
                        format: mindPack.format,
                        data: mindPack.data
                    },
                    updated_at: new Date().toISOString()
                };
                
                // 发送同步请求
                const response = await this._fetchWithTimeout(`${this.config.apiBaseUrl}/mindmaps/${mindId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(syncData)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                this.stats.lastSyncTime = new Date().toISOString();
                console.log(`[JsonMirrorAdapter] 同步成功: ${mindId}`);
                return true;
                
            } catch (error) {
                attempt++;
                this.stats.errors++;
                this.stats.lastErrorTime = new Date().toISOString();
                
                console.warn(`[JsonMirrorAdapter] 同步失败 (尝试 ${attempt}): ${mindId}`, error);
                
                if (attempt < this.config.retryAttempts) {
                    console.log(`[JsonMirrorAdapter] ${this.config.retryDelay}ms后重试...`);
                    await this._delay(this.config.retryDelay);
                }
            }
        }
        
        console.error(`[JsonMirrorAdapter] 同步最终失败: ${mindId}`);
        return false;
    }
    
    /**
     * 批量同步多个脑图
     * @param {Array<{mindId: string, mindPack: Object}>} items - 要同步的项目
     * @returns {Promise<Object>} 同步结果统计
     */
    async batchSync(items) {
        const results = {
            total: items.length,
            success: 0,
            failed: 0,
            errors: []
        };
        
        console.log(`[JsonMirrorAdapter] 开始批量同步: ${items.length} 个脑图`);
        
        // 并发同步(限制并发数为3)
        const concurrency = 3;
        for (let i = 0; i < items.length; i += concurrency) {
            const batch = items.slice(i, i + concurrency);
            const promises = batch.map(async (item) => {
                try {
                    const success = await this.sync(item.mindId, item.mindPack);
                    if (success) {
                        results.success++;
                    } else {
                        results.failed++;
                        results.errors.push(`${item.mindId}: 同步失败`);
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push(`${item.mindId}: ${error.message}`);
                }
            });
            
            await Promise.all(promises);
        }
        
        console.log(`[JsonMirrorAdapter] 批量同步完成: ${results.success}成功, ${results.failed}失败`);
        return results;
    }
    
    /**
     * 检查JSON基座连接状态
     * @returns {Promise<boolean>} 是否可连接
     */
    async checkConnection() {
        try {
            const response = await this._fetchWithTimeout(`${this.config.apiBaseUrl}/health`, {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.warn('[JsonMirrorAdapter] 连接检查失败', error);
            return false;
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
            config: {
                apiBaseUrl: this.config.apiBaseUrl,
                timeout: this.config.timeout,
                retryAttempts: this.config.retryAttempts
            }
        };
    }
    
    // ========== 私有方法 ==========
    
    /**
     * 带超时的fetch请求
     * @param {string} url - 请求URL
     * @param {Object} options - fetch选项
     * @returns {Promise<Response>} 响应对象
     */
    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`请求超时: ${url}`);
            }
            throw error;
        }
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise<void>}
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 验证脑图数据格式
     * @param {Object} mindPack - 脑图数据包
     * @returns {boolean} 是否有效
     */
    _validateMindPack(mindPack) {
        return mindPack &&
               typeof mindPack === 'object' &&
               mindPack.format === 'node_tree' &&
               mindPack.data &&
               mindPack.data.id;
    }
}

// 导出给PersistenceManager使用
if (typeof window !== 'undefined') {
    window.JsonMirrorAdapter = JsonMirrorAdapter;
}

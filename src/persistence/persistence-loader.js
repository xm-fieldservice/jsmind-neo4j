/**
 * 持久化系统加载器
 * 按正确顺序加载所有持久化组件
 */

(function() {
    'use strict';
    
    console.log('[PersistenceLoader] 开始加载持久化系统...');
    
    // 检查是否已经加载
    if (window.PersistenceManager && window.PersistenceManager.constructor.name === 'PersistenceManager') {
        console.log('[PersistenceLoader] 持久化系统已加载，跳过重复加载');
        return;
    }
    
    // 加载适配器脚本
    const scripts = [
        '/src/persistence/adapters/JsonMirrorAdapter.js', 
        '/src/persistence/adapters/SnapshotAdapter.js',
        '/src/persistence/PersistenceManager.js'
    ];
    
    let loadedCount = 0;
    const totalScripts = scripts.length;
    
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // 保证顺序加载
            
            script.onload = () => {
                loadedCount++;
                console.log(`[PersistenceLoader] 已加载: ${src} (${loadedCount}/${totalScripts})`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[PersistenceLoader] 加载失败: ${src}`, error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }
    
    // 顺序加载所有脚本
    async function loadAllScripts() {
        try {
            for (const script of scripts) {
                await loadScript(script);
            }
            
            console.log('[PersistenceLoader] 所有脚本加载完成');
            
            // 验证加载结果
            if (window.LocalStorageAdapter && 
                window.JsonMirrorAdapter && 
                window.SnapshotAdapter && 
                window.PersistenceManager) {
                
                console.log('[PersistenceLoader] ✅ 持久化系统初始化成功');
                
                // 触发加载完成事件
                if (typeof AutogenEventBus !== 'undefined') {
                    AutogenEventBus.emit('persistenceSystemReady', {
                        timestamp: new Date().toISOString(),
                        components: ['LocalStorageAdapter', 'JsonMirrorAdapter', 'SnapshotAdapter', 'PersistenceManager']
                    });
                } else {
                    window.dispatchEvent(new CustomEvent('persistenceSystemReady', {
                        detail: {
                            timestamp: new Date().toISOString(),
                            components: ['LocalStorageAdapter', 'JsonMirrorAdapter', 'SnapshotAdapter', 'PersistenceManager']
                        }
                    }));
                }
                
                // 显示系统状态
                if (window.PersistenceManager.getStats) {
                    const stats = window.PersistenceManager.getStats();
                    console.log('[PersistenceLoader] 系统统计:', stats);
                }
                
            } else {
                throw new Error('部分组件加载失败');
            }
            
        } catch (error) {
            console.error('[PersistenceLoader] ❌ 持久化系统加载失败:', error);
            
            // 触发加载失败事件
            if (typeof AutogenEventBus !== 'undefined') {
                AutogenEventBus.emit('persistenceSystemError', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                window.dispatchEvent(new CustomEvent('persistenceSystemError', {
                    detail: {
                        error: error.message,
                        timestamp: new Date().toISOString()
                    }
                }));
            }
        }
    }
    
    // 开始加载
    loadAllScripts();
    
})();

/**
 * 持久化系统就绪检查器
 * 提供便捷的API来检查系统是否就绪
 */
window.PersistenceSystemChecker = {
    /**
     * 检查系统是否就绪
     * @returns {boolean} 是否就绪
     */
    isReady() {
        return !!(window.LocalStorageAdapter && 
                 window.JsonMirrorAdapter && 
                 window.SnapshotAdapter && 
                 window.PersistenceManager);
    },
    
    /**
     * 等待系统就绪
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise<boolean>} 是否成功
     */
    waitForReady(timeout = 10000) {
        return new Promise((resolve) => {
            if (this.isReady()) {
                resolve(true);
                return;
            }
            
            const startTime = Date.now();
            
            const checkReady = () => {
                if (this.isReady()) {
                    resolve(true);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    console.warn('[PersistenceSystemChecker] 等待超时');
                    resolve(false);
                    return;
                }
                
                setTimeout(checkReady, 100);
            };
            
            // 监听就绪事件
            const onReady = () => {
                window.removeEventListener('persistenceSystemReady', onReady);
                resolve(true);
            };
            
            const onError = () => {
                window.removeEventListener('persistenceSystemError', onError);
                resolve(false);
            };
            
            window.addEventListener('persistenceSystemReady', onReady);
            window.addEventListener('persistenceSystemError', onError);
            
            checkReady();
        });
    },
    
    /**
     * 获取系统状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            ready: this.isReady(),
            components: {
                LocalStorageAdapter: !!window.LocalStorageAdapter,
                JsonMirrorAdapter: !!window.JsonMirrorAdapter,
                SnapshotAdapter: !!window.SnapshotAdapter,
                PersistenceManager: !!window.PersistenceManager
            },
            timestamp: new Date().toISOString()
        };
    }
};

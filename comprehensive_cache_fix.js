// 综合缓存修复方案 - 基于深度分析的谨慎优化
// 保持原有设计意图，修复执行时序问题

(function() {
    console.log('🧠 启动综合缓存修复方案...');
    
    // ===== 方案A: 最小干预 - 修复时序问题 =====
    
    // 1. 添加缓存锁机制，避免并发操作
    window.__mindCacheLock = false;
    let cacheOperationCount = 0;
    let lastOperationTime = 0;
    
    // 保存原始缓存引用
    let originalCache = window.__mindFullCache;
    
    // 2. 安全的缓存设置函数
    const safeSetCache = (newCache, source = 'unknown') => {
        if (window.__mindCacheLock) {
            console.log(`🔒 [SafeCache] 缓存已锁定，拒绝设置 (来源: ${source})`);
            return false;
        }
        
        // 验证数据完整性
        if (!newCache || !newCache.data || !newCache.data.id) {
            console.warn(`⚠️ [SafeCache] 拒绝无效数据 (来源: ${source})`);
            return false;
        }
        
        const oldNodeCount = originalCache?.data?.children?.length || 0;
        const newNodeCount = newCache.data.children?.length || 0;
        
        // 防止数据倒退（新数据节点数明显少于旧数据）
        if (oldNodeCount > 0 && newNodeCount < oldNodeCount * 0.5) {
            console.warn(`🚫 [SafeCache] 拒绝可能的数据倒退: ${oldNodeCount} → ${newNodeCount} (来源: ${source})`);
            return false;
        }
        
        // 只在真正需要时设置
        if (!originalCache || !originalCache.data || newNodeCount > oldNodeCount) {
            originalCache = newCache;
            console.log(`✅ [SafeCache] 接受缓存更新: ${newNodeCount} 个节点 (来源: ${source})`);
            return true;
        }
        
        console.log(`📋 [SafeCache] 保持现有缓存: ${oldNodeCount} 个节点 (拒绝来源: ${source})`);
        return false;
    };
    
    // 3. 改进的ID解析函数，减少对全局变量的依赖
    const getMindKey = function() {
        // 优先使用当前画布根ID
        try { 
            const rid = (this.mind && this.mind.get_root && this.mind.get_root().id) || 
                       (this.data && this.data.id); 
            if (rid) {
                console.log(`🔑 [MindKey] 从画布获取: ${rid}`);
                return String(rid); 
            }
        } catch(_) { }
        
        // 次优：从全局缓存获取
        try { 
            const p = originalCache; 
            const mid = p && p.meta && p.meta.mind_id; 
            if (mid) {
                console.log(`🔑 [MindKey] 从缓存获取: ${mid}`);
                return String(mid); 
            }
        } catch(_) { }
        
        console.log(`🔑 [MindKey] 使用默认: root`);
        return 'root';
    };
    
    // 4. 重新定义 __mindFullCache 属性，添加智能控制
    Object.defineProperty(window, '__mindFullCache', {
        get: function() {
            return originalCache;
        },
        set: function(newValue) {
            const now = Date.now();
            cacheOperationCount++;
            
            // 检测频繁操作
            if (now - lastOperationTime < 100) { // 100ms内的操作
                console.warn(`⚡ [CacheControl] 检测到频繁操作 (#${cacheOperationCount})`);
            }
            lastOperationTime = now;
            
            // 获取调用栈信息（用于调试）
            const stack = new Error().stack;
            const caller = stack.split('\n')[2]?.trim() || 'unknown';
            
            // 处理 null 值设置
            if (newValue === null || newValue === undefined) {
                console.log(`🗑️ [CacheControl] 忽略清空操作 (调用者: ${caller})`);
                return; // 保护现有缓存
            }
            
            // 使用安全设置函数
            safeSetCache(newValue, `调用栈: ${caller}`);
        },
        configurable: true,
        enumerable: true
    });
    
    // ===== 方案B部分: 引入轻量级缓存管理器 =====
    
    class LightweightCacheManager {
        constructor() {
            this.locked = false;
            this.listeners = [];
            this.history = []; // 缓存操作历史
        }
        
        lock(reason = 'unknown') { 
            this.locked = true; 
            window.__mindCacheLock = true;
            console.log(`🔒 [CacheManager] 缓存已锁定: ${reason}`);
        }
        
        unlock(reason = 'unknown') { 
            this.locked = false; 
            window.__mindCacheLock = false;
            console.log(`🔓 [CacheManager] 缓存已解锁: ${reason}`);
        }
        
        recordOperation(operation, data) {
            this.history.push({
                timestamp: Date.now(),
                operation,
                nodeCount: data?.data?.children?.length || 0,
                source: new Error().stack.split('\n')[3]?.trim() || 'unknown'
            });
            
            // 只保留最近10次操作
            if (this.history.length > 10) {
                this.history.shift();
            }
        }
        
        getHistory() {
            return this.history;
        }
        
        // 智能恢复机制
        async smartRecover() {
            console.log('🔄 [CacheManager] 开始智能恢复...');
            
            this.lock('智能恢复中');
            
            try {
                // 1. 尝试从localStorage恢复
                const stored = localStorage.getItem('__mind_full_cache_v1');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.data && parsed.data.children && 
                        parsed.data.children.length >= 20) {
                        if (safeSetCache(parsed, 'localStorage恢复')) {
                            console.log('✅ [CacheManager] 从localStorage恢复成功');
                            return true;
                        }
                    }
                }
                
                // 2. 尝试从API恢复
                const response = await fetch('/api/mindmaps');
                if (response.ok) {
                    const data = await response.json();
                    const targetMindmap = data.mindmaps?.find(m => m.id === 'root-1758256084936-b8');
                    if (targetMindmap && targetMindmap.data && targetMindmap.data.data) {
                        const cacheData = {
                            meta: { mind_id: targetMindmap.id, name: targetMindmap.name },
                            format: 'node_tree',
                            data: targetMindmap.data.data
                        };
                        
                        if (safeSetCache(cacheData, 'API恢复')) {
                            console.log('✅ [CacheManager] 从API恢复成功');
                            
                            // 同步到localStorage
                            localStorage.setItem('__mind_full_cache_v1', JSON.stringify(cacheData));
                            
                            return true;
                        }
                    }
                }
                
                console.warn('❌ [CacheManager] 智能恢复失败');
                return false;
                
            } catch (error) {
                console.error('❌ [CacheManager] 智能恢复出错:', error);
                return false;
            } finally {
                this.unlock('智能恢复完成');
            }
        }
    }
    
    // 创建缓存管理器实例
    window.__lightCacheManager = new LightweightCacheManager();
    
    // ===== 集成现有机制，保持兼容性 =====
    
    // 增强原有的 tryInitFullCache 函数
    const originalTryInitFullCache = window.tryInitFullCache;
    window.tryInitFullCache = function() {
        console.log('🔄 [Enhanced] tryInitFullCache 被调用');
        window.__lightCacheManager.recordOperation('tryInitFullCache', originalCache);
        
        // 如果已有有效缓存，跳过初始化
        if (originalCache && originalCache.data && originalCache.data.children && 
            originalCache.data.children.length >= 20) {
            console.log('✅ [Enhanced] 跳过初始化，已有有效缓存');
            return;
        }
        
        // 调用原始函数
        if (originalTryInitFullCache) {
            originalTryInitFullCache.call(this);
        }
    };
    
    // 增强原有的 focusSubtree 函数
    const originalFocusSubtree = window.focusSubtree;
    window.focusSubtree = function(nodeId) {
        console.log(`🎯 [Enhanced] focusSubtree 被调用: ${nodeId}`);
        window.__lightCacheManager.recordOperation('focusSubtree', originalCache);
        
        // 在聚焦前锁定缓存，防止意外重置
        window.__lightCacheManager.lock('子树聚焦中');
        
        try {
            if (originalFocusSubtree) {
                originalFocusSubtree.call(this, nodeId);
            }
        } finally {
            // 延迟解锁，确保聚焦操作完成
            setTimeout(() => {
                window.__lightCacheManager.unlock('子树聚焦完成');
            }, 500);
        }
    };
    
    // 增强原有的 restoreFullMind 函数
    const originalRestoreFullMind = window.restoreFullMind;
    window.restoreFullMind = function() {
        console.log('🔄 [Enhanced] restoreFullMind 被调用');
        window.__lightCacheManager.recordOperation('restoreFullMind', originalCache);
        
        if (originalRestoreFullMind) {
            originalRestoreFullMind.call(this);
        }
    };
    
    // ===== 提供调试和修复接口 =====
    
    window.debugCacheState = function() {
        console.log('🔍 [Debug] 缓存状态诊断:');
        
        try {
            const nodeCount = originalCache?.data?.children?.length || 0;
            const history = window.__lightCacheManager ? window.__lightCacheManager.getHistory() : [];
            const locked = window.__mindCacheLock || false;
            
            console.log('当前缓存:', originalCache);
            console.log('节点数量:', nodeCount);
            console.log('操作历史:', history);
            console.log('锁定状态:', locked);
            
            const result = {
                cache: originalCache,
                nodeCount: nodeCount,
                history: history,
                locked: locked,
                hasCache: !!originalCache,
                hasData: !!(originalCache && originalCache.data),
                hasChildren: !!(originalCache && originalCache.data && originalCache.data.children)
            };
            
            console.log('🔍 [Debug] 返回结果:', result);
            return result;
            
        } catch (error) {
            console.error('🔍 [Debug] 诊断过程出错:', error);
            
            // 返回安全的默认值
            return {
                cache: null,
                nodeCount: 0,
                history: [],
                locked: false,
                hasCache: false,
                hasData: false,
                hasChildren: false,
                error: error.message
            };
        }
    };
    
    window.forceCacheRecover = async function() {
        console.log('🚀 [Force] 强制缓存恢复...');
        return await window.__lightCacheManager.smartRecover();
    };
    
    window.resetCacheSystem = function() {
        console.log('🔄 [Reset] 重置缓存系统...');
        window.__lightCacheManager.unlock('系统重置');
        cacheOperationCount = 0;
        lastOperationTime = 0;
        console.log('✅ [Reset] 缓存系统已重置');
    };
    
    // ===== 自动恢复和监控 =====
    
    // 页面加载后自动检查和恢复
    setTimeout(async () => {
        console.log('🔍 [Auto] 自动检查缓存状态...');
        
        if (!originalCache || !originalCache.data || 
            !originalCache.data.children || originalCache.data.children.length < 20) {
            console.log('🔄 [Auto] 检测到缓存问题，启动自动恢复...');
            await window.__lightCacheManager.smartRecover();
        } else {
            console.log('✅ [Auto] 缓存状态正常');
        }
    }, 2000);
    
    // 定期监控缓存状态
    setInterval(() => {
        const nodeCount = originalCache?.data?.children?.length || 0;
        if (nodeCount > 0 && nodeCount < 20) {
            console.warn(`⚠️ [Monitor] 检测到缓存数据不完整: ${nodeCount} 个节点`);
        }
    }, 30000);
    
    console.log('✅ 综合缓存修复方案已激活');
    console.log('💡 可用调试接口: debugCacheState(), forceCacheRecover(), resetCacheSystem()');
    
})();

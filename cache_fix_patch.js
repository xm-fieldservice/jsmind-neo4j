// 缓存冲突修复补丁 - 立即生效方案
// 解决 __mindFullCache 被多处重置导致的数据丢失问题

(function() {
    console.log('🔧 启动缓存冲突修复补丁...');
    
    let originalCache = window.__mindFullCache;
    let cacheSetCount = 0;
    let lastSetTime = 0;
    const EXPECTED_MIN_NODES = 20; // 我们知道应该有25个节点
    
    // 保存原始缓存（如果存在且有效）
    if (originalCache && originalCache.data && originalCache.data.children && 
        originalCache.data.children.length >= EXPECTED_MIN_NODES) {
        console.log(`✅ 保留现有有效缓存: ${originalCache.data.children.length} 个节点`);
    } else {
        originalCache = null;
    }
    
    // 重新定义 __mindFullCache 属性，添加智能过滤
    Object.defineProperty(window, '__mindFullCache', {
        get: function() {
            return originalCache;
        },
        set: function(newValue) {
            const now = Date.now();
            cacheSetCount++;
            
            // 检测频繁设置（可能的冲突）
            if (now - lastSetTime < 1000) { // 1秒内的设置
                console.warn(`⚠️ [CachePatch] 检测到频繁缓存设置 (${cacheSetCount}次)`);
            }
            lastSetTime = now;
            
            // 处理 null 值设置
            if (newValue === null || newValue === undefined) {
                console.log(`🗑️ [CachePatch] 忽略缓存清空操作 (保护现有数据)`);
                return; // 不清空现有缓存
            }
            
            // 验证新数据的有效性
            if (newValue && typeof newValue === 'object') {
                let nodeCount = 0;
                let isValid = false;
                
                // 尝试提取节点数量
                if (newValue.data && newValue.data.children) {
                    nodeCount = newValue.data.children.length;
                    isValid = true;
                } else if (newValue.children) {
                    nodeCount = newValue.children.length;
                    isValid = true;
                } else if (Array.isArray(newValue)) {
                    nodeCount = newValue.length;
                    isValid = true;
                }
                
                if (isValid) {
                    // 检查节点数量是否合理
                    if (nodeCount >= EXPECTED_MIN_NODES) {
                        originalCache = newValue;
                        console.log(`✅ [CachePatch] 接受缓存更新: ${nodeCount} 个节点`);
                        
                        // 同步到localStorage
                        try {
                            localStorage.setItem('__mind_full_cache_v1', JSON.stringify(newValue));
                            console.log(`💾 [CachePatch] 已同步到localStorage`);
                        } catch(e) {
                            console.warn(`⚠️ [CachePatch] localStorage同步失败:`, e);
                        }
                        
                    } else if (nodeCount > 0) {
                        console.warn(`⚠️ [CachePatch] 拒绝不完整缓存: ${nodeCount} 个节点 (期望 >= ${EXPECTED_MIN_NODES})`);
                        
                        // 如果当前没有缓存，即使数据不完整也先保存
                        if (!originalCache) {
                            console.log(`📝 [CachePatch] 当前无缓存，临时接受不完整数据`);
                            originalCache = newValue;
                        }
                    } else {
                        console.warn(`❌ [CachePatch] 拒绝空数据缓存`);
                    }
                } else {
                    console.warn(`❌ [CachePatch] 拒绝无效数据格式:`, typeof newValue);
                }
            } else {
                console.warn(`❌ [CachePatch] 拒绝非对象类型:`, typeof newValue);
            }
        },
        configurable: true,
        enumerable: true
    });
    
    // 从localStorage恢复缓存（如果当前缓存无效）
    if (!originalCache) {
        try {
            const stored = localStorage.getItem('__mind_full_cache_v1');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.data && parsed.data.children && 
                    parsed.data.children.length >= EXPECTED_MIN_NODES) {
                    originalCache = parsed;
                    console.log(`🔄 [CachePatch] 从localStorage恢复缓存: ${parsed.data.children.length} 个节点`);
                }
            }
        } catch(e) {
            console.warn(`⚠️ [CachePatch] localStorage恢复失败:`, e);
        }
    }
    
    // 如果仍然没有有效缓存，尝试从API获取
    if (!originalCache) {
        console.log(`🌐 [CachePatch] 尝试从API获取最新数据...`);
        fetch('/api/mindmaps')
            .then(response => response.json())
            .then(data => {
                const targetMindmap = data.mindmaps?.find(m => m.id === 'root-1758256084936-b8');
                if (targetMindmap && targetMindmap.data && targetMindmap.data.data) {
                    const nodeCount = targetMindmap.data.data.children?.length || 0;
                    if (nodeCount >= EXPECTED_MIN_NODES) {
                        const cacheData = {
                            meta: { mind_id: targetMindmap.id, name: targetMindmap.name },
                            format: 'node_tree',
                            data: targetMindmap.data.data
                        };
                        originalCache = cacheData;
                        console.log(`🚀 [CachePatch] 从API恢复缓存: ${nodeCount} 个节点`);
                        
                        // 触发重新渲染
                        if (window.mindmapController && window.mindmapController.mind) {
                            setTimeout(() => {
                                try {
                                    window.mindmapController.mind.show(cacheData);
                                    console.log(`🎯 [CachePatch] 已触发重新渲染`);
                                } catch(e) {
                                    console.warn(`⚠️ [CachePatch] 重新渲染失败:`, e);
                                }
                            }, 500);
                        }
                    }
                }
            })
            .catch(error => {
                console.warn(`⚠️ [CachePatch] API获取失败:`, error);
            });
    }
    
    // 监控缓存状态
    setInterval(() => {
        if (originalCache && originalCache.data && originalCache.data.children) {
            const nodeCount = originalCache.data.children.length;
            if (nodeCount < EXPECTED_MIN_NODES) {
                console.warn(`⚠️ [CachePatch] 缓存数据可能不完整: ${nodeCount} 个节点`);
            }
        }
    }, 30000); // 每30秒检查一次
    
    console.log('✅ 缓存冲突修复补丁已激活');
    
    // 提供手动修复接口
    window.fixCacheNow = function() {
        console.log('🔧 手动执行缓存修复...');
        
        // 强制从API重新获取
        return fetch('/api/mindmaps')
            .then(response => response.json())
            .then(data => {
                const targetMindmap = data.mindmaps?.find(m => m.id === 'root-1758256084936-b8');
                if (targetMindmap && targetMindmap.data && targetMindmap.data.data) {
                    const cacheData = {
                        meta: { mind_id: targetMindmap.id, name: targetMindmap.name },
                        format: 'node_tree',
                        data: targetMindmap.data.data
                    };
                    
                    // 强制设置缓存
                    originalCache = cacheData;
                    localStorage.setItem('__mind_full_cache_v1', JSON.stringify(cacheData));
                    
                    // 强制重新渲染
                    if (window.mindmapController && window.mindmapController.mind) {
                        window.mindmapController.mind.show(cacheData);
                    }
                    
                    const nodeCount = cacheData.data.children?.length || 0;
                    console.log(`✅ 手动修复完成: ${nodeCount} 个节点`);
                    return { success: true, nodeCount };
                } else {
                    console.error('❌ 手动修复失败: 未找到有效数据');
                    return { success: false, error: '未找到有效数据' };
                }
            })
            .catch(error => {
                console.error('❌ 手动修复失败:', error);
                return { success: false, error: error.message };
            });
    };
    
})();

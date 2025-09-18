// 脑图命名问题调试脚本
// 用于验证修复效果和监控命名机制

(function() {
    'use strict';
    
    console.log('[调试脚本] 脑图命名问题监控已启动');
    
    // 监控关键变量和状态
    function checkSystemState() {
        const state = {
            timestamp: new Date().toISOString(),
            mindmapController: {
                exists: !!window.mindmapController,
                dataId: window.mindmapController?.data?.id,
                dataLabel: window.mindmapController?.data?.label,
                rootId: null
            },
            registry: {
                exists: !!window.Registry,
                fsmState: window.Registry?.fsm?.state,
                currentId: window.Registry?.store?.state?.currentId,
                projectCount: window.Registry?.store?.state?.projects?.length
            },
            globalFlags: {
                useNewRegistry: window.__USE_NEW_REGISTRY__,
                storagePause: window.__STORAGE_PAUSE,
                regSyncSuppress: window.__REG_SYNC_SUPPRESS,
                mindFullCache: window.__mindFullCache?.meta?.mind_id
            }
        };
        
        // 获取画布根ID
        try {
            if (window.mindmapController?.mind?.get_root) {
                state.mindmapController.rootId = window.mindmapController.mind.get_root().id;
            }
        } catch (e) {
            state.mindmapController.rootId = 'error: ' + e.message;
        }
        
        return state;
    }
    
    // 监控 upsertFromMindmap 调用
    if (window.Registry?.repo?.upsertFromMindmap) {
        const originalUpsert = window.Registry.repo.upsertFromMindmap;
        window.Registry.repo.upsertFromMindmap = async function(id, name, data) {
            const state = checkSystemState();
            console.log('[调试] upsertFromMindmap 调用:', {
                id: id,
                name: name,
                dataId: data?.id,
                systemState: state,
                stackTrace: new Error().stack.split('\n').slice(1, 4)
            });
            
            // 检查ID不一致问题
            if (id !== data?.id) {
                console.warn('[调试] ⚠️ ID不一致警告:', {
                    upsertId: id,
                    dataId: data?.id,
                    possibleCause: 'mindKey来源问题'
                });
            }
            
            return originalUpsert.call(this, id, name, data);
        };
    }
    
    // 监控项目列表变化
    if (window.Registry?.store?.subscribe) {
        window.Registry.store.subscribe(() => {
            const projects = window.Registry.store.state.projects || [];
            const nameGroups = {};
            
            projects.forEach(p => {
                const name = p.name || '未命名';
                if (!nameGroups[name]) nameGroups[name] = [];
                nameGroups[name].push(p.id);
            });
            
            // 检查重名项目
            Object.keys(nameGroups).forEach(name => {
                if (nameGroups[name].length > 1) {
                    console.warn('[调试] 🔄 发现重名项目:', {
                        name: name,
                        ids: nameGroups[name],
                        count: nameGroups[name].length
                    });
                }
            });
        });
    }
    
    // 定期状态检查
    setInterval(() => {
        const state = checkSystemState();
        
        // 检查关键不一致
        const issues = [];
        
        if (state.mindmapController.dataId !== state.mindmapController.rootId) {
            issues.push('data.id与root.id不一致');
        }
        
        // 检查是否有代码仍在设置 __mindFullCache（应该已经修复）
        if (state.globalFlags.mindFullCache) {
            issues.push('⚠️ __mindFullCache 仍然存在，可能有代码在设置它');
        }
        
        if (issues.length > 0) {
            console.warn('[调试] 🚨 检测到潜在问题:', {
                issues: issues,
                state: state
            });
        } else {
            // 每30秒输出一次正常状态
            if (Date.now() % 30000 < 5000) {
                console.log('[调试] ✅ 系统状态正常');
            }
        }
    }, 5000);
    
    // 暴露调试工具到全局
    window.debugMindmapNaming = {
        checkState: checkSystemState,
        
        // 手动触发ID一致性检查
        checkIdConsistency() {
            const state = checkSystemState();
            console.log('[调试] ID一致性检查:', {
                'mindmapController.data.id': state.mindmapController.dataId,
                'mindmapController.mind.get_root().id': state.mindmapController.rootId,
                '__mindFullCache.meta.mind_id': state.globalFlags.mindFullCache,
                '一致性': state.mindmapController.dataId === state.mindmapController.rootId
            });
        },
        
        // 清理 __mindFullCache（测试用）
        clearMindFullCache() {
            window.__mindFullCache = null;
            console.log('[调试] 已清理 __mindFullCache');
        },
        
        // 强制设置状态机状态
        setRegistryState(newState) {
            if (window.Registry?.fsm) {
                window.Registry.fsm.setState(newState);
                console.log('[调试] 已设置注册表状态为:', newState);
            }
        }
    };
    
    console.log('[调试脚本] 监控工具已就绪，使用 window.debugMindmapNaming 访问调试功能');
})();

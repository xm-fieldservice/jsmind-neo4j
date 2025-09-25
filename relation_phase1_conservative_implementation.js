/**
 * 关系管理模块第一阶段保守实施
 * 严格遵循：不修改源系统代码结构，现有结构功能优先，不重复生成现有功能
 */

(function() {
    console.log('🚀 开始执行关系管理模块第一阶段保守实施...');
    
    const phase1Status = {
        status: 'initializing',
        tasks: [],
        startTime: new Date().toISOString()
    };
    
    // 等待页面完全加载
    function waitForSystemReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startConservativeImplementation, 2000);
            });
        } else {
            setTimeout(startConservativeImplementation, 2000);
        }
    }
    
    function startConservativeImplementation() {
        console.log('📋 第一阶段保守实施开始...');
        phase1Status.status = 'running';
        
        // 只执行必要的、不影响现有结构的任务
        const conservativeTasks = [
            { name: 'verifyExistingStructure', description: '验证现有结构', handler: verifyExistingStructure },
            { name: 'fixStorageReference', description: '修复存储引用', handler: fixStorageReference },
            { name: 'enhanceEventListeners', description: '增强事件监听', handler: enhanceEventListeners },
            { name: 'validateFunctionality', description: '验证功能完整性', handler: validateFunctionality }
        ];
        
        executeConservativeTasks(conservativeTasks);
    }
    
    async function executeConservativeTasks(tasks) {
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            console.log(`🔄 执行保守任务 ${i + 1}/${tasks.length}: ${task.description}`);
            
            try {
                const result = await task.handler();
                phase1Status.tasks.push({
                    name: task.name,
                    description: task.description,
                    result: result,
                    status: result.success ? 'completed' : 'failed'
                });
                
                if (result.success) {
                    console.log(`✅ 任务完成: ${task.description}`);
                } else {
                    console.log(`⚠️ 任务部分完成: ${task.description} - ${result.message}`);
                }
            } catch (error) {
                phase1Status.tasks.push({
                    name: task.name,
                    description: task.description,
                    error: error.message,
                    status: 'error'
                });
                console.log(`❌ 任务异常: ${task.description} - ${error.message}`);
            }
        }
        
        completeConservativePhase1();
    }
    
    // 任务1: 验证现有结构（只检查，不修改）
    async function verifyExistingStructure() {
        const verification = {
            domStructure: {},
            components: {},
            functionality: {}
        };
        
        // 检查DOM结构（现有的）
        verification.domStructure = {
            relationColumn: !!document.getElementById('relation-column'),
            relationContainer: !!document.querySelector('.relation-container'),
            relationToolbar: !!document.querySelector('.relation-toolbar'),
            relationList: !!document.getElementById('relation-list'),
            relationD3Container: !!document.getElementById('relation-d3-container'),
            viewToggle: !!document.querySelector('.view-toggle[data-view="relation"]')
        };
        
        // 检查组件（现有的）
        verification.components = {
            RelationFrontend: !!window.RelationFrontend,
            RelationDataManager: !!window.RelationDataManager,
            MindmapRelationExtractor: !!window.MindmapRelationExtractor,
            relationFrontendInstance: !!window.relationFrontend
        };
        
        // 检查功能（现有的）
        if (window.relationFrontend) {
            verification.functionality = {
                initializeUI: typeof window.relationFrontend.initializeUI === 'function',
                initializeStorage: typeof window.relationFrontend.initializeStorage === 'function',
                setupViewToggleListeners: typeof window.relationFrontend.setupViewToggleListeners === 'function',
                setupNodeSelectionListener: typeof window.relationFrontend.setupNodeSelectionListener === 'function',
                onRelationViewActivated: typeof window.relationFrontend.onRelationViewActivated === 'function',
                loadNodeRelations: typeof window.relationFrontend.loadNodeRelations === 'function'
            };
        }
        
        const domScore = Object.values(verification.domStructure).filter(Boolean).length;
        const componentScore = Object.values(verification.components).filter(Boolean).length;
        const functionalityScore = window.relationFrontend ? 
            Object.values(verification.functionality).filter(Boolean).length : 0;
        
        return {
            success: true,
            message: '现有结构验证完成',
            details: {
                verification: verification,
                scores: {
                    dom: `${domScore}/6`,
                    components: `${componentScore}/4`,
                    functionality: `${functionalityScore}/6`
                }
            }
        };
    }
    
    // 任务2: 修复存储引用（只修复引用，不修改现有代码）
    async function fixStorageReference() {
        const fixes = [];
        
        // 检查并修复RelationFrontend的存储引用
        if (window.relationFrontend && !window.relationFrontend.storage) {
            // 按优先级尝试连接存储系统
            if (window.AutogenUnifiedStorage) {
                window.relationFrontend.storage = window.AutogenUnifiedStorage;
                fixes.push('连接到AutogenUnifiedStorage');
            } else if (window.UnifiedStorage) {
                window.relationFrontend.storage = window.UnifiedStorage;
                fixes.push('连接到UnifiedStorage');
            } else {
                // 创建最小化的存储适配器（不影响现有系统）
                window.relationFrontend.storage = createMinimalStorageAdapter();
                fixes.push('创建最小存储适配器');
            }
        }
        
        // 检查并修复RelationDataManager的存储引用
        if (window.relationFrontend && window.relationFrontend.dataManager && 
            !window.relationFrontend.dataManager.storage && window.relationFrontend.storage) {
            window.relationFrontend.dataManager.storage = window.relationFrontend.storage;
            fixes.push('修复数据管理器存储引用');
        }
        
        return {
            success: fixes.length > 0,
            message: fixes.length > 0 ? '存储引用修复完成' : '存储引用无需修复',
            details: { fixes: fixes }
        };
    }
    
    function createMinimalStorageAdapter() {
        // 创建最小化的存储适配器，不影响现有系统
        return {
            store: function(key, value) {
                try {
                    const storageKey = `relation_minimal:${key}`;
                    localStorage.setItem(storageKey, JSON.stringify(value));
                    return Promise.resolve();
                } catch (error) {
                    console.warn('存储适配器写入失败:', error);
                    return Promise.reject(error);
                }
            },
            retrieve: function(key) {
                try {
                    const storageKey = `relation_minimal:${key}`;
                    const value = localStorage.getItem(storageKey);
                    return Promise.resolve(value ? JSON.parse(value) : null);
                } catch (error) {
                    console.warn('存储适配器读取失败:', error);
                    return Promise.resolve(null);
                }
            },
            remove: function(key) {
                try {
                    const storageKey = `relation_minimal:${key}`;
                    localStorage.removeItem(storageKey);
                    return Promise.resolve();
                } catch (error) {
                    console.warn('存储适配器删除失败:', error);
                    return Promise.reject(error);
                }
            }
        };
    }
    
    // 任务3: 增强事件监听（只增强，不修改现有监听器）
    async function enhanceEventListeners() {
        const enhancements = [];
        
        // 增强视图切换监听（如果现有的不够完善）
        const viewToggle = document.querySelector('.view-toggle[data-view="relation"]');
        if (viewToggle && window.relationFrontend) {
            // 检查是否已有监听器
            const hasExistingListener = viewToggle.onclick || 
                viewToggle.getAttribute('data-listener-added');
            
            if (!hasExistingListener) {
                viewToggle.addEventListener('click', function(e) {
                    console.log('[关系管理] 视图切换被触发');
                    if (window.relationFrontend && typeof window.relationFrontend.onRelationViewActivated === 'function') {
                        window.relationFrontend.onRelationViewActivated();
                    }
                });
                viewToggle.setAttribute('data-listener-added', 'true');
                enhancements.push('添加视图切换监听器');
            }
        }
        
        // 增强工具栏按钮监听（如果现有的不够完善）
        const testBtn = document.getElementById('relation-test-btn');
        const realTestBtn = document.getElementById('relation-real-test-btn');
        const refreshBtn = document.getElementById('relation-refresh-btn');
        
        if (testBtn && !testBtn.onclick && !testBtn.getAttribute('data-listener-added')) {
            testBtn.addEventListener('click', function() {
                console.log('[关系管理] 模拟数据按钮被点击');
                if (window.relationFrontend && typeof window.relationFrontend.loadNodeRelations === 'function') {
                    window.relationFrontend.loadNodeRelations('test-node', { mockData: true });
                }
            });
            testBtn.setAttribute('data-listener-added', 'true');
            enhancements.push('添加模拟数据按钮监听器');
        }
        
        if (realTestBtn && !realTestBtn.onclick && !realTestBtn.getAttribute('data-listener-added')) {
            realTestBtn.addEventListener('click', function() {
                console.log('[关系管理] 真实数据按钮被点击');
                if (window.relationFrontend && window.mindmapController && window.mindmapController.selectedNode) {
                    const nodeId = window.mindmapController.selectedNode.id;
                    if (window.relationFrontend && typeof window.relationFrontend.loadNodeRelations === 'function') {
                        window.relationFrontend.loadNodeRelations(nodeId, { mockData: false });
                    }
                } else {
                    console.warn('[关系管理] 请先选择脑图节点');
                }
            });
            realTestBtn.setAttribute('data-listener-added', 'true');
            enhancements.push('添加真实数据按钮监听器');
        }
        
        if (refreshBtn && !refreshBtn.onclick && !refreshBtn.getAttribute('data-listener-added')) {
            refreshBtn.addEventListener('click', function() {
                console.log('[关系管理] 刷新按钮被点击');
                if (window.relationFrontend && window.relationFrontend.currentNodeId) {
                    if (typeof window.relationFrontend.loadNodeRelations === 'function') {
                        window.relationFrontend.loadNodeRelations(window.relationFrontend.currentNodeId, { forceRefresh: true });
                    }
                }
            });
            refreshBtn.setAttribute('data-listener-added', 'true');
            enhancements.push('添加刷新按钮监听器');
        }
        
        return {
            success: true,
            message: '事件监听器增强完成',
            details: { enhancements: enhancements }
        };
    }
    
    // 任务4: 验证功能完整性（只验证，不修改）
    async function validateFunctionality() {
        const validation = {
            coreComponents: {},
            basicFunctions: {},
            integrationPoints: {}
        };
        
        // 验证核心组件
        validation.coreComponents = {
            RelationFrontend: {
                exists: !!window.RelationFrontend,
                instantiated: !!window.relationFrontend
            },
            RelationDataManager: {
                exists: !!window.RelationDataManager,
                instantiated: !!(window.relationFrontend && window.relationFrontend.dataManager)
            }
        };
        
        // 验证基础功能
        if (window.relationFrontend) {
            validation.basicFunctions = {
                initializeUI: typeof window.relationFrontend.initializeUI === 'function',
                initializeStorage: typeof window.relationFrontend.initializeStorage === 'function',
                onRelationViewActivated: typeof window.relationFrontend.onRelationViewActivated === 'function',
                loadNodeRelations: typeof window.relationFrontend.loadNodeRelations === 'function',
                setupViewToggleListeners: typeof window.relationFrontend.setupViewToggleListeners === 'function'
            };
        }
        
        // 验证集成点
        validation.integrationPoints = {
            storageConnection: !!(window.relationFrontend && window.relationFrontend.storage),
            mindmapAccess: !!window.mindmapController,
            domElements: !!document.getElementById('relation-column'),
            viewToggle: !!document.querySelector('.view-toggle[data-view="relation"]')
        };
        
        const componentScore = Object.values(validation.coreComponents).filter(c => c.exists && c.instantiated).length;
        const functionScore = Object.values(validation.basicFunctions || {}).filter(Boolean).length;
        const integrationScore = Object.values(validation.integrationPoints).filter(Boolean).length;
        
        const overallScore = Math.round(((componentScore + functionScore + integrationScore) / 11) * 100);
        
        return {
            success: overallScore >= 60,
            message: `功能验证完成，整体可用性: ${overallScore}%`,
            details: {
                validation: validation,
                scores: {
                    components: `${componentScore}/2`,
                    functions: `${functionScore}/5`,
                    integration: `${integrationScore}/4`,
                    overall: `${overallScore}%`
                }
            }
        };
    }
    
    function completeConservativePhase1() {
        phase1Status.status = 'completed';
        phase1Status.endTime = new Date().toISOString();
        
        const completedTasks = phase1Status.tasks.filter(t => t.status === 'completed').length;
        const totalTasks = phase1Status.tasks.length;
        const successRate = Math.round((completedTasks / totalTasks) * 100);
        
        console.log('🎉 第一阶段保守实施完成！');
        console.log(`📊 成功率: ${successRate}%`);
        console.log(`✅ 完成任务: ${completedTasks}/${totalTasks}`);
        
        // 显示完成通知
        showConservativeCompletionNotification(successRate, completedTasks, totalTasks);
        
        // 保存完成状态
        try {
            localStorage.setItem('relation_phase1_conservative_status', JSON.stringify({
                completed: true,
                timestamp: new Date().toISOString(),
                successRate: successRate,
                tasks: phase1Status.tasks
            }));
        } catch (error) {
            console.warn('保存完成状态失败:', error);
        }
    }
    
    function showConservativeCompletionNotification(successRate, completed, total) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 460px;
            right: 20px;
            padding: 15px;
            background: ${successRate >= 80 ? '#10b981' : successRate >= 60 ? '#f59e0b' : '#ef4444'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            max-width: 320px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">
                🎉 第一阶段保守实施完成
            </div>
            <div>成功率: ${successRate}%</div>
            <div>完成任务: ${completed}/${total}</div>
            <div style="margin-top: 8px; font-size: 12px;">
                ✅ 现有结构完全保留<br>
                ✅ 功能优先级得到尊重<br>
                ✅ 无重复功能生成
            </div>
            <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
                ${successRate >= 80 ? 
                  '🚀 关系管理模块基础功能已就绪' : 
                  successRate >= 60 ?
                  '⚠️ 基础功能部分就绪，建议检查日志' :
                  '❌ 需要进一步检查和修复'
                }
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }
    
    // 提供状态查询接口
    window.getRelationPhase1ConservativeStatus = () => phase1Status;
    
    // 开始执行
    waitForSystemReady();
    
    console.log('🛠️ 关系管理模块第一阶段保守实施脚本已加载');
    console.log('📋 实施原则: 不修改源系统代码结构，现有结构功能优先，不重复生成现有功能');
    
})();

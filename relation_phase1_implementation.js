/**
 * 关系管理模块完成方案 - 第一阶段实施
 * 基础完善阶段：确保核心功能可用
 */

(function() {
    console.log('🚀 开始执行关系管理模块第一阶段完善...');
    
    const phase1Implementation = {
        status: 'initializing',
        completedTasks: [],
        failedTasks: [],
        progress: 0
    };
    
    // 等待页面加载完成
    function waitForPageReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startPhase1Implementation);
        } else {
            setTimeout(startPhase1Implementation, 1000);
        }
    }
    
    function startPhase1Implementation() {
        console.log('📋 第一阶段：基础完善开始执行...');
        phase1Implementation.status = 'running';
        
        const tasks = [
            { name: 'coreComponentCheck', description: '核心组件检查', handler: checkCoreComponents },
            { name: 'domStructureComplete', description: 'DOM结构完善', handler: completeDOMStructure },
            { name: 'basicFunctionTest', description: '基础功能测试', handler: testBasicFunctions },
            { name: 'storageIntegration', description: '存储集成修复', handler: fixStorageIntegration },
            { name: 'eventSystemSetup', description: '事件系统设置', handler: setupEventSystem }
        ];
        
        executeTasksSequentially(tasks);
    }
    
    async function executeTasksSequentially(tasks) {
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            console.log(`🔄 执行任务 ${i + 1}/${tasks.length}: ${task.description}`);
            
            try {
                const result = await task.handler();
                if (result.success) {
                    phase1Implementation.completedTasks.push({
                        name: task.name,
                        description: task.description,
                        result: result
                    });
                    console.log(`✅ 任务完成: ${task.description}`);
                } else {
                    phase1Implementation.failedTasks.push({
                        name: task.name,
                        description: task.description,
                        error: result.error
                    });
                    console.log(`❌ 任务失败: ${task.description} - ${result.error}`);
                }
            } catch (error) {
                phase1Implementation.failedTasks.push({
                    name: task.name,
                    description: task.description,
                    error: error.message
                });
                console.log(`❌ 任务异常: ${task.description} - ${error.message}`);
            }
            
            phase1Implementation.progress = Math.round(((i + 1) / tasks.length) * 100);
            updateProgressDisplay();
        }
        
        completePhase1();
    }
    
    // 任务1: 核心组件检查
    async function checkCoreComponents() {
        const components = {
            RelationFrontend: !!window.RelationFrontend,
            RelationDataManager: !!window.RelationDataManager,
            MindmapRelationExtractor: !!window.MindmapRelationExtractor,
            relationFrontendInstance: !!window.relationFrontend
        };
        
        const missing = Object.keys(components).filter(key => !components[key]);
        
        if (missing.length > 0) {
            // 尝试修复缺失的组件
            await attemptComponentRecovery(missing);
            
            // 重新检查
            const recheck = {
                RelationFrontend: !!window.RelationFrontend,
                RelationDataManager: !!window.RelationDataManager,
                MindmapRelationExtractor: !!window.MindmapRelationExtractor,
                relationFrontendInstance: !!window.relationFrontend
            };
            
            const stillMissing = Object.keys(recheck).filter(key => !recheck[key]);
            
            if (stillMissing.length > 0) {
                return {
                    success: false,
                    error: `关键组件缺失: ${stillMissing.join(', ')}`,
                    details: { components: recheck, missing: stillMissing }
                };
            }
        }
        
        return {
            success: true,
            message: '所有核心组件检查通过',
            details: { components: components }
        };
    }
    
    async function attemptComponentRecovery(missing) {
        console.log('🔧 尝试恢复缺失的组件:', missing);
        
        // 如果relationFrontend实例缺失，尝试创建
        if (missing.includes('relationFrontendInstance') && window.RelationFrontend) {
            try {
                window.relationFrontend = new RelationFrontend();
                console.log('✅ RelationFrontend实例已创建');
            } catch (error) {
                console.warn('⚠️ RelationFrontend实例创建失败:', error);
            }
        }
        
        // 给组件加载一些时间
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 任务2: DOM结构完善
    async function completeDOMStructure() {
        const requiredElements = [
            { id: 'relation-container', parent: 'relation-column', className: 'relation-container' },
            { id: 'relation-list', parent: 'relation-container', className: 'relation-list' },
            { id: 'relation-d3-container', parent: 'relation-container', className: 'relation-d3-container' },
            { id: 'relation-toolbar', parent: 'relation-column', className: 'relation-toolbar' }
        ];
        
        const created = [];
        const failed = [];
        
        requiredElements.forEach(element => {
            if (!document.getElementById(element.id)) {
                try {
                    const parent = document.getElementById(element.parent);
                    if (parent) {
                        const newElement = document.createElement('div');
                        newElement.id = element.id;
                        newElement.className = element.className;
                        
                        // 添加基础内容
                        if (element.id === 'relation-toolbar') {
                            newElement.innerHTML = `
                                <button class="relation-btn" data-action="refresh">刷新</button>
                                <button class="relation-btn" data-action="test">测试</button>
                                <button class="relation-btn" data-action="sync">同步</button>
                            `;
                        } else if (element.id === 'relation-list') {
                            newElement.innerHTML = '<div class="relation-list-content">关系列表加载中...</div>';
                        } else if (element.id === 'relation-d3-container') {
                            newElement.innerHTML = '<div class="d3-graph-placeholder">D3关系图容器</div>';
                        }
                        
                        parent.appendChild(newElement);
                        created.push(element.id);
                        console.log(`✅ 创建DOM元素: ${element.id}`);
                    } else {
                        failed.push(`父元素不存在: ${element.parent}`);
                    }
                } catch (error) {
                    failed.push(`创建${element.id}失败: ${error.message}`);
                }
            }
        });
        
        return {
            success: failed.length === 0,
            message: failed.length === 0 ? 'DOM结构完善成功' : `部分DOM元素创建失败`,
            details: { created: created, failed: failed }
        };
    }
    
    // 任务3: 基础功能测试
    async function testBasicFunctions() {
        if (!window.relationFrontend) {
            return {
                success: false,
                error: 'RelationFrontend实例不存在'
            };
        }
        
        const tests = [
            {
                name: 'initializeUI',
                test: () => typeof window.relationFrontend.initializeUI === 'function',
                description: 'UI初始化方法'
            },
            {
                name: 'onRelationViewActivated',
                test: () => typeof window.relationFrontend.onRelationViewActivated === 'function',
                description: '视图激活方法'
            },
            {
                name: 'loadNodeRelations',
                test: () => typeof window.relationFrontend.loadNodeRelations === 'function',
                description: '关系加载方法'
            },
            {
                name: 'setupViewToggleListeners',
                test: () => typeof window.relationFrontend.setupViewToggleListeners === 'function',
                description: '视图切换监听器'
            }
        ];
        
        const results = [];
        let passedCount = 0;
        
        tests.forEach(test => {
            try {
                const passed = test.test();
                results.push({
                    name: test.name,
                    description: test.description,
                    passed: passed
                });
                if (passed) passedCount++;
            } catch (error) {
                results.push({
                    name: test.name,
                    description: test.description,
                    passed: false,
                    error: error.message
                });
            }
        });
        
        const successRate = (passedCount / tests.length) * 100;
        
        return {
            success: successRate >= 80,
            message: `基础功能测试完成，通过率: ${Math.round(successRate)}%`,
            details: { results: results, passedCount: passedCount, totalCount: tests.length }
        };
    }
    
    // 任务4: 存储集成修复
    async function fixStorageIntegration() {
        if (!window.relationFrontend) {
            return {
                success: false,
                error: 'RelationFrontend实例不存在'
            };
        }
        
        const fixes = [];
        
        // 修复存储引用
        if (!window.relationFrontend.storage) {
            if (window.AutogenUnifiedStorage) {
                window.relationFrontend.storage = window.AutogenUnifiedStorage;
                fixes.push('连接到AutogenUnifiedStorage');
            } else if (window.UnifiedStorage) {
                window.relationFrontend.storage = window.UnifiedStorage;
                fixes.push('连接到UnifiedStorage');
            } else {
                // 创建简单的存储适配器
                window.relationFrontend.storage = createStorageAdapter();
                fixes.push('创建存储适配器');
            }
        }
        
        // 修复数据管理器的存储引用
        if (window.relationFrontend.dataManager && !window.relationFrontend.dataManager.storage) {
            window.relationFrontend.dataManager.storage = window.relationFrontend.storage;
            fixes.push('修复数据管理器存储引用');
        }
        
        return {
            success: true,
            message: '存储集成修复完成',
            details: { fixes: fixes }
        };
    }
    
    function createStorageAdapter() {
        return {
            store: function(key, value) {
                try {
                    localStorage.setItem(`relation:${key}`, JSON.stringify(value));
                    return Promise.resolve();
                } catch (error) {
                    return Promise.reject(error);
                }
            },
            retrieve: function(key) {
                try {
                    const value = localStorage.getItem(`relation:${key}`);
                    return Promise.resolve(value ? JSON.parse(value) : null);
                } catch (error) {
                    return Promise.reject(error);
                }
            },
            remove: function(key) {
                try {
                    localStorage.removeItem(`relation:${key}`);
                    return Promise.resolve();
                } catch (error) {
                    return Promise.reject(error);
                }
            }
        };
    }
    
    // 任务5: 事件系统设置
    async function setupEventSystem() {
        const setups = [];
        
        // 设置视图切换监听
        const viewToggle = document.querySelector('.view-toggle[data-view="relation"]');
        if (viewToggle && window.relationFrontend) {
            try {
                if (typeof window.relationFrontend.setupViewToggleListeners === 'function') {
                    window.relationFrontend.setupViewToggleListeners();
                    setups.push('视图切换监听器设置');
                }
            } catch (error) {
                console.warn('视图切换监听器设置失败:', error);
            }
        }
        
        // 设置节点选择监听
        if (window.relationFrontend && window.mindmapController) {
            try {
                if (typeof window.relationFrontend.setupNodeSelectionListener === 'function') {
                    window.relationFrontend.setupNodeSelectionListener();
                    setups.push('节点选择监听器设置');
                }
            } catch (error) {
                console.warn('节点选择监听器设置失败:', error);
            }
        }
        
        return {
            success: setups.length > 0,
            message: setups.length > 0 ? '事件系统设置完成' : '事件系统设置部分完成',
            details: { setups: setups }
        };
    }
    
    function updateProgressDisplay() {
        // 更新进度显示（如果有进度条的话）
        console.log(`📊 第一阶段进度: ${phase1Implementation.progress}%`);
    }
    
    function completePhase1() {
        phase1Implementation.status = 'completed';
        
        const successRate = (phase1Implementation.completedTasks.length / 
                           (phase1Implementation.completedTasks.length + phase1Implementation.failedTasks.length)) * 100;
        
        console.log('🎉 第一阶段完成！');
        console.log(`📊 成功率: ${Math.round(successRate)}%`);
        console.log(`✅ 完成任务: ${phase1Implementation.completedTasks.length}`);
        console.log(`❌ 失败任务: ${phase1Implementation.failedTasks.length}`);
        
        // 显示完成报告
        showPhase1Report();
        
        // 保存完成状态
        try {
            localStorage.setItem('relation_phase1_status', JSON.stringify({
                completed: true,
                timestamp: new Date().toISOString(),
                successRate: successRate,
                completedTasks: phase1Implementation.completedTasks.length,
                failedTasks: phase1Implementation.failedTasks.length
            }));
        } catch (error) {
            console.warn('保存完成状态失败:', error);
        }
    }
    
    function showPhase1Report() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 420px;
            right: 20px;
            padding: 15px;
            background: ${phase1Implementation.failedTasks.length === 0 ? '#10b981' : '#f59e0b'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;
        
        const successRate = (phase1Implementation.completedTasks.length / 
                           (phase1Implementation.completedTasks.length + phase1Implementation.failedTasks.length)) * 100;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">
                🎉 第一阶段完成
            </div>
            <div>成功率: ${Math.round(successRate)}%</div>
            <div>完成: ${phase1Implementation.completedTasks.length}</div>
            <div>失败: ${phase1Implementation.failedTasks.length}</div>
            <div style="margin-top: 8px; font-size: 12px;">
                ${phase1Implementation.failedTasks.length === 0 ? 
                  '✅ 所有任务完成，可以进入第二阶段' : 
                  '⚠️ 部分任务失败，建议检查后再进入下一阶段'
                }
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 8000);
    }
    
    // 提供手动执行接口
    window.executeRelationPhase1 = startPhase1Implementation;
    window.getPhase1Status = () => phase1Implementation;
    
    // 自动开始执行
    waitForPageReady();
    
    console.log('🛠️ 关系管理模块第一阶段实施脚本已加载');
    
})();

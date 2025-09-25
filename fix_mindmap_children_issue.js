/**
 * 修复脑图子节点添加问题
 * 分析和解决为什么添加的子节点没有显示的问题
 */

(function() {
    console.log('🔧 开始修复脑图子节点添加问题...');
    
    const issueAnalysis = {
        possibleCauses: [
            '1. JSON文件中节点没有children属性',
            '2. children属性为空数组但没有正确保存',
            '3. 脑图渲染时没有正确处理children',
            '4. 数据格式不匹配脑图系统要求',
            '5. 保存机制没有正确写入文件',
            '6. 脑图刷新机制有问题'
        ],
        solutions: []
    };
    
    function analyzeCurrentState() {
        console.log('📊 分析当前状态...');
        
        if (!window.mindmapController) {
            console.error('❌ mindmapController不存在');
            return { success: false, error: 'mindmapController不存在' };
        }
        
        if (!window.mindmapController.data) {
            console.error('❌ mindmapController.data不存在');
            return { success: false, error: 'mindmapController.data不存在' };
        }
        
        // 查找目标节点
        const targetNode = findNodeById(window.mindmapController.data, '9809480ec54ed01f');
        if (!targetNode) {
            console.error('❌ 未找到实施路径记录节点');
            return { success: false, error: '未找到实施路径记录节点' };
        }
        
        console.log('✅ 找到目标节点:', targetNode.topic);
        
        // 分析节点结构
        const analysis = {
            hasChildren: 'children' in targetNode,
            childrenType: typeof targetNode.children,
            childrenValue: targetNode.children,
            childrenLength: targetNode.children ? targetNode.children.length : 0,
            nodeStructure: Object.keys(targetNode)
        };
        
        console.log('📋 节点分析结果:', analysis);
        
        return { success: true, analysis: analysis, targetNode: targetNode };
    }
    
    function findNodeById(node, targetId) {
        if (node.id === targetId) {
            return node;
        }
        if (node.children) {
            for (let child of node.children) {
                const found = findNodeById(child, targetId);
                if (found) return found;
            }
        }
        return null;
    }
    
    function countAllNodes(node) {
        if (!node) return 0;
        let count = 1;
        if (node.children) {
            for (let child of node.children) {
                count += countAllNodes(child);
            }
        }
        return count;
    }
    
    function fixChildrenStructure() {
        console.log('🔧 修复children结构...');
        
        const state = analyzeCurrentState();
        if (!state.success) {
            return state;
        }
        
        const targetNode = state.targetNode;
        const fixes = [];
        
        // 修复1: 确保children属性存在
        if (!('children' in targetNode)) {
            targetNode.children = [];
            fixes.push('添加children属性');
            console.log('✅ 添加children属性');
        }
        
        // 修复2: 确保children是数组
        if (targetNode.children && !Array.isArray(targetNode.children)) {
            targetNode.children = [];
            fixes.push('修正children为数组');
            console.log('✅ 修正children为数组');
        }
        
        // 修复3: 如果children为null或undefined，初始化为空数组
        if (!targetNode.children) {
            targetNode.children = [];
            fixes.push('初始化children为空数组');
            console.log('✅ 初始化children为空数组');
        }
        
        return { success: true, fixes: fixes, targetNode: targetNode };
    }
    
    function addTestRecord() {
        console.log('📝 添加测试记录...');
        
        const fixResult = fixChildrenStructure();
        if (!fixResult.success) {
            return fixResult;
        }
        
        const targetNode = fixResult.targetNode;
        
        // 创建测试记录节点
        const testRecord = {
            id: 'test_record_' + Date.now(),
            topic: '🧪 测试实施记录 (' + new Date().toLocaleTimeString() + ')',
            expanded: true,
            direction: 'right',
            data: {
                type: 'test_implementation_record',
                timestamp: new Date().toISOString(),
                description: '这是一个测试记录，用于验证子节点添加功能'
            },
            children: [
                {
                    id: 'test_summary_' + Date.now(),
                    topic: '📊 测试摘要',
                    expanded: true,
                    data: {
                        type: 'test_summary',
                        successRate: 100,
                        tasksCompleted: 1
                    },
                    children: [
                        {
                            id: 'test_detail_' + Date.now(),
                            topic: '✅ 测试任务完成',
                            data: {
                                type: 'test_task',
                                status: 'completed'
                            }
                        }
                    ]
                },
                {
                    id: 'test_files_' + Date.now(),
                    topic: '📁 创建的文件',
                    expanded: false,
                    data: {
                        type: 'test_files'
                    },
                    children: [
                        {
                            id: 'test_file1_' + Date.now(),
                            topic: 'debug_mindmap_node.js',
                            data: {
                                type: 'test_file',
                                filename: 'debug_mindmap_node.js'
                            }
                        },
                        {
                            id: 'test_file2_' + Date.now(),
                            topic: 'fix_mindmap_children_issue.js',
                            data: {
                                type: 'test_file',
                                filename: 'fix_mindmap_children_issue.js'
                            }
                        }
                    ]
                }
            ]
        };
        
        // 添加到目标节点
        targetNode.children.push(testRecord);
        console.log('✅ 测试记录已添加到children数组');
        console.log('📋 当前children长度:', targetNode.children.length);
        
        return { success: true, testRecord: testRecord, targetNode: targetNode };
    }
    
    async function saveAndRefresh() {
        console.log('💾 保存并刷新脑图...');
        
        try {
            // 方法1: 使用mindmapController的保存方法
            if (window.mindmapController && typeof window.mindmapController.saveMindmapToStorage === 'function') {
                window.mindmapController.saveMindmapToStorage(true);
                console.log('✅ 使用mindmapController.saveMindmapToStorage保存');
            }
            
            // 方法2: 使用AutogenUnifiedStorage（修复API调用）
            if (window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage.store === 'function') {
                try {
                    await window.AutogenUnifiedStorage.store('mindmap_data', window.mindmapController.data);
                    console.log('✅ 使用AutogenUnifiedStorage.store保存');
                } catch (storeError) {
                    console.warn('⚠️ AutogenUnifiedStorage.store失败:', storeError);
                }
            }
            
            // 方法3: 创建压缩备份（避免localStorage配额问题）
            try {
                const compactBackup = {
                    timestamp: new Date().toISOString(),
                    nodeCount: countAllNodes(window.mindmapController.data),
                    targetNodeChildren: window.mindmapController.data ? 
                        findNodeById(window.mindmapController.data, '9809480ec54ed01f')?.children?.length || 0 : 0
                };
                localStorage.setItem('mindmap_backup_compact', JSON.stringify(compactBackup));
                console.log('✅ 创建压缩备份');
            } catch (backupError) {
                console.warn('⚠️ 创建备份失败:', backupError);
            }
            
            // 刷新脑图显示
            if (window.mindmapController && typeof window.mindmapController.renderMindmap === 'function') {
                window.mindmapController.renderMindmap();
                console.log('✅ 重新渲染脑图');
            }
            
            // 强制刷新页面（如果其他方法都不行）
            // setTimeout(() => {
            //     console.log('🔄 强制刷新页面...');
            //     window.location.reload();
            // }, 2000);
            
            return { success: true, message: '保存并刷新完成' };
            
        } catch (error) {
            console.error('❌ 保存或刷新失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    async function runCompleteFix() {
        console.log('🚀 运行完整修复流程...');
        
        const steps = [
            { name: '分析当前状态', func: analyzeCurrentState },
            { name: '修复children结构', func: fixChildrenStructure },
            { name: '添加测试记录', func: addTestRecord },
            { name: '保存并刷新', func: saveAndRefresh }
        ];
        
        const results = [];
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`🔄 步骤 ${i + 1}: ${step.name}`);
            
            try {
                const result = await step.func();
                results.push({
                    step: step.name,
                    success: result.success,
                    result: result
                });
                
                if (!result.success) {
                    console.error(`❌ 步骤失败: ${step.name}`, result.error);
                    break;
                }
                
                console.log(`✅ 步骤完成: ${step.name}`);
                
            } catch (error) {
                console.error(`❌ 步骤异常: ${step.name}`, error);
                results.push({
                    step: step.name,
                    success: false,
                    error: error.message
                });
                break;
            }
        }
        
        console.log('📊 修复流程完成，结果:', results);
        return results;
    }
    
    // 创建修复按钮
    function createFixButton() {
        const button = document.createElement('button');
        button.textContent = '🔧 修复子节点问题';
        button.style.cssText = `
            position: fixed;
            top: 660px;
            right: 20px;
            padding: 8px 12px;
            background: #f59e0b;
            color: white;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            z-index: 10000;
            font-size: 12px;
            font-weight: 500;
        `;
        
        button.addEventListener('click', async () => {
            button.textContent = '⏳ 修复中...';
            button.disabled = true;
            
            try {
                const results = await runCompleteFix();
                const successCount = results.filter(r => r.success).length;
                
                if (successCount === results.length) {
                    button.textContent = '✅ 修复完成';
                    button.style.background = '#10b981';
                    
                    // 显示成功通知
                    showFixNotification(true, `成功完成 ${successCount}/${results.length} 个步骤`);
                } else {
                    button.textContent = '⚠️ 部分修复';
                    button.style.background = '#f59e0b';
                    
                    // 显示部分成功通知
                    showFixNotification(false, `完成 ${successCount}/${results.length} 个步骤`);
                }
                
            } catch (error) {
                button.textContent = '❌ 修复失败';
                button.style.background = '#ef4444';
                
                // 显示失败通知
                showFixNotification(false, error.message);
                
                console.error('修复流程异常:', error);
            }
            
            setTimeout(() => {
                button.textContent = '🔧 修复子节点问题';
                button.disabled = false;
                button.style.background = '#f59e0b';
            }, 5000);
        });
        
        document.body.appendChild(button);
        console.log('🔘 修复按钮已创建');
    }
    
    function showFixNotification(success, message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 700px;
            right: 20px;
            padding: 15px;
            background: ${success ? '#10b981' : '#f59e0b'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 14px;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">
                ${success ? '✅ 修复成功' : '⚠️ 修复部分完成'}
            </div>
            <div style="font-size: 12px;">
                ${message}
            </div>
            <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
                ${success ? '请检查脑图中的"实施路径记录"节点' : '请查看控制台了解详细信息'}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 8000);
    }
    
    // 延迟创建按钮
    setTimeout(() => {
        createFixButton();
        console.log('💡 点击"🔧 修复子节点问题"按钮运行完整修复流程');
    }, 15000);
    
    // 导出修复函数
    window.fixMindmapChildrenIssue = {
        analyzeCurrentState: analyzeCurrentState,
        fixChildrenStructure: fixChildrenStructure,
        addTestRecord: addTestRecord,
        saveAndRefresh: saveAndRefresh,
        runCompleteFix: runCompleteFix
    };
    
    console.log('🛠️ 脑图子节点修复脚本已加载');
    
})();

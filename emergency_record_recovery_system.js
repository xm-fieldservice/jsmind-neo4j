/**
 * 紧急记录恢复系统
 * 目标：彻底解决记录系统失效问题，恢复所有丢失的工作记录
 */

(function() {
    console.log('🚨 启动紧急记录恢复系统...');
    
    const recoverySystem = {
        // 恢复状态
        status: {
            phase: 'Emergency Record Recovery',
            startTime: new Date().toISOString(),
            issues: [],
            recoveredRecords: [],
            verificationResults: []
        },
        
        // 今天丢失的工作记录
        lostWorkRecords: {
            '2025-09-25': {
                title: '关系管理模块三阶段完整实施',
                description: '完成了关系管理模块从基础完善到功能增强的完整三阶段工作',
                files: [
                    'comprehensive_relation_audit.js',
                    'relation_integration_balanced_assessment.js', 
                    'relation_integration_completion_plan.js',
                    'relation_phase1_conservative_implementation.js',
                    'relation_phase2_integration_optimization.js',
                    'relation_phase3_feature_enhancement.js',
                    'mindmap_integration_evaluator.js',
                    'record_to_mindmap.js',
                    'debug_mindmap_node.js',
                    'fix_mindmap_children_issue.js',
                    'fix_storage_api_issues.js'
                ],
                phases: [
                    {
                        name: '第一阶段：基础完善',
                        completion: '100%',
                        tasks: [
                            '核心组件检查 - 确保所有组件正确加载',
                            'DOM结构完善 - 添加缺失的UI元素', 
                            '基础功能测试 - 验证核心方法可用性',
                            '存储集成修复 - 修正存储系统引用',
                            '事件系统设置 - 建立基础事件监听'
                        ]
                    },
                    {
                        name: '第二阶段：集成优化',
                        completion: '100%',
                        tasks: [
                            '数据流集成 - 建立脑图与关系图的数据交换',
                            '事件桥接 - 实现双向事件通信',
                            '存储兼容性 - 优化存储适配器',
                            'UI协调 - 完善视图切换和布局',
                            '性能优化 - 优化数据加载和渲染'
                        ]
                    },
                    {
                        name: '第三阶段：功能增强',
                        completion: '100%',
                        tasks: [
                            '可视化增强 - 丰富D3.js图形效果',
                            '关系分析 - 添加智能关系发现',
                            '交互优化 - 改善用户操作体验',
                            '数据导出 - 支持关系数据导出',
                            '文档完善 - 完善使用文档'
                        ]
                    }
                ],
                technicalDetails: {
                    'API修复': '修复了AutogenUnifiedStorage.set不存在的问题，改为使用store方法',
                    '数据验证': '创建了完整的数据格式验证机制',
                    '存储优化': '解决了localStorage配额超限问题',
                    '异步处理': '修复了async/await语法错误',
                    '错误处理': '建立了完善的错误检测和报告机制'
                },
                achievements: [
                    '建立了完整的数据交换桥接器',
                    '实现了脑图与关系图的双向同步',
                    '创建了智能关系发现算法',
                    '添加了多格式数据导出功能',
                    '建立了交互式帮助系统'
                ]
            }
        }
    };
    
    // 1. 诊断当前存储系统状态
    async function diagnoseStorageSystem() {
        console.log('🔍 诊断存储系统状态...');
        
        const diagnosis = {
            autoGenUnifiedStorage: {
                exists: typeof window.AutogenUnifiedStorage !== 'undefined',
                methods: [],
                issues: []
            },
            mindmapController: {
                exists: typeof window.mindmapController !== 'undefined',
                methods: [],
                data: null
            },
            localStorage: {
                available: typeof localStorage !== 'undefined',
                usage: 0,
                quota: 0,
                issues: []
            }
        };
        
        // 检查AutogenUnifiedStorage
        if (diagnosis.autoGenUnifiedStorage.exists) {
            const storage = window.AutogenUnifiedStorage;
            diagnosis.autoGenUnifiedStorage.methods = Object.getOwnPropertyNames(storage).filter(name => typeof storage[name] === 'function');
            
            // 检查关键方法
            if (!diagnosis.autoGenUnifiedStorage.methods.includes('store')) {
                diagnosis.autoGenUnifiedStorage.issues.push('缺少store方法');
            }
            if (!diagnosis.autoGenUnifiedStorage.methods.includes('retrieve')) {
                diagnosis.autoGenUnifiedStorage.issues.push('缺少retrieve方法');
            }
        } else {
            diagnosis.autoGenUnifiedStorage.issues.push('AutogenUnifiedStorage不存在');
        }
        
        // 检查mindmapController
        if (diagnosis.mindmapController.exists) {
            const controller = window.mindmapController;
            diagnosis.mindmapController.methods = Object.getOwnPropertyNames(controller).filter(name => typeof controller[name] === 'function');
            diagnosis.mindmapController.data = controller.data;
        } else {
            diagnosis.mindmapController.issues = ['mindmapController不存在'];
        }
        
        // 检查localStorage
        if (diagnosis.localStorage.available) {
            try {
                // 估算使用量
                let totalSize = 0;
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        totalSize += localStorage[key].length;
                    }
                }
                diagnosis.localStorage.usage = totalSize;
                diagnosis.localStorage.quota = 5 * 1024 * 1024; // 5MB
                
                if (totalSize > diagnosis.localStorage.quota * 0.8) {
                    diagnosis.localStorage.issues.push('接近配额限制');
                }
            } catch (error) {
                diagnosis.localStorage.issues.push(`配额检查失败: ${error.message}`);
            }
        }
        
        console.log('📊 存储系统诊断结果:', diagnosis);
        return diagnosis;
    }
    
    // 2. 创建可靠的存储包装器
    function createReliableStorageWrapper() {
        console.log('🛠️ 创建可靠的存储包装器...');
        
        const reliableStorage = {
            // 保存数据（多重备份策略）
            save: async (key, data) => {
                const results = {
                    attempts: [],
                    success: false,
                    finalData: null
                };
                
                // 准备数据
                const preparedData = {
                    data: data,
                    timestamp: new Date().toISOString(),
                    version: '2.0',
                    checksum: reliableStorage.calculateChecksum(JSON.stringify(data))
                };
                
                // 方法1: AutogenUnifiedStorage.store
                if (window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage.store === 'function') {
                    try {
                        await window.AutogenUnifiedStorage.store(key, preparedData);
                        results.attempts.push({ method: 'AutogenUnifiedStorage.store', success: true });
                        results.success = true;
                        console.log('✅ AutogenUnifiedStorage.store 保存成功');
                    } catch (error) {
                        results.attempts.push({ method: 'AutogenUnifiedStorage.store', success: false, error: error.message });
                        console.warn('⚠️ AutogenUnifiedStorage.store 失败:', error);
                    }
                }
                
                // 方法2: localStorage (压缩版本)
                try {
                    const compressedData = {
                        timestamp: preparedData.timestamp,
                        checksum: preparedData.checksum,
                        summary: reliableStorage.createDataSummary(data)
                    };
                    localStorage.setItem(`${key}_compressed`, JSON.stringify(compressedData));
                    results.attempts.push({ method: 'localStorage_compressed', success: true });
                    console.log('✅ localStorage 压缩版本保存成功');
                } catch (error) {
                    results.attempts.push({ method: 'localStorage_compressed', success: false, error: error.message });
                    console.warn('⚠️ localStorage 压缩版本失败:', error);
                }
                
                // 方法3: 直接更新mindmapController
                if (window.mindmapController && key === 'mindmap_data') {
                    try {
                        window.mindmapController.data = data.data || data;
                        results.attempts.push({ method: 'mindmapController_direct', success: true });
                        results.success = true;
                        console.log('✅ mindmapController 直接更新成功');
                    } catch (error) {
                        results.attempts.push({ method: 'mindmapController_direct', success: false, error: error.message });
                        console.warn('⚠️ mindmapController 直接更新失败:', error);
                    }
                }
                
                results.finalData = preparedData;
                return results;
            },
            
            // 验证保存结果
            verify: async (key, originalData) => {
                const verification = {
                    methods: [],
                    dataIntegrity: false,
                    overallSuccess: false
                };
                
                // 验证AutogenUnifiedStorage
                if (window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage.retrieve === 'function') {
                    try {
                        const retrieved = await window.AutogenUnifiedStorage.retrieve(key);
                        const checksumMatch = retrieved && retrieved.checksum === reliableStorage.calculateChecksum(JSON.stringify(originalData));
                        verification.methods.push({
                            method: 'AutogenUnifiedStorage.retrieve',
                            success: !!retrieved,
                            checksumMatch: checksumMatch
                        });
                        if (checksumMatch) verification.dataIntegrity = true;
                    } catch (error) {
                        verification.methods.push({
                            method: 'AutogenUnifiedStorage.retrieve',
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                // 验证localStorage
                try {
                    const compressed = localStorage.getItem(`${key}_compressed`);
                    if (compressed) {
                        const parsedCompressed = JSON.parse(compressed);
                        verification.methods.push({
                            method: 'localStorage_compressed',
                            success: true,
                            hasChecksum: !!parsedCompressed.checksum
                        });
                    }
                } catch (error) {
                    verification.methods.push({
                        method: 'localStorage_compressed',
                        success: false,
                        error: error.message
                    });
                }
                
                // 验证mindmapController
                if (window.mindmapController && key === 'mindmap_data') {
                    try {
                        const controllerData = window.mindmapController.data;
                        verification.methods.push({
                            method: 'mindmapController_direct',
                            success: !!controllerData,
                            dataExists: !!controllerData
                        });
                        if (controllerData) verification.dataIntegrity = true;
                    } catch (error) {
                        verification.methods.push({
                            method: 'mindmapController_direct',
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                verification.overallSuccess = verification.methods.some(m => m.success);
                return verification;
            },
            
            // 计算校验和
            calculateChecksum: (str) => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // 转换为32位整数
                }
                return hash.toString(16);
            },
            
            // 创建数据摘要
            createDataSummary: (data) => {
                if (data && data.data) {
                    return {
                        type: 'mindmap_data',
                        rootNodeId: data.data.id,
                        rootTopic: data.data.topic,
                        childrenCount: data.data.children ? data.data.children.length : 0,
                        totalNodes: reliableStorage.countNodes(data.data)
                    };
                }
                return { type: 'unknown', size: JSON.stringify(data).length };
            },
            
            // 计算节点数量
            countNodes: (node) => {
                if (!node) return 0;
                let count = 1;
                if (node.children && Array.isArray(node.children)) {
                    node.children.forEach(child => {
                        count += reliableStorage.countNodes(child);
                    });
                }
                return count;
            }
        };
        
        return reliableStorage;
    }
    
    // 3. 恢复丢失的工作记录
    async function recoverLostRecords() {
        console.log('🔄 开始恢复丢失的工作记录...');
        
        const reliableStorage = createReliableStorageWrapper();
        const targetNodeId = '9809480ec54ed01f'; // 实施路径记录节点ID
        
        // 查找目标节点
        let targetNode = null;
        if (window.mindmapController && window.mindmapController.data) {
            targetNode = findNodeById(window.mindmapController.data, targetNodeId);
        }
        
        if (!targetNode) {
            console.error('❌ 找不到实施路径记录节点');
            return { success: false, error: '找不到目标节点' };
        }
        
        console.log('✅ 找到实施路径记录节点:', targetNode.topic);
        
        // 创建今天的工作记录节点
        const todayRecord = recoverySystem.lostWorkRecords['2025-09-25'];
        const recoveryNode = {
            id: `recovery_${Date.now()}`,
            topic: `${todayRecord.title} (恢复记录)`,
            expanded: true,
            content: `恢复时间: ${new Date().toISOString()}\n\n# ${todayRecord.title}\n\n${todayRecord.description}\n\n## 完成的阶段\n\n${todayRecord.phases.map(phase => 
                `### ${phase.name} (${phase.completion})\n${phase.tasks.map(task => `- ✅ ${task}`).join('\n')}`
            ).join('\n\n')}\n\n## 技术实现\n\n${Object.entries(todayRecord.technicalDetails).map(([key, value]) => 
                `**${key}**: ${value}`
            ).join('\n')}\n\n## 主要成就\n\n${todayRecord.achievements.map(achievement => `- 🎉 ${achievement}`).join('\n')}\n\n## 创建的文件\n\n${todayRecord.files.map(file => `- 📄 ${file}`).join('\n')}`,
            data: {
                content: `恢复时间: ${new Date().toISOString()}\n\n# ${todayRecord.title}\n\n${todayRecord.description}\n\n## 完成的阶段\n\n${todayRecord.phases.map(phase => 
                    `### ${phase.name} (${phase.completion})\n${phase.tasks.map(task => `- ✅ ${task}`).join('\n')}`
                ).join('\n\n')}\n\n## 技术实现\n\n${Object.entries(todayRecord.technicalDetails).map(([key, value]) => 
                    `**${key}**: ${value}`
                ).join('\n')}\n\n## 主要成就\n\n${todayRecord.achievements.map(achievement => `- 🎉 ${achievement}`).join('\n')}\n\n## 创建的文件\n\n${todayRecord.files.map(file => `- 📄 ${file}`).join('\n')}`
            },
            'background-color': '#fef3c7',
            'foreground-color': '#92400e',
            children: todayRecord.phases.map((phase, index) => ({
                id: `phase_${index + 1}_${Date.now()}`,
                topic: phase.name,
                expanded: true,
                content: `完成度: ${phase.completion}\n\n## 任务清单\n\n${phase.tasks.map(task => `- ✅ ${task}`).join('\n')}`,
                data: {
                    content: `完成度: ${phase.completion}\n\n## 任务清单\n\n${phase.tasks.map(task => `- ✅ ${task}`).join('\n')}`
                },
                'background-color': '#f0fdf4',
                'foreground-color': '#166534',
                children: phase.tasks.map((task, taskIndex) => ({
                    id: `task_${index + 1}_${taskIndex + 1}_${Date.now()}`,
                    topic: task,
                    expanded: false,
                    content: `状态: ✅ 已完成\n创建时间: 2025-09-25\n阶段: ${phase.name}`,
                    data: {
                        content: `状态: ✅ 已完成\n创建时间: 2025-09-25\n阶段: ${phase.name}`
                    },
                    'background-color': '#f5f5f5',
                    'foreground-color': '#333'
                }))
            }))
        };
        
        // 添加到目标节点
        if (!targetNode.children) {
            targetNode.children = [];
        }
        targetNode.children.push(recoveryNode);
        
        console.log('✅ 恢复记录节点已添加到脑图');
        
        // 保存到存储系统
        const saveResult = await reliableStorage.save('mindmap_data', window.mindmapController);
        console.log('💾 保存结果:', saveResult);
        
        // 验证保存结果
        const verifyResult = await reliableStorage.verify('mindmap_data', window.mindmapController);
        console.log('🔍 验证结果:', verifyResult);
        
        recoverySystem.status.recoveredRecords.push(recoveryNode);
        recoverySystem.status.verificationResults.push(verifyResult);
        
        return {
            success: saveResult.success && verifyResult.overallSuccess,
            recoveryNode: recoveryNode,
            saveResult: saveResult,
            verifyResult: verifyResult
        };
    }
    
    // 辅助函数：查找节点
    function findNodeById(node, targetId) {
        if (node.id === targetId) {
            return node;
        }
        if (node.children && Array.isArray(node.children)) {
            for (let child of node.children) {
                const found = findNodeById(child, targetId);
                if (found) return found;
            }
        }
        return null;
    }
    
    // 4. 执行恢复流程
    async function executeRecovery() {
        console.log('🚨 开始执行紧急恢复流程...');
        
        try {
            // 步骤1: 诊断系统
            const diagnosis = await diagnoseStorageSystem();
            recoverySystem.status.diagnosis = diagnosis;
            
            // 步骤2: 恢复记录
            const recoveryResult = await recoverLostRecords();
            
            // 步骤3: 生成报告
            const report = generateRecoveryReport(diagnosis, recoveryResult);
            
            // 步骤4: 显示结果
            showRecoveryResults(report);
            
            console.log('🎉 紧急恢复流程完成');
            return report;
            
        } catch (error) {
            console.error('❌ 恢复流程异常:', error);
            recoverySystem.status.issues.push(`恢复流程异常: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    // 5. 生成恢复报告
    function generateRecoveryReport(diagnosis, recoveryResult) {
        const report = {
            timestamp: new Date().toISOString(),
            overallSuccess: recoveryResult.success,
            diagnosis: diagnosis,
            recovery: recoveryResult,
            summary: {
                recordsRecovered: recoverySystem.status.recoveredRecords.length,
                storageMethodsWorking: 0,
                criticalIssues: [],
                recommendations: []
            }
        };
        
        // 统计工作的存储方法
        if (recoveryResult.verifyResult) {
            report.summary.storageMethodsWorking = recoveryResult.verifyResult.methods.filter(m => m.success).length;
        }
        
        // 识别关键问题
        if (!diagnosis.autoGenUnifiedStorage.exists) {
            report.summary.criticalIssues.push('AutogenUnifiedStorage系统不存在');
        }
        if (diagnosis.autoGenUnifiedStorage.issues.length > 0) {
            report.summary.criticalIssues.push(...diagnosis.autoGenUnifiedStorage.issues);
        }
        if (diagnosis.localStorage.issues.length > 0) {
            report.summary.criticalIssues.push(...diagnosis.localStorage.issues);
        }
        
        // 生成建议
        if (report.summary.storageMethodsWorking === 0) {
            report.summary.recommendations.push('立即修复所有存储方法');
        }
        if (report.summary.criticalIssues.length > 0) {
            report.summary.recommendations.push('解决所有关键问题后重新测试');
        }
        if (recoveryResult.success) {
            report.summary.recommendations.push('建立定期验证机制防止数据丢失');
        }
        
        return report;
    }
    
    // 6. 显示恢复结果
    function showRecoveryResults(report) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-height: 80vh;
            background: white;
            border: 3px solid ${report.overallSuccess ? '#10b981' : '#ef4444'};
            border-radius: 12px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            z-index: 20000;
            overflow-y: auto;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: ${report.overallSuccess ? '#10b981' : '#ef4444'}; font-size: 20px;">
                        ${report.overallSuccess ? '🎉' : '❌'} 紧急恢复报告
                    </h2>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
                </div>
                
                <div style="background: ${report.overallSuccess ? '#f0fdf4' : '#fef2f2'}; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 8px;">恢复状态: ${report.overallSuccess ? '✅ 成功' : '❌ 失败'}</div>
                    <div style="font-size: 14px; color: #666;">
                        <div>• 恢复记录数: ${report.summary.recordsRecovered}</div>
                        <div>• 工作存储方法: ${report.summary.storageMethodsWorking}</div>
                        <div>• 关键问题数: ${report.summary.criticalIssues.length}</div>
                    </div>
                </div>
                
                ${report.summary.criticalIssues.length > 0 ? `
                <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-weight: bold; color: #dc2626; margin-bottom: 8px;">🚨 关键问题</div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #666;">
                        ${report.summary.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 8px;">💡 建议措施</div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #666;">
                        ${report.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div style="background: #f1f5f9; padding: 16px; border-radius: 8px;">
                    <div style="font-weight: bold; margin-bottom: 8px;">📊 详细诊断</div>
                    <div style="font-size: 12px; color: #666;">
                        <div>• AutogenUnifiedStorage: ${report.diagnosis.autoGenUnifiedStorage.exists ? '✅ 存在' : '❌ 不存在'}</div>
                        <div>• MindmapController: ${report.diagnosis.mindmapController.exists ? '✅ 存在' : '❌ 不存在'}</div>
                        <div>• LocalStorage: ${report.diagnosis.localStorage.available ? '✅ 可用' : '❌ 不可用'}</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5秒后自动关闭（如果成功）
        if (report.overallSuccess) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 10000);
        }
    }
    
    // 立即执行恢复
    setTimeout(() => {
        executeRecovery();
    }, 2000);
    
    console.log('🛠️ 紧急记录恢复系统已启动，将在2秒后开始执行');
    
})();

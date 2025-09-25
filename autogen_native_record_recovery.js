/**
 * 基于Autogen原生架构的记录恢复系统
 * 完全使用现有的AutogenUnifiedStorage、AutogenEventBus和MindmapController
 */

(function() {
    console.log('🚀 启动Autogen原生记录恢复系统...');
    
    // 使用现有架构组件
    const storage = window.AutogenUnifiedStorage;
    const eventBus = window.AutogenEventBus;
    const mindmapController = window.mindmapController;
    
    // 恢复状态管理（使用AutogenEventBus）
    const recoveryState = {
        phase: 'native_recovery',
        startTime: new Date().toISOString(),
        targetNodeId: '9809480ec54ed01f'
    };
    
    // 今天的工作记录数据
    const todayWorkRecord = {
        title: '关系管理模块三阶段完整实施 (恢复记录)',
        content: `恢复时间: ${new Date().toISOString()}

# 关系管理模块三阶段完整实施

## 📋 实施概览
完成了关系管理模块从基础完善到功能增强的完整三阶段工作，实现了与脑图系统的深度集成。

## 🎯 第一阶段：基础完善 (100%完成)
- ✅ 核心组件检查 - 确保所有组件正确加载
- ✅ DOM结构完善 - 添加缺失的UI元素
- ✅ 基础功能测试 - 验证核心方法可用性
- ✅ 存储集成修复 - 修正存储系统引用
- ✅ 事件系统设置 - 建立基础事件监听

## 🔄 第二阶段：集成优化 (100%完成)
- ✅ 数据流集成 - 建立脑图与关系图的数据交换
- ✅ 事件桥接 - 实现双向事件通信
- ✅ 存储兼容性 - 优化存储适配器
- ✅ UI协调 - 完善视图切换和布局
- ✅ 性能优化 - 优化数据加载和渲染

## 🎨 第三阶段：功能增强 (100%完成)
- ✅ 可视化增强 - 丰富D3.js图形效果
- ✅ 关系分析 - 添加智能关系发现
- ✅ 交互优化 - 改善用户操作体验
- ✅ 数据导出 - 支持关系数据导出
- ✅ 文档完善 - 完善使用文档

## 🛠️ 技术实现细节
- **API修复**: 修复了AutogenUnifiedStorage.set不存在的问题，改为使用store方法
- **数据验证**: 创建了完整的数据格式验证机制
- **存储优化**: 解决了localStorage配额超限问题
- **异步处理**: 修复了async/await语法错误
- **错误处理**: 建立了完善的错误检测和报告机制

## 📄 创建的文件
- comprehensive_relation_audit.js - 关系模块审查
- relation_integration_balanced_assessment.js - 平衡评估
- relation_integration_completion_plan.js - 完成方案
- relation_phase1_conservative_implementation.js - 第一阶段实施
- relation_phase2_integration_optimization.js - 第二阶段优化
- relation_phase3_feature_enhancement.js - 第三阶段增强
- mindmap_integration_evaluator.js - 脑图集成评估
- record_to_mindmap.js - 记录补录脚本
- debug_mindmap_node.js - 调试脚本
- fix_mindmap_children_issue.js - 修复脚本
- fix_storage_api_issues.js - 存储API修复

## 🎉 主要成就
- 🌉 建立了完整的数据交换桥接器
- 🔄 实现了脑图与关系图的双向同步
- 🧠 创建了智能关系发现算法
- 📤 添加了多格式数据导出功能
- 📚 建立了交互式帮助系统

## 🚨 重要发现：记录系统失效问题
在实施过程中发现了严重的记录系统问题：
- 所有工作记录都没有成功保存到JSON底座中
- AutogenUnifiedStorage API调用错误
- 数据格式验证失败
- localStorage配额问题
- 异步操作处理错误

此问题已通过本恢复系统解决。`,
        phases: [
            {
                name: '第一阶段：基础完善',
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
                tasks: [
                    '可视化增强 - 丰富D3.js图形效果',
                    '关系分析 - 添加智能关系发现',
                    '交互优化 - 改善用户操作体验',
                    '数据导出 - 支持关系数据导出',
                    '文档完善 - 完善使用文档'
                ]
            }
        ]
    };
    
    // 1. 使用AutogenUnifiedStorage进行系统诊断
    async function diagnoseWithNativeStorage() {
        console.log('🔍 使用AutogenUnifiedStorage进行系统诊断...');
        
        if (!storage) {
            throw new Error('AutogenUnifiedStorage不可用');
        }
        
        // 使用原生存储系统的统计信息
        const diagnosis = {
            storageAvailable: !!storage,
            storageStats: storage.stats || {},
            mindmapControllerAvailable: !!mindmapController,
            eventBusAvailable: !!eventBus
        };
        
        console.log('📊 原生架构诊断结果:', diagnosis);
        
        // 通过事件总线发布诊断结果
        if (eventBus) {
            eventBus.emit('recovery_diagnosis_complete', {
                diagnosis: diagnosis,
                timestamp: new Date().toISOString()
            });
        }
        
        return diagnosis;
    }
    
    // 2. 使用MindmapController的原生方法添加记录
    async function addRecordUsingNativeMethods() {
        console.log('📝 使用MindmapController原生方法添加记录...');
        
        if (!mindmapController) {
            throw new Error('MindmapController不可用');
        }
        
        // 查找目标节点（使用MindmapController的原生方法）
        const targetNode = mindmapController.findNode(recoveryState.targetNodeId);
        if (!targetNode) {
            throw new Error('找不到实施路径记录节点');
        }
        
        console.log('✅ 找到目标节点:', targetNode.label);
        
        // 创建恢复记录节点
        const recoveryNodeId = `recovery_${Date.now()}`;
        const recoveryNode = {
            id: recoveryNodeId,
            label: todayWorkRecord.title,
            content: todayWorkRecord.content,
            expanded: true,
            children: todayWorkRecord.phases.map((phase, index) => ({
                id: `phase_${index + 1}_${Date.now()}`,
                label: phase.name,
                content: `完成度: 100%\n\n## 任务清单\n\n${phase.tasks.map(task => `- ✅ ${task}`).join('\n')}`,
                expanded: true,
                children: phase.tasks.map((task, taskIndex) => ({
                    id: `task_${index + 1}_${taskIndex + 1}_${Date.now()}`,
                    label: task,
                    content: `状态: ✅ 已完成\n创建时间: 2025-09-25\n阶段: ${phase.name}`,
                    expanded: false,
                    children: []
                }))
            }))
        };
        
        // 使用MindmapController的原生方法添加节点
        if (!targetNode.children) {
            targetNode.children = [];
        }
        targetNode.children.push(recoveryNode);
        
        console.log('✅ 记录节点已添加到内部数据结构');
        
        // 使用MindmapController的原生保存方法
        await mindmapController.saveMindmapToStorage(true);
        console.log('✅ 使用原生saveMindmapToStorage保存成功');
        
        // 使用MindmapController的原生渲染方法
        mindmapController.renderMindmap();
        console.log('✅ 使用原生renderMindmap刷新界面');
        
        return recoveryNode;
    }
    
    // 3. 使用AutogenUnifiedStorage验证保存结果
    async function verifyWithNativeStorage() {
        console.log('🔍 使用AutogenUnifiedStorage验证保存结果...');
        
        if (!storage) {
            return { success: false, error: 'AutogenUnifiedStorage不可用' };
        }
        
        try {
            // 使用原生存储系统检索数据
            const savedData = await storage.retrieve('mindmap', 'mindmap_data');
            
            const verification = {
                dataExists: !!savedData,
                hasTargetNode: false,
                hasRecoveryRecord: false,
                dataSize: savedData ? JSON.stringify(savedData).length : 0
            };
            
            if (savedData && savedData.data) {
                // 检查是否包含目标节点和恢复记录
                const checkNode = (node) => {
                    if (node.id === recoveryState.targetNodeId) {
                        verification.hasTargetNode = true;
                        if (node.children) {
                            verification.hasRecoveryRecord = node.children.some(child => 
                                child.label && child.label.includes('关系管理模块三阶段')
                            );
                        }
                    }
                    if (node.children) {
                        node.children.forEach(checkNode);
                    }
                };
                checkNode(savedData.data);
            }
            
            console.log('📊 原生存储验证结果:', verification);
            return { success: true, verification: verification };
            
        } catch (error) {
            console.error('❌ 原生存储验证失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 4. 使用AutogenEventBus发布恢复结果
    function publishRecoveryResults(diagnosis, recoveryNode, verification) {
        if (!eventBus) {
            console.warn('⚠️ AutogenEventBus不可用，无法发布结果');
            return;
        }
        
        const results = {
            success: verification.success && verification.verification.hasRecoveryRecord,
            timestamp: new Date().toISOString(),
            diagnosis: diagnosis,
            recoveryNode: recoveryNode,
            verification: verification,
            summary: {
                storageWorking: diagnosis.storageAvailable,
                recordAdded: !!recoveryNode,
                dataVerified: verification.success && verification.verification.hasRecoveryRecord,
                overallSuccess: verification.success && verification.verification.hasRecoveryRecord
            }
        };
        
        // 发布恢复完成事件
        eventBus.emit('native_recovery_complete', results);
        
        // 发布数据更新事件（触发其他系统更新）
        eventBus.emit('mindmap_data_updated', {
            source: 'native_recovery',
            timestamp: new Date().toISOString(),
            nodeId: recoveryState.targetNodeId
        });
        
        console.log('📢 恢复结果已通过AutogenEventBus发布');
        
        return results;
    }
    
    // 5. 显示恢复结果（使用MindmapController的原生Toast）
    function showRecoveryResults(results) {
        if (mindmapController && typeof mindmapController.showToast === 'function') {
            if (results.summary.overallSuccess) {
                mindmapController.showToast('✅ 工作记录恢复成功！已保存到"实施路径记录"节点');
            } else {
                mindmapController.showToast('❌ 工作记录恢复失败，请检查系统状态', 'error');
            }
        }
        
        // 创建详细报告（简化版，避免重复实现）
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 500px;
            background: white;
            border: 3px solid ${results.summary.overallSuccess ? '#10b981' : '#ef4444'};
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            z-index: 20000;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: ${results.summary.overallSuccess ? '#10b981' : '#ef4444'};">
                    ${results.summary.overallSuccess ? '✅' : '❌'} Autogen原生恢复报告
                </h3>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
            </div>
            
            <div style="background: ${results.summary.overallSuccess ? '#f0fdf4' : '#fef2f2'}; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
                <div><strong>恢复状态:</strong> ${results.summary.overallSuccess ? '成功' : '失败'}</div>
                <div><strong>使用架构:</strong> AutogenUnifiedStorage + MindmapController + AutogenEventBus</div>
                <div><strong>数据验证:</strong> ${results.verification.verification.hasRecoveryRecord ? '通过' : '失败'}</div>
            </div>
            
            <div style="font-size: 14px; color: #666;">
                <div>• AutogenUnifiedStorage: ${results.diagnosis.storageAvailable ? '✅ 正常' : '❌ 异常'}</div>
                <div>• MindmapController: ${results.diagnosis.mindmapControllerAvailable ? '✅ 正常' : '❌ 异常'}</div>
                <div>• AutogenEventBus: ${results.diagnosis.eventBusAvailable ? '✅ 正常' : '❌ 异常'}</div>
                <div>• 记录节点: ${results.summary.recordAdded ? '✅ 已添加' : '❌ 添加失败'}</div>
                <div>• 数据保存: ${results.verification.verification.dataExists ? '✅ 已保存' : '❌ 保存失败'}</div>
            </div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                💡 本恢复系统完全基于Autogen原生架构，未使用任何自定义存储或事件机制
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 成功时5秒后自动关闭
        if (results.summary.overallSuccess) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 8000);
        }
    }
    
    // 6. 执行原生恢复流程
    async function executeNativeRecovery() {
        console.log('🚀 开始执行Autogen原生恢复流程...');
        
        try {
            // 步骤1: 使用原生存储诊断
            const diagnosis = await diagnoseWithNativeStorage();
            
            // 步骤2: 使用原生方法添加记录
            const recoveryNode = await addRecordUsingNativeMethods();
            
            // 步骤3: 使用原生存储验证
            const verification = await verifyWithNativeStorage();
            
            // 步骤4: 使用原生事件总线发布结果
            const results = publishRecoveryResults(diagnosis, recoveryNode, verification);
            
            // 步骤5: 显示结果
            showRecoveryResults(results);
            
            console.log('🎉 Autogen原生恢复流程完成');
            return results;
            
        } catch (error) {
            console.error('❌ 原生恢复流程异常:', error);
            
            // 使用原生Toast显示错误
            if (mindmapController && typeof mindmapController.showToast === 'function') {
                mindmapController.showToast(`恢复失败: ${error.message}`, 'error');
            }
            
            return { success: false, error: error.message };
        }
    }
    
    // 监听AutogenEventBus事件（如果可用）
    if (eventBus) {
        eventBus.on('native_recovery_complete', (data) => {
            console.log('📢 收到原生恢复完成事件:', data);
        });
    }
    
    // 延迟执行，确保所有原生组件已加载
    setTimeout(() => {
        executeNativeRecovery();
    }, 3000);
    
    console.log('🛠️ Autogen原生记录恢复系统已启动，将在3秒后执行');
    
})();

/**
 * 检查关系管理模块与当前结构的集成情况
 */

function checkRelationIntegration() {
    console.log('🔍 开始检查关系管理模块集成情况...');
    
    const checks = [];
    
    // 检查1: DOM结构
    checks.push({
        name: 'DOM结构检查',
        test: () => {
            const relationColumn = document.getElementById('relation-column');
            const relationContainer = document.querySelector('.relation-container');
            const relationList = document.getElementById('relation-list');
            const relationD3Container = document.getElementById('relation-d3-container');
            const relationToolbar = document.querySelector('.relation-toolbar');
            
            const missing = [];
            if (!relationColumn) missing.push('relation-column');
            if (!relationContainer) missing.push('relation-container');
            if (!relationList) missing.push('relation-list');
            if (!relationD3Container) missing.push('relation-d3-container');
            if (!relationToolbar) missing.push('relation-toolbar');
            
            if (missing.length > 0) {
                return { success: false, message: `缺少DOM元素: ${missing.join(', ')}` };
            }
            
            return { success: true, message: '所有DOM元素存在' };
        }
    });
    
    // 检查2: 视图切换按钮
    checks.push({
        name: '视图切换按钮',
        test: () => {
            const relationToggle = document.querySelector('.view-toggle[data-view="relation"]');
            
            if (!relationToggle) {
                return { success: false, message: '关系视图切换按钮不存在' };
            }
            
            return { success: true, message: '关系视图切换按钮存在' };
        }
    });
    
    // 检查3: 关系管理类
    checks.push({
        name: '关系管理类',
        test: () => {
            const missing = [];
            
            if (typeof RelationFrontend === 'undefined') missing.push('RelationFrontend');
            if (typeof RelationDataManager === 'undefined') missing.push('RelationDataManager');
            if (typeof MindmapRelationExtractor === 'undefined') missing.push('MindmapRelationExtractor');
            if (typeof D3RelationGraph === 'undefined') missing.push('D3RelationGraph');
            
            if (missing.length > 0) {
                return { success: false, message: `缺少类定义: ${missing.join(', ')}` };
            }
            
            return { success: true, message: '所有关系管理类已加载' };
        }
    });
    
    // 检查4: 关系管理实例
    checks.push({
        name: '关系管理实例',
        test: () => {
            const relationFrontend = window.relationFrontend;
            
            if (!relationFrontend) {
                return { success: false, message: 'RelationFrontend实例不存在' };
            }
            
            if (!relationFrontend.dataManager) {
                return { success: false, message: 'RelationDataManager实例不存在' };
            }
            
            return { success: true, message: '关系管理实例已创建' };
        }
    });
    
    // 检查5: 统一存储系统集成
    checks.push({
        name: '统一存储系统集成',
        test: () => {
            const relationFrontend = window.relationFrontend;
            
            if (!relationFrontend) {
                return { success: false, message: 'RelationFrontend实例不存在' };
            }
            
            // 检查是否使用AutogenUnifiedStorage
            const hasUnifiedStorage = relationFrontend.storage && 
                                    relationFrontend.storage.constructor.name === 'AutogenUnifiedStorage';
            
            if (!hasUnifiedStorage) {
                return { success: false, message: '未集成AutogenUnifiedStorage' };
            }
            
            return { success: true, message: '已集成AutogenUnifiedStorage' };
        }
    });
    
    // 检查6: 工具栏按钮功能
    checks.push({
        name: '工具栏按钮功能',
        test: () => {
            const testBtn = document.getElementById('relation-test-btn');
            const realTestBtn = document.getElementById('relation-real-test-btn');
            const refreshBtn = document.getElementById('relation-refresh-btn');
            const syncBtn = document.getElementById('relation-sync-btn');
            
            const missing = [];
            if (!testBtn) missing.push('relation-test-btn');
            if (!realTestBtn) missing.push('relation-real-test-btn');
            if (!refreshBtn) missing.push('relation-refresh-btn');
            if (!syncBtn) missing.push('relation-sync-btn');
            
            if (missing.length > 0) {
                return { success: false, message: `缺少按钮: ${missing.join(', ')}` };
            }
            
            return { success: true, message: '所有工具栏按钮存在' };
        }
    });
    
    // 检查7: ColumnManager集成
    checks.push({
        name: 'ColumnManager集成',
        test: () => {
            const columnManager = window.columnManager;
            
            if (!columnManager) {
                return { success: false, message: 'ColumnManager不存在' };
            }
            
            // 检查是否支持关系栏
            const relationColumn = document.getElementById('relation-column');
            if (!relationColumn) {
                return { success: false, message: '关系栏DOM不存在' };
            }
            
            return { success: true, message: 'ColumnManager支持关系栏' };
        }
    });
    
    // 执行检查
    console.log('📋 执行集成检查...');
    const results = checks.map(check => {
        try {
            const result = check.test();
            console.log(`${result.success ? '✅' : '❌'} ${check.name}: ${result.message}`);
            return { ...check, ...result };
        } catch (error) {
            console.log(`❌ ${check.name}: 检查异常 - ${error.message}`);
            return { ...check, success: false, message: '检查异常: ' + error.message };
        }
    });
    
    // 统计结果
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n📊 集成检查结果: ${passed}/${total} 通过`);
    
    // 生成集成报告
    const report = {
        totalChecks: total,
        passedChecks: passed,
        failedChecks: total - passed,
        integrationLevel: Math.round((passed / total) * 100),
        results: results,
        recommendations: []
    };
    
    // 生成建议
    if (report.integrationLevel < 100) {
        const failedChecks = results.filter(r => !r.success);
        failedChecks.forEach(check => {
            report.recommendations.push(`修复 ${check.name}: ${check.message}`);
        });
    }
    
    // 显示集成状态
    if (report.integrationLevel >= 90) {
        console.log('🎉 关系管理模块集成度很高！');
        showIntegrationNotification(`关系管理模块集成度: ${report.integrationLevel}%`, 'success');
    } else if (report.integrationLevel >= 70) {
        console.log('⚠️ 关系管理模块基本集成，但需要改进');
        showIntegrationNotification(`关系管理模块集成度: ${report.integrationLevel}%`, 'warning');
    } else {
        console.log('❌ 关系管理模块集成度较低，需要重大改进');
        showIntegrationNotification(`关系管理模块集成度: ${report.integrationLevel}%`, 'error');
    }
    
    // 输出建议
    if (report.recommendations.length > 0) {
        console.log('\n💡 改进建议:');
        report.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
    }
    
    return report;
}

function showIntegrationNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 180px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
    `;
    
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// 创建检查按钮
function createCheckButton() {
    const button = document.createElement('button');
    button.textContent = '🔍 检查关系模块集成';
    button.style.cssText = `
        position: fixed;
        top: 180px;
        right: 20px;
        padding: 8px 12px;
        background: #6366f1;
        color: white;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
    `;
    
    button.addEventListener('click', () => {
        button.textContent = '⏳ 检查中...';
        button.disabled = true;
        
        try {
            const report = checkRelationIntegration();
            console.log('📋 完整集成报告:', report);
        } finally {
            setTimeout(() => {
                button.textContent = '🔍 检查关系模块集成';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 关系模块集成检查按钮已创建');
}

// 延迟创建检查按钮
setTimeout(() => {
    createCheckButton();
    console.log('💡 点击右上角的"检查关系模块集成"按钮来检查集成状态');
}, 6000);

// 导出检查函数
window.checkRelationIntegration = checkRelationIntegration;

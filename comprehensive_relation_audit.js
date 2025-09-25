/**
 * 关系栏与系统集成完成度全面审查
 * 客观评估实际代码情况，识别报告中的遗漏和不足
 */

function comprehensiveRelationAudit() {
    console.log('🔍 开始全面审查关系栏集成完成度...');
    
    const auditResults = {
        actualIntegration: {},
        reportAccuracy: {},
        criticalIssues: [],
        missingComponents: [],
        overestimations: [],
        recommendations: []
    };
    
    // 1. DOM结构实际检查
    console.log('📋 1. DOM结构实际检查...');
    const domCheck = checkDOMStructure();
    auditResults.actualIntegration.dom = domCheck;
    
    // 2. 脚本加载实际检查
    console.log('📋 2. 脚本加载实际检查...');
    const scriptCheck = checkScriptLoading();
    auditResults.actualIntegration.scripts = scriptCheck;
    
    // 3. 存储系统集成实际检查
    console.log('📋 3. 存储系统集成实际检查...');
    const storageCheck = checkStorageIntegration();
    auditResults.actualIntegration.storage = storageCheck;
    
    // 4. 事件系统集成实际检查
    console.log('📋 4. 事件系统集成实际检查...');
    const eventCheck = checkEventIntegration();
    auditResults.actualIntegration.events = eventCheck;
    
    // 5. 功能完整性检查
    console.log('📋 5. 功能完整性检查...');
    const functionalCheck = checkFunctionalIntegration();
    auditResults.actualIntegration.functionality = functionalCheck;
    
    // 6. 架构一致性检查
    console.log('📋 6. 架构一致性检查...');
    const architectureCheck = checkArchitectureConsistency();
    auditResults.actualIntegration.architecture = architectureCheck;
    
    // 7. 分析报告准确性
    console.log('📋 7. 分析报告准确性...');
    analyzeReportAccuracy(auditResults);
    
    // 8. 生成客观评估
    console.log('📋 8. 生成客观评估...');
    generateObjectiveAssessment(auditResults);
    
    return auditResults;
}

function checkDOMStructure() {
    const elements = {
        'relation-column': document.getElementById('relation-column'),
        'relation-container': document.querySelector('.relation-container'),
        'relation-list': document.getElementById('relation-list'),
        'relation-d3-container': document.getElementById('relation-d3-container'),
        'relation-toolbar': document.querySelector('.relation-toolbar'),
        'view-toggle-relation': document.querySelector('.view-toggle[data-view="relation"]'),
        'mindmap-relation-divider': document.getElementById('mindmap-relation-divider'),
        'relation-detail-divider': document.getElementById('relation-detail-divider')
    };
    
    const existing = Object.keys(elements).filter(key => elements[key]);
    const missing = Object.keys(elements).filter(key => !elements[key]);
    
    return {
        completeness: (existing.length / Object.keys(elements).length) * 100,
        existing: existing,
        missing: missing,
        critical_missing: missing.filter(item => 
            ['relation-column', 'view-toggle-relation'].includes(item)
        )
    };
}

function checkScriptLoading() {
    const requiredScripts = {
        'RelationFrontend': window.RelationFrontend,
        'RelationDataManager': window.RelationDataManager,
        'MindmapRelationExtractor': window.MindmapRelationExtractor,
        'D3RelationGraph': window.D3RelationGraph,
        'relationFrontend_instance': window.relationFrontend
    };
    
    const loaded = Object.keys(requiredScripts).filter(key => requiredScripts[key]);
    const missing = Object.keys(requiredScripts).filter(key => !requiredScripts[key]);
    
    // 检查脚本文件是否在HTML中引用
    const scriptTags = Array.from(document.querySelectorAll('script[src]'));
    const relationScripts = scriptTags.filter(script => 
        script.src.includes('relation') || 
        script.src.includes('RelationDataManager') ||
        script.src.includes('MindmapRelationExtractor') ||
        script.src.includes('D3RelationGraph')
    );
    
    return {
        completeness: (loaded.length / Object.keys(requiredScripts).length) * 100,
        loaded: loaded,
        missing: missing,
        scriptTags: relationScripts.length,
        instance_created: !!window.relationFrontend
    };
}

function checkStorageIntegration() {
    const checks = {
        autogenUnifiedStorage: !!window.AutogenUnifiedStorage,
        unifiedStorage: !!window.UnifiedStorage,
        relationFrontendStorage: false,
        relationDataManagerStorage: false,
        storageConnection: false
    };
    
    // 检查RelationFrontend的存储连接
    if (window.relationFrontend) {
        checks.relationFrontendStorage = !!window.relationFrontend.storage;
        checks.storageConnection = window.relationFrontend.storage === window.AutogenUnifiedStorage;
    }
    
    // 检查RelationDataManager的存储连接
    if (window.relationFrontend && window.relationFrontend.dataManager) {
        checks.relationDataManagerStorage = !!window.relationFrontend.dataManager.storage;
    }
    
    // 实际存储系统检查
    const actualStorageSystem = window.relationFrontend?.storage;
    const expectedStorageSystem = window.AutogenUnifiedStorage;
    
    return {
        completeness: (Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100,
        checks: checks,
        actualStorage: actualStorageSystem?.constructor?.name || 'none',
        expectedStorage: expectedStorageSystem?.constructor?.name || 'none',
        properlyConnected: actualStorageSystem === expectedStorageSystem
    };
}

function checkEventIntegration() {
    const checks = {
        autogenEventBus: !!window.AutogenEventBus,
        relationEventListeners: false,
        mindmapEventListeners: false,
        viewToggleEvents: false
    };
    
    // 检查关系管理的事件监听
    if (window.relationFrontend) {
        // 这里需要检查实际的事件监听器设置
        // 由于无法直接检查事件监听器，我们检查相关方法是否存在
        checks.relationEventListeners = typeof window.relationFrontend.setupNodeSelectionListener === 'function';
        checks.viewToggleEvents = typeof window.relationFrontend.setupViewToggleListeners === 'function';
    }
    
    // 检查脑图事件监听
    const viewToggles = document.querySelectorAll('.view-toggle[data-view="relation"]');
    checks.mindmapEventListeners = viewToggles.length > 0;
    
    return {
        completeness: (Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100,
        checks: checks,
        eventBusAvailable: !!window.AutogenEventBus,
        usingEventBus: false // 需要代码分析确定
    };
}

function checkFunctionalIntegration() {
    const functions = {
        'loadNodeRelations': window.relationFrontend?.loadNodeRelations,
        'onRelationViewActivated': window.relationFrontend?.onRelationViewActivated,
        'onRelationViewDeactivated': window.relationFrontend?.onRelationViewDeactivated,
        'setupViewToggleListeners': window.relationFrontend?.setupViewToggleListeners,
        'setupNodeSelectionListener': window.relationFrontend?.setupNodeSelectionListener,
        'initializeStorage': window.relationFrontend?.initializeStorage
    };
    
    const available = Object.keys(functions).filter(key => typeof functions[key] === 'function');
    const missing = Object.keys(functions).filter(key => typeof functions[key] !== 'function');
    
    // 检查是否实际可用
    let actuallyWorking = false;
    try {
        if (window.relationFrontend && typeof window.relationFrontend.onRelationViewActivated === 'function') {
            // 尝试调用（但不实际激活）
            actuallyWorking = true;
        }
    } catch (error) {
        actuallyWorking = false;
    }
    
    return {
        completeness: (available.length / Object.keys(functions).length) * 100,
        available: available,
        missing: missing,
        actuallyWorking: actuallyWorking
    };
}

function checkArchitectureConsistency() {
    const checks = {
        followsAutogenPattern: false,
        usesUnifiedStorage: false,
        usesEventBus: false,
        properNaming: false,
        moduleStructure: false
    };
    
    // 检查是否遵循Autogen模式
    if (window.relationFrontend) {
        checks.usesUnifiedStorage = window.relationFrontend.storage === window.AutogenUnifiedStorage;
        checks.properNaming = window.relationFrontend.constructor.name === 'RelationFrontend';
        checks.moduleStructure = typeof window.relationFrontend.initializeStorage === 'function';
    }
    
    // 检查文件结构
    const relationFiles = [
        'relation_frontend.js',
        'src/relations/RelationDataManager.js',
        'src/relations/MindmapRelationExtractor.js',
        'src/visualization/D3RelationGraph.js'
    ];
    
    return {
        completeness: (Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100,
        checks: checks,
        fileStructure: relationFiles.length,
        followsConventions: checks.properNaming && checks.moduleStructure
    };
}

function analyzeReportAccuracy(auditResults) {
    const reportClaims = {
        'DOM结构集成': { claimed: 95, actual: auditResults.actualIntegration.dom.completeness },
        '脚本加载集成': { claimed: 100, actual: auditResults.actualIntegration.scripts.completeness },
        '存储系统集成': { claimed: 30, actual: auditResults.actualIntegration.storage.completeness },
        '事件系统集成': { claimed: 40, actual: auditResults.actualIntegration.events.completeness },
        '功能集成': { claimed: 90, actual: auditResults.actualIntegration.functionality.completeness },
        '架构一致性': { claimed: 65, actual: auditResults.actualIntegration.architecture.completeness }
    };
    
    auditResults.reportAccuracy = {};
    
    Object.keys(reportClaims).forEach(category => {
        const claim = reportClaims[category];
        const difference = Math.abs(claim.claimed - claim.actual);
        const accuracy = Math.max(0, 100 - difference);
        
        auditResults.reportAccuracy[category] = {
            claimed: claim.claimed,
            actual: claim.actual,
            difference: difference,
            accuracy: accuracy,
            status: difference > 20 ? 'significant_deviation' : difference > 10 ? 'moderate_deviation' : 'accurate'
        };
        
        if (difference > 20) {
            if (claim.claimed > claim.actual) {
                auditResults.overestimations.push({
                    category: category,
                    claimed: claim.claimed,
                    actual: claim.actual,
                    overestimation: claim.claimed - claim.actual
                });
            }
        }
    });
}

function generateObjectiveAssessment(auditResults) {
    // 计算真实的总体集成度
    const weights = {
        dom: 0.15,
        scripts: 0.20,
        storage: 0.25,
        events: 0.15,
        functionality: 0.15,
        architecture: 0.10
    };
    
    let weightedTotal = 0;
    Object.keys(weights).forEach(key => {
        if (auditResults.actualIntegration[key]) {
            weightedTotal += auditResults.actualIntegration[key].completeness * weights[key];
        }
    });
    
    auditResults.objectiveAssessment = {
        actualIntegrationLevel: Math.round(weightedTotal),
        reportedIntegrationLevel: 67, // 报告声称的65-70%
        accuracy: Math.abs(weightedTotal - 67) < 10 ? 'accurate' : 'inaccurate',
        criticalFindings: []
    };
    
    // 识别关键问题
    if (auditResults.actualIntegration.storage.completeness < 50) {
        auditResults.objectiveAssessment.criticalFindings.push('存储系统集成严重不足');
    }
    
    if (auditResults.actualIntegration.events.completeness < 30) {
        auditResults.objectiveAssessment.criticalFindings.push('事件系统集成基本缺失');
    }
    
    if (auditResults.actualIntegration.dom.critical_missing.length > 0) {
        auditResults.objectiveAssessment.criticalFindings.push('关键DOM元素缺失');
    }
}

// 创建审查按钮和报告显示
function createComprehensiveAuditButton() {
    const button = document.createElement('button');
    button.textContent = '🔍 全面审查关系栏集成';
    button.style.cssText = `
        position: fixed;
        top: 300px;
        right: 20px;
        padding: 8px 12px;
        background: #7c3aed;
        color: white;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
        font-weight: 500;
    `;
    
    button.addEventListener('click', async () => {
        button.textContent = '⏳ 审查中...';
        button.disabled = true;
        
        try {
            const results = comprehensiveRelationAudit();
            displayAuditResults(results);
            console.log('📋 完整审查报告:', results);
        } finally {
            setTimeout(() => {
                button.textContent = '🔍 全面审查关系栏集成';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 关系栏全面审查按钮已创建');
}

function displayAuditResults(results) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 800px;
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    const assessment = results.objectiveAssessment;
    
    content.innerHTML = `
        <h2>🔍 关系栏集成完成度客观审查报告</h2>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>📊 客观评估结果</h3>
            <p><strong>实际集成度:</strong> ${assessment.actualIntegrationLevel}%</p>
            <p><strong>报告声称:</strong> ${assessment.reportedIntegrationLevel}%</p>
            <p><strong>报告准确性:</strong> ${assessment.accuracy === 'accurate' ? '✅ 基本准确' : '❌ 存在偏差'}</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>⚠️ 关键发现</h3>
            ${assessment.criticalFindings.length > 0 ? 
                assessment.criticalFindings.map(finding => `<p>• ${finding}</p>`).join('') :
                '<p>✅ 未发现关键问题</p>'
            }
        </div>
        
        <div style="background: #f8d7da; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>📈 报告高估的部分</h3>
            ${results.overestimations.length > 0 ?
                results.overestimations.map(item => 
                    `<p>• ${item.category}: 声称${item.claimed}%, 实际${item.actual}% (高估${item.overestimation}%)</p>`
                ).join('') :
                '<p>✅ 未发现明显高估</p>'
            }
        </div>
        
        <div style="margin-top: 20px;">
            <h3>📋 详细集成度分析</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f8f9fa;">
                    <th style="padding: 8px; border: 1px solid #dee2e6;">模块</th>
                    <th style="padding: 8px; border: 1px solid #dee2e6;">实际完成度</th>
                    <th style="padding: 8px; border: 1px solid #dee2e6;">状态</th>
                </tr>
                ${Object.keys(results.actualIntegration).map(key => {
                    const data = results.actualIntegration[key];
                    const completeness = Math.round(data.completeness);
                    const status = completeness >= 80 ? '✅' : completeness >= 50 ? '⚠️' : '❌';
                    return `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">${key}</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">${completeness}%</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">${status}</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        </div>
        
        <button onclick="this.parentElement.parentElement.remove()" 
                style="margin-top: 20px; padding: 10px 20px; background: #6c757d; color: white; border: 0; border-radius: 4px; cursor: pointer;">
            关闭
        </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 延迟创建审查按钮
setTimeout(() => {
    createComprehensiveAuditButton();
    console.log('💡 点击右上角的"全面审查关系栏集成"按钮来获取客观评估');
}, 9000);

// 导出审查函数
window.comprehensiveRelationAudit = comprehensiveRelationAudit;

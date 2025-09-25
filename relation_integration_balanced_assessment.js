/**
 * 关系管理模块集成的平衡评估
 * 承认关系管理模块有自己的框架和规则
 * 重点评估兼容层面的集成，而非强制统一
 */

function balancedRelationAssessment() {
    console.log('🔍 开始平衡评估关系管理模块集成...');
    
    const assessment = {
        moduleAutonomy: {},      // 模块自主性评估
        integrationPoints: {},   // 集成点评估
        compatibilityLayer: {},  // 兼容层评估
        recommendations: []      // 平衡建议
    };
    
    // 1. 评估关系管理模块的自主性和完整性
    console.log('📋 1. 评估模块自主性...');
    assessModuleAutonomy(assessment);
    
    // 2. 评估必要的集成点
    console.log('📋 2. 评估集成点...');
    assessIntegrationPoints(assessment);
    
    // 3. 评估兼容层的有效性
    console.log('📋 3. 评估兼容层...');
    assessCompatibilityLayer(assessment);
    
    // 4. 生成平衡建议
    console.log('📋 4. 生成平衡建议...');
    generateBalancedRecommendations(assessment);
    
    return assessment;
}

function assessModuleAutonomy(assessment) {
    const autonomyChecks = {
        hasOwnArchitecture: checkRelationArchitecture(),
        hasOwnDataModel: checkRelationDataModel(),
        hasOwnLifecycle: checkRelationLifecycle(),
        hasOwnUI: checkRelationUI(),
        functionallyComplete: checkFunctionalCompleteness()
    };
    
    assessment.moduleAutonomy = {
        checks: autonomyChecks,
        autonomyScore: calculateAutonomyScore(autonomyChecks),
        strengths: [],
        gaps: []
    };
    
    // 识别优势
    if (autonomyChecks.hasOwnArchitecture.score > 70) {
        assessment.moduleAutonomy.strengths.push('拥有清晰的架构设计');
    }
    if (autonomyChecks.hasOwnDataModel.score > 70) {
        assessment.moduleAutonomy.strengths.push('拥有完整的数据模型');
    }
    if (autonomyChecks.hasOwnLifecycle.score > 70) {
        assessment.moduleAutonomy.strengths.push('拥有独立的生命周期管理');
    }
    
    // 识别不足
    Object.keys(autonomyChecks).forEach(key => {
        if (autonomyChecks[key].score < 50) {
            assessment.moduleAutonomy.gaps.push(autonomyChecks[key].description);
        }
    });
}

function checkRelationArchitecture() {
    const components = {
        'RelationFrontend': !!window.RelationFrontend,
        'RelationDataManager': !!window.RelationDataManager,
        'MindmapRelationExtractor': !!window.MindmapRelationExtractor,
        'D3RelationGraph': !!window.D3RelationGraph
    };
    
    const patterns = {
        'MVC分离': window.RelationFrontend && window.RelationDataManager,
        '数据抽象': !!window.RelationDataManager,
        '视图分离': !!window.D3RelationGraph,
        '提取器模式': !!window.MindmapRelationExtractor
    };
    
    const componentScore = (Object.values(components).filter(Boolean).length / Object.keys(components).length) * 100;
    const patternScore = (Object.values(patterns).filter(Boolean).length / Object.keys(patterns).length) * 100;
    
    return {
        score: (componentScore + patternScore) / 2,
        components: components,
        patterns: patterns,
        description: '关系管理模块架构完整性'
    };
}

function checkRelationDataModel() {
    let dataModelScore = 0;
    let features = [];
    
    if (window.relationFrontend) {
        const rf = window.relationFrontend;
        
        // 检查数据结构
        if (rf.relationData && typeof rf.relationData === 'object') {
            dataModelScore += 25;
            features.push('关系数据结构');
        }
        
        // 检查关系类型定义
        if (rf.relationTypes && Array.isArray(rf.relationTypes)) {
            dataModelScore += 25;
            features.push('关系类型定义');
        }
        
        // 检查数据管理器
        if (rf.dataManager) {
            dataModelScore += 25;
            features.push('数据管理器');
        }
        
        // 检查缓存机制
        if (rf.dataManager && rf.dataManager.cache) {
            dataModelScore += 25;
            features.push('缓存机制');
        }
    }
    
    return {
        score: dataModelScore,
        features: features,
        description: '关系数据模型完整性'
    };
}

function checkRelationLifecycle() {
    let lifecycleScore = 0;
    let capabilities = [];
    
    if (window.relationFrontend) {
        const rf = window.relationFrontend;
        
        // 检查初始化
        if (typeof rf.initializeUI === 'function') {
            lifecycleScore += 20;
            capabilities.push('UI初始化');
        }
        
        // 检查激活/停用
        if (typeof rf.onRelationViewActivated === 'function' && 
            typeof rf.onRelationViewDeactivated === 'function') {
            lifecycleScore += 30;
            capabilities.push('按需激活机制');
        }
        
        // 检查数据加载
        if (typeof rf.loadNodeRelations === 'function') {
            lifecycleScore += 25;
            capabilities.push('数据加载');
        }
        
        // 检查清理机制
        if (rf.isActive !== undefined) {
            lifecycleScore += 25;
            capabilities.push('状态管理');
        }
    }
    
    return {
        score: lifecycleScore,
        capabilities: capabilities,
        description: '生命周期管理完整性'
    };
}

function checkRelationUI() {
    const uiElements = {
        'relation-column': !!document.getElementById('relation-column'),
        'relation-toolbar': !!document.querySelector('.relation-toolbar'),
        'view-toggle': !!document.querySelector('.view-toggle[data-view="relation"]'),
        'd3-container': !!document.getElementById('relation-d3-container')
    };
    
    const uiScore = (Object.values(uiElements).filter(Boolean).length / Object.keys(uiElements).length) * 100;
    
    return {
        score: uiScore,
        elements: uiElements,
        description: '用户界面完整性'
    };
}

function checkFunctionalCompleteness() {
    let functionalScore = 0;
    let functions = [];
    
    if (window.relationFrontend) {
        const rf = window.relationFrontend;
        
        const requiredFunctions = [
            'loadNodeRelations',
            'setupViewToggleListeners',
            'setupNodeSelectionListener',
            'onRelationViewActivated',
            'onRelationViewDeactivated'
        ];
        
        requiredFunctions.forEach(funcName => {
            if (typeof rf[funcName] === 'function') {
                functionalScore += 20;
                functions.push(funcName);
            }
        });
    }
    
    return {
        score: functionalScore,
        functions: functions,
        description: '功能完整性'
    };
}

function assessIntegrationPoints(assessment) {
    const integrationPoints = {
        dataExchange: assessDataExchange(),
        eventCommunication: assessEventCommunication(),
        uiIntegration: assessUIIntegration(),
        storageCompatibility: assessStorageCompatibility()
    };
    
    assessment.integrationPoints = {
        points: integrationPoints,
        overallScore: calculateIntegrationScore(integrationPoints),
        criticalPoints: [],
        optionalPoints: []
    };
    
    // 识别关键集成点
    Object.keys(integrationPoints).forEach(key => {
        const point = integrationPoints[key];
        if (point.importance === 'critical' && point.score < 70) {
            assessment.integrationPoints.criticalPoints.push({
                name: key,
                score: point.score,
                issue: point.issue
            });
        } else if (point.importance === 'optional') {
            assessment.integrationPoints.optionalPoints.push({
                name: key,
                score: point.score
            });
        }
    });
}

function assessDataExchange() {
    let score = 0;
    let capabilities = [];
    
    // 检查是否能从脑图获取数据
    if (window.relationFrontend && window.mindmapController) {
        score += 40;
        capabilities.push('脑图数据访问');
    }
    
    // 检查是否能向脑图传递选择事件
    if (window.relationFrontend && typeof window.relationFrontend.setupNodeSelectionListener === 'function') {
        score += 30;
        capabilities.push('节点选择监听');
    }
    
    // 检查数据提取器
    if (window.MindmapRelationExtractor) {
        score += 30;
        capabilities.push('关系提取');
    }
    
    return {
        score: score,
        capabilities: capabilities,
        importance: 'critical',
        issue: score < 70 ? '数据交换机制不完整' : null
    };
}

function assessEventCommunication() {
    let score = 0;
    let mechanisms = [];
    
    // 检查视图切换事件
    const viewToggle = document.querySelector('.view-toggle[data-view="relation"]');
    if (viewToggle) {
        score += 50;
        mechanisms.push('视图切换事件');
    }
    
    // 检查节点选择事件
    if (window.relationFrontend && typeof window.relationFrontend.setupNodeSelectionListener === 'function') {
        score += 50;
        mechanisms.push('节点选择事件');
    }
    
    return {
        score: score,
        mechanisms: mechanisms,
        importance: 'critical',
        issue: score < 70 ? '事件通信机制不完整' : null
    };
}

function assessUIIntegration() {
    let score = 0;
    let integrations = [];
    
    // 检查列布局集成
    if (document.getElementById('relation-column')) {
        score += 40;
        integrations.push('列布局集成');
    }
    
    // 检查视图切换集成
    if (document.querySelector('.view-toggle[data-view="relation"]')) {
        score += 30;
        integrations.push('视图切换集成');
    }
    
    // 检查分割线集成
    if (document.getElementById('mindmap-relation-divider')) {
        score += 30;
        integrations.push('分割线集成');
    }
    
    return {
        score: score,
        integrations: integrations,
        importance: 'high',
        issue: score < 70 ? 'UI集成不完整' : null
    };
}

function assessStorageCompatibility() {
    let score = 0;
    let compatibility = [];
    
    // 检查存储接口兼容性
    if (window.relationFrontend && window.relationFrontend.storage) {
        score += 50;
        compatibility.push('存储接口');
    }
    
    // 检查数据格式兼容性
    if (window.relationFrontend && window.relationFrontend.dataManager) {
        score += 50;
        compatibility.push('数据管理器');
    }
    
    return {
        score: score,
        compatibility: compatibility,
        importance: 'optional',
        issue: score < 50 ? '存储兼容性可改进' : null
    };
}

function assessCompatibilityLayer(assessment) {
    const compatibilityChecks = {
        storageAdapter: checkStorageAdapter(),
        eventBridge: checkEventBridge(),
        dataTranslator: checkDataTranslator(),
        uiBridge: checkUIBridge()
    };
    
    assessment.compatibilityLayer = {
        checks: compatibilityChecks,
        overallScore: calculateCompatibilityScore(compatibilityChecks),
        existingAdapters: [],
        missingAdapters: []
    };
    
    // 识别现有和缺失的适配器
    Object.keys(compatibilityChecks).forEach(key => {
        const check = compatibilityChecks[key];
        if (check.exists) {
            assessment.compatibilityLayer.existingAdapters.push({
                name: key,
                effectiveness: check.effectiveness
            });
        } else {
            assessment.compatibilityLayer.missingAdapters.push({
                name: key,
                necessity: check.necessity
            });
        }
    });
}

function checkStorageAdapter() {
    // 检查关系管理模块是否有存储适配器
    const hasAdapter = window.relationFrontend && 
                      window.relationFrontend.storage !== null;
    
    let effectiveness = 0;
    if (hasAdapter) {
        // 检查适配器的有效性
        const storage = window.relationFrontend.storage;
        if (storage && typeof storage.store === 'function') {
            effectiveness = 80;
        } else {
            effectiveness = 40;
        }
    }
    
    return {
        exists: hasAdapter,
        effectiveness: effectiveness,
        necessity: 'medium'
    };
}

function checkEventBridge() {
    // 检查是否有事件桥接机制
    const hasEventListeners = window.relationFrontend && 
                             typeof window.relationFrontend.setupViewToggleListeners === 'function';
    
    return {
        exists: hasEventListeners,
        effectiveness: hasEventListeners ? 70 : 0,
        necessity: 'high'
    };
}

function checkDataTranslator() {
    // 检查数据转换器
    const hasExtractor = !!window.MindmapRelationExtractor;
    
    return {
        exists: hasExtractor,
        effectiveness: hasExtractor ? 75 : 0,
        necessity: 'high'
    };
}

function checkUIBridge() {
    // 检查UI桥接
    const hasUIIntegration = document.getElementById('relation-column') && 
                           document.querySelector('.view-toggle[data-view="relation"]');
    
    return {
        exists: hasUIIntegration,
        effectiveness: hasUIIntegration ? 85 : 0,
        necessity: 'high'
    };
}

function generateBalancedRecommendations(assessment) {
    const recommendations = [];
    
    // 基于模块自主性的建议
    if (assessment.moduleAutonomy.autonomyScore > 70) {
        recommendations.push({
            type: 'preserve',
            priority: 'high',
            title: '保持模块架构独立性',
            description: '关系管理模块已有良好的架构设计，应保持其独立性，避免强制统一',
            rationale: '模块自主性评分: ' + Math.round(assessment.moduleAutonomy.autonomyScore) + '%'
        });
    }
    
    // 基于集成点的建议
    assessment.integrationPoints.criticalPoints.forEach(point => {
        recommendations.push({
            type: 'improve',
            priority: 'high',
            title: `改进${point.name}集成`,
            description: `通过兼容层改进${point.name}，而非强制架构统一`,
            rationale: point.issue
        });
    });
    
    // 基于兼容层的建议
    assessment.compatibilityLayer.missingAdapters.forEach(adapter => {
        if (adapter.necessity === 'high') {
            recommendations.push({
                type: 'add',
                priority: 'medium',
                title: `添加${adapter.name}适配器`,
                description: `创建轻量级适配器实现兼容，保持模块独立性`,
                rationale: `${adapter.name}对集成很重要但当前缺失`
            });
        }
    });
    
    // 平衡性建议
    recommendations.push({
        type: 'balance',
        priority: 'high',
        title: '采用兼容层策略',
        description: '通过适配器和桥接模式实现集成，而非强制统一架构',
        rationale: '尊重模块的设计理念和技术选型'
    });
    
    assessment.recommendations = recommendations;
}

// 辅助计算函数
function calculateAutonomyScore(checks) {
    const scores = Object.values(checks).map(check => check.score);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function calculateIntegrationScore(points) {
    const scores = Object.values(points).map(point => point.score);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function calculateCompatibilityScore(checks) {
    const scores = Object.values(checks).map(check => check.effectiveness);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

// 创建平衡评估按钮
function createBalancedAssessmentButton() {
    const button = document.createElement('button');
    button.textContent = '⚖️ 平衡评估关系模块';
    button.style.cssText = `
        position: fixed;
        top: 340px;
        right: 20px;
        padding: 8px 12px;
        background: #059669;
        color: white;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
        font-weight: 500;
    `;
    
    button.addEventListener('click', async () => {
        button.textContent = '⏳ 评估中...';
        button.disabled = true;
        
        try {
            const results = balancedRelationAssessment();
            displayBalancedResults(results);
            console.log('📋 平衡评估报告:', results);
        } finally {
            setTimeout(() => {
                button.textContent = '⚖️ 平衡评估关系模块';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 关系模块平衡评估按钮已创建');
}

function displayBalancedResults(results) {
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
        max-width: 900px;
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
        <h2>⚖️ 关系管理模块平衡评估报告</h2>
        
        <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🏗️ 模块自主性评估</h3>
            <p><strong>自主性评分:</strong> ${Math.round(results.moduleAutonomy.autonomyScore)}%</p>
            <p><strong>模块优势:</strong></p>
            <ul>${results.moduleAutonomy.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            ${results.moduleAutonomy.gaps.length > 0 ? 
                `<p><strong>改进空间:</strong></p><ul>${results.moduleAutonomy.gaps.map(g => `<li>${g}</li>`).join('')}</ul>` : 
                '<p>✅ 模块架构完整</p>'
            }
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🔗 集成点评估</h3>
            <p><strong>集成评分:</strong> ${Math.round(results.integrationPoints.overallScore)}%</p>
            ${results.integrationPoints.criticalPoints.length > 0 ?
                `<p><strong>关键集成点:</strong></p>
                <ul>${results.integrationPoints.criticalPoints.map(p => 
                    `<li>${p.name}: ${p.score}% - ${p.issue || '正常'}</li>`
                ).join('')}</ul>` :
                '<p>✅ 关键集成点运行正常</p>'
            }
        </div>
        
        <div style="background: #e0e7ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🌉 兼容层评估</h3>
            <p><strong>兼容性评分:</strong> ${Math.round(results.compatibilityLayer.overallScore)}%</p>
            ${results.compatibilityLayer.existingAdapters.length > 0 ?
                `<p><strong>现有适配器:</strong></p>
                <ul>${results.compatibilityLayer.existingAdapters.map(a => 
                    `<li>${a.name}: ${a.effectiveness}% 有效性</li>`
                ).join('')}</ul>` : ''
            }
            ${results.compatibilityLayer.missingAdapters.length > 0 ?
                `<p><strong>建议添加:</strong></p>
                <ul>${results.compatibilityLayer.missingAdapters.map(a => 
                    `<li>${a.name} (${a.necessity}优先级)</li>`
                ).join('')}</ul>` : ''
            }
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>💡 平衡建议</h3>
            ${results.recommendations.map(rec => `
                <div style="margin: 10px 0; padding: 10px; border-left: 3px solid ${
                    rec.priority === 'high' ? '#ef4444' : 
                    rec.priority === 'medium' ? '#f59e0b' : '#10b981'
                };">
                    <strong>${rec.title}</strong><br>
                    ${rec.description}<br>
                    <small style="color: #6b7280;">理由: ${rec.rationale}</small>
                </div>
            `).join('')}
        </div>
        
        <button onclick="this.parentElement.parentElement.remove()" 
                style="margin-top: 20px; padding: 10px 20px; background: #6c757d; color: white; border: 0; border-radius: 4px; cursor: pointer;">
            关闭
        </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 延迟创建评估按钮
setTimeout(() => {
    createBalancedAssessmentButton();
    console.log('💡 点击右上角的"平衡评估关系模块"按钮来获取客观评估');
}, 10000);

// 导出评估函数
window.balancedRelationAssessment = balancedRelationAssessment;

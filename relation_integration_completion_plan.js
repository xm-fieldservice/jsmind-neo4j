/**
 * 关系管理模块集成完成度重新评估与完成方案
 * 基于平衡理念：保持模块独立性，通过兼容层实现必要集成
 */

function reassessRelationIntegration() {
    console.log('🔄 重新评估关系管理模块集成完成度...');
    
    const assessment = {
        currentStatus: {},
        completionPlan: {},
        implementationSteps: [],
        timeline: {},
        resources: {}
    };
    
    // 1. 重新评估当前状态
    console.log('📋 1. 重新评估当前状态...');
    assessCurrentStatus(assessment);
    
    // 2. 制定完成计划
    console.log('📋 2. 制定完成计划...');
    createCompletionPlan(assessment);
    
    // 3. 生成实施步骤
    console.log('📋 3. 生成实施步骤...');
    generateImplementationSteps(assessment);
    
    // 4. 制定时间线
    console.log('📋 4. 制定时间线...');
    createTimeline(assessment);
    
    return assessment;
}

function assessCurrentStatus(assessment) {
    const modules = {
        coreModule: assessCoreModule(),
        uiIntegration: assessUIIntegration(),
        dataFlow: assessDataFlow(),
        eventSystem: assessEventSystem(),
        storageLayer: assessStorageLayer(),
        visualization: assessVisualization()
    };
    
    // 计算加权完成度
    const weights = {
        coreModule: 0.25,      // 核心模块完整性
        uiIntegration: 0.20,   // UI集成
        dataFlow: 0.20,        // 数据流
        eventSystem: 0.15,     // 事件系统
        storageLayer: 0.10,    // 存储层
        visualization: 0.10    // 可视化
    };
    
    let weightedScore = 0;
    Object.keys(modules).forEach(key => {
        weightedScore += modules[key].completeness * weights[key];
    });
    
    assessment.currentStatus = {
        modules: modules,
        overallCompleteness: Math.round(weightedScore),
        strengths: [],
        gaps: [],
        criticalIssues: []
    };
    
    // 识别优势和不足
    Object.keys(modules).forEach(key => {
        const module = modules[key];
        if (module.completeness >= 80) {
            assessment.currentStatus.strengths.push({
                module: key,
                score: module.completeness,
                highlights: module.highlights
            });
        } else if (module.completeness < 50) {
            assessment.currentStatus.gaps.push({
                module: key,
                score: module.completeness,
                issues: module.issues
            });
        }
        
        if (module.criticalIssues) {
            assessment.currentStatus.criticalIssues.push(...module.criticalIssues);
        }
    });
}

function assessCoreModule() {
    const components = {
        RelationFrontend: !!window.RelationFrontend,
        RelationDataManager: !!window.RelationDataManager,
        MindmapRelationExtractor: !!window.MindmapRelationExtractor,
        relationFrontendInstance: !!window.relationFrontend
    };
    
    const functionality = {
        initialization: window.relationFrontend && typeof window.relationFrontend.initializeUI === 'function',
        lifecycle: window.relationFrontend && typeof window.relationFrontend.onRelationViewActivated === 'function',
        dataLoading: window.relationFrontend && typeof window.relationFrontend.loadNodeRelations === 'function',
        eventHandling: window.relationFrontend && typeof window.relationFrontend.setupViewToggleListeners === 'function'
    };
    
    const componentScore = (Object.values(components).filter(Boolean).length / Object.keys(components).length) * 100;
    const functionalityScore = (Object.values(functionality).filter(Boolean).length / Object.keys(functionality).length) * 100;
    
    const completeness = (componentScore + functionalityScore) / 2;
    
    return {
        completeness: Math.round(completeness),
        components: components,
        functionality: functionality,
        highlights: completeness >= 80 ? ['架构完整', '功能齐全'] : [],
        issues: completeness < 50 ? ['核心组件缺失', '功能不完整'] : [],
        criticalIssues: componentScore < 50 ? ['核心组件未正确加载'] : []
    };
}

function assessUIIntegration() {
    const elements = {
        relationColumn: !!document.getElementById('relation-column'),
        viewToggle: !!document.querySelector('.view-toggle[data-view="relation"]'),
        toolbar: !!document.querySelector('.relation-toolbar'),
        container: !!document.querySelector('.relation-container')
    };
    
    const layout = {
        columnLayout: !!document.getElementById('relation-column'),
        dividers: !!document.getElementById('mindmap-relation-divider'),
        responsive: true // 假设支持响应式
    };
    
    const elementScore = (Object.values(elements).filter(Boolean).length / Object.keys(elements).length) * 100;
    const layoutScore = (Object.values(layout).filter(Boolean).length / Object.keys(layout).length) * 100;
    
    const completeness = (elementScore + layoutScore) / 2;
    
    return {
        completeness: Math.round(completeness),
        elements: elements,
        layout: layout,
        highlights: completeness >= 80 ? ['UI结构完整', '布局协调良好'] : [],
        issues: completeness < 50 ? ['UI元素缺失', '布局不完整'] : []
    };
}

function assessDataFlow() {
    const dataAccess = {
        mindmapAccess: !!(window.relationFrontend && window.mindmapController),
        extractorAvailable: !!window.MindmapRelationExtractor,
        dataManagerWorking: !!(window.relationFrontend && window.relationFrontend.dataManager)
    };
    
    const dataProcessing = {
        relationExtraction: !!window.MindmapRelationExtractor,
        dataTransformation: !!(window.relationFrontend && window.relationFrontend.relationData),
        caching: !!(window.relationFrontend && window.relationFrontend.dataManager && window.relationFrontend.dataManager.cache)
    };
    
    const accessScore = (Object.values(dataAccess).filter(Boolean).length / Object.keys(dataAccess).length) * 100;
    const processingScore = (Object.values(dataProcessing).filter(Boolean).length / Object.keys(dataProcessing).length) * 100;
    
    const completeness = (accessScore + processingScore) / 2;
    
    return {
        completeness: Math.round(completeness),
        dataAccess: dataAccess,
        dataProcessing: dataProcessing,
        highlights: completeness >= 80 ? ['数据访问畅通', '处理机制完善'] : [],
        issues: completeness < 50 ? ['数据访问受限', '处理机制不完整'] : []
    };
}

function assessEventSystem() {
    const eventHandling = {
        viewToggleEvents: !!document.querySelector('.view-toggle[data-view="relation"]'),
        nodeSelectionEvents: !!(window.relationFrontend && typeof window.relationFrontend.setupNodeSelectionListener === 'function'),
        activationEvents: !!(window.relationFrontend && typeof window.relationFrontend.onRelationViewActivated === 'function')
    };
    
    const eventBridging = {
        mindmapEvents: !!(window.mindmapController && window.relationFrontend),
        uiEvents: !!document.querySelector('.view-toggle[data-view="relation"]'),
        customEvents: false // 需要检查自定义事件
    };
    
    const handlingScore = (Object.values(eventHandling).filter(Boolean).length / Object.keys(eventHandling).length) * 100;
    const bridgingScore = (Object.values(eventBridging).filter(Boolean).length / Object.keys(eventBridging).length) * 100;
    
    const completeness = (handlingScore + bridgingScore) / 2;
    
    return {
        completeness: Math.round(completeness),
        eventHandling: eventHandling,
        eventBridging: eventBridging,
        highlights: completeness >= 80 ? ['事件处理完善', '桥接机制良好'] : [],
        issues: completeness < 50 ? ['事件处理不完整', '桥接机制缺失'] : []
    };
}

function assessStorageLayer() {
    const storageAccess = {
        hasStorageReference: !!(window.relationFrontend && window.relationFrontend.storage),
        storageWorking: false, // 需要测试
        dataManagerStorage: !!(window.relationFrontend && window.relationFrontend.dataManager && window.relationFrontend.dataManager.storage)
    };
    
    // 测试存储是否工作
    if (window.relationFrontend && window.relationFrontend.storage) {
        try {
            storageAccess.storageWorking = typeof window.relationFrontend.storage.store === 'function' ||
                                          typeof window.relationFrontend.storage.setItem === 'function';
        } catch (e) {
            storageAccess.storageWorking = false;
        }
    }
    
    const completeness = (Object.values(storageAccess).filter(Boolean).length / Object.keys(storageAccess).length) * 100;
    
    return {
        completeness: Math.round(completeness),
        storageAccess: storageAccess,
        highlights: completeness >= 80 ? ['存储访问正常'] : [],
        issues: completeness < 50 ? ['存储访问异常'] : []
    };
}

function assessVisualization() {
    const d3Integration = {
        d3Available: !!window.d3,
        d3GraphClass: !!window.D3RelationGraph,
        containerReady: !!document.getElementById('relation-d3-container'),
        graphInstance: !!(window.relationFrontend && window.relationFrontend.d3Graph)
    };
    
    const completeness = (Object.values(d3Integration).filter(Boolean).length / Object.keys(d3Integration).length) * 100;
    
    return {
        completeness: Math.round(completeness),
        d3Integration: d3Integration,
        highlights: completeness >= 80 ? ['D3.js集成完善'] : [],
        issues: completeness < 50 ? ['可视化组件缺失'] : []
    };
}

function createCompletionPlan(assessment) {
    const plan = {
        phase1: { name: '基础完善', priority: 'high', tasks: [] },
        phase2: { name: '集成优化', priority: 'medium', tasks: [] },
        phase3: { name: '功能增强', priority: 'low', tasks: [] }
    };
    
    // 基于评估结果生成任务
    assessment.currentStatus.criticalIssues.forEach(issue => {
        plan.phase1.tasks.push({
            type: 'critical',
            description: `解决关键问题: ${issue}`,
            effort: 'high'
        });
    });
    
    assessment.currentStatus.gaps.forEach(gap => {
        if (gap.score < 30) {
            plan.phase1.tasks.push({
                type: 'gap',
                description: `完善${gap.module}模块 (当前${gap.score}%)`,
                effort: 'high'
            });
        } else if (gap.score < 70) {
            plan.phase2.tasks.push({
                type: 'improvement',
                description: `优化${gap.module}模块 (当前${gap.score}%)`,
                effort: 'medium'
            });
        }
    });
    
    // 添加具体的完成任务
    addSpecificCompletionTasks(plan, assessment);
    
    assessment.completionPlan = plan;
}

function addSpecificCompletionTasks(plan, assessment) {
    const currentStatus = assessment.currentStatus;
    
    // 基础完善任务
    if (currentStatus.modules.coreModule.completeness < 80) {
        plan.phase1.tasks.push({
            type: 'core',
            description: '确保所有核心组件正确加载和初始化',
            details: [
                '验证RelationFrontend类定义',
                '确保relationFrontend实例创建',
                '检查所有必要方法的可用性'
            ],
            effort: 'medium'
        });
    }
    
    if (currentStatus.modules.uiIntegration.completeness < 80) {
        plan.phase1.tasks.push({
            type: 'ui',
            description: '完善UI集成',
            details: [
                '添加缺失的DOM元素',
                '完善工具栏和容器结构',
                '确保响应式布局'
            ],
            effort: 'medium'
        });
    }
    
    // 集成优化任务
    if (currentStatus.modules.dataFlow.completeness < 80) {
        plan.phase2.tasks.push({
            type: 'data',
            description: '优化数据流集成',
            details: [
                '创建数据访问适配器',
                '实现数据转换机制',
                '优化缓存策略'
            ],
            effort: 'medium'
        });
    }
    
    if (currentStatus.modules.eventSystem.completeness < 80) {
        plan.phase2.tasks.push({
            type: 'events',
            description: '完善事件系统集成',
            details: [
                '创建事件桥接器',
                '实现双向事件通信',
                '优化事件处理性能'
            ],
            effort: 'medium'
        });
    }
    
    // 功能增强任务
    plan.phase3.tasks.push({
        type: 'enhancement',
        description: '功能增强和优化',
        details: [
            '添加高级可视化功能',
            '实现关系分析算法',
            '优化用户交互体验'
        ],
        effort: 'low'
    });
}

function generateImplementationSteps(assessment) {
    const steps = [];
    const plan = assessment.completionPlan;
    
    // Phase 1 步骤
    steps.push({
        phase: 1,
        title: '基础完善阶段',
        steps: [
            {
                step: 1,
                title: '核心组件检查',
                description: '验证所有核心组件的加载和初始化状态',
                code: `
// 检查核心组件
const coreCheck = {
    RelationFrontend: !!window.RelationFrontend,
    RelationDataManager: !!window.RelationDataManager,
    relationFrontend: !!window.relationFrontend
};
console.log('核心组件状态:', coreCheck);
                `,
                expected: '所有核心组件都应该为true'
            },
            {
                step: 2,
                title: 'DOM结构完善',
                description: '确保所有必要的DOM元素存在',
                code: `
// 检查并创建缺失的DOM元素
const requiredElements = [
    'relation-container',
    'relation-list', 
    'relation-d3-container',
    'relation-toolbar'
];

requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
        console.warn(\`缺失元素: \${id}\`);
        // 创建元素的代码...
    }
});
                `,
                expected: '所有必要DOM元素都存在'
            },
            {
                step: 3,
                title: '基础功能测试',
                description: '测试关系管理模块的基础功能',
                code: `
// 测试基础功能
if (window.relationFrontend) {
    const tests = [
        () => typeof window.relationFrontend.initializeUI === 'function',
        () => typeof window.relationFrontend.onRelationViewActivated === 'function',
        () => typeof window.relationFrontend.loadNodeRelations === 'function'
    ];
    
    const results = tests.map(test => test());
    console.log('功能测试结果:', results);
}
                `,
                expected: '所有基础功能测试通过'
            }
        ]
    });
    
    // Phase 2 步骤
    steps.push({
        phase: 2,
        title: '集成优化阶段',
        steps: [
            {
                step: 1,
                title: '数据流集成',
                description: '建立与脑图系统的数据交换机制',
                code: `
// 创建数据访问适配器
class MindmapDataAdapter {
    static getMindmapData() {
        return window.mindmapController?.data;
    }
    
    static getSelectedNode() {
        return window.mindmapController?.selectedNode;
    }
}

// 集成到关系管理模块
if (window.relationFrontend) {
    window.relationFrontend.mindmapAdapter = MindmapDataAdapter;
}
                `,
                expected: '数据访问适配器工作正常'
            },
            {
                step: 2,
                title: '事件桥接',
                description: '建立事件通信桥梁',
                code: `
// 创建事件桥接器
class EventBridge {
    static setupNodeSelectionSync() {
        // 监听脑图节点选择
        if (window.mindmapController) {
            // 添加节点选择监听器
        }
        
        // 监听关系图节点选择
        if (window.relationFrontend) {
            // 添加关系图选择监听器
        }
    }
}

EventBridge.setupNodeSelectionSync();
                `,
                expected: '双向事件同步工作正常'
            }
        ]
    });
    
    // Phase 3 步骤
    steps.push({
        phase: 3,
        title: '功能增强阶段',
        steps: [
            {
                step: 1,
                title: '可视化增强',
                description: '优化D3.js可视化效果',
                expected: '可视化效果更加丰富和流畅'
            },
            {
                step: 2,
                title: '性能优化',
                description: '优化大数据量下的性能表现',
                expected: '大数据量下仍保持良好性能'
            }
        ]
    });
    
    assessment.implementationSteps = steps;
}

function createTimeline(assessment) {
    const timeline = {
        phase1: {
            name: '基础完善',
            duration: '1-2天',
            priority: 'high',
            deliverables: [
                '所有核心组件正常工作',
                'DOM结构完整',
                '基础功能可用'
            ]
        },
        phase2: {
            name: '集成优化', 
            duration: '2-3天',
            priority: 'medium',
            deliverables: [
                '数据流畅通',
                '事件同步正常',
                '存储兼容性良好'
            ]
        },
        phase3: {
            name: '功能增强',
            duration: '3-5天',
            priority: 'low',
            deliverables: [
                '可视化效果优秀',
                '性能表现良好',
                '用户体验完善'
            ]
        }
    };
    
    assessment.timeline = timeline;
}

// 创建完成方案按钮和显示
function createCompletionPlanButton() {
    const button = document.createElement('button');
    button.textContent = '📋 制定完成方案';
    button.style.cssText = `
        position: fixed;
        top: 380px;
        right: 20px;
        padding: 8px 12px;
        background: #dc2626;
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
            const results = reassessRelationIntegration();
            displayCompletionPlan(results);
            console.log('📋 完成方案报告:', results);
        } finally {
            setTimeout(() => {
                button.textContent = '📋 制定完成方案';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 完成方案按钮已创建');
}

function displayCompletionPlan(results) {
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
        max-width: 1000px;
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    const currentStatus = results.currentStatus;
    const plan = results.completionPlan;
    
    content.innerHTML = `
        <h2>📋 关系管理模块完成方案</h2>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>📊 当前完成度评估</h3>
            <div style="font-size: 24px; font-weight: bold; color: #059669; text-align: center; margin: 10px 0;">
                ${currentStatus.overallCompleteness}%
            </div>
            
            <div style="display: flex; gap: 20px; margin-top: 15px;">
                <div style="flex: 1;">
                    <h4>✅ 模块优势</h4>
                    ${currentStatus.strengths.length > 0 ? 
                        currentStatus.strengths.map(s => 
                            `<p>• ${s.module}: ${s.score}% - ${s.highlights.join(', ')}</p>`
                        ).join('') :
                        '<p>需要进一步完善</p>'
                    }
                </div>
                <div style="flex: 1;">
                    <h4>⚠️ 待改进项</h4>
                    ${currentStatus.gaps.length > 0 ?
                        currentStatus.gaps.map(g => 
                            `<p>• ${g.module}: ${g.score}% - ${g.issues.join(', ')}</p>`
                        ).join('') :
                        '<p>✅ 主要模块完成度良好</p>'
                    }
                </div>
            </div>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🚀 三阶段完成计划</h3>
            
            <div style="margin: 15px 0;">
                <h4 style="color: #dc2626;">阶段一: ${plan.phase1.name} (高优先级)</h4>
                <p><strong>预计时间:</strong> ${results.timeline.phase1.duration}</p>
                <ul>
                    ${plan.phase1.tasks.map(task => `<li>${task.description}</li>`).join('')}
                </ul>
                <p><strong>交付成果:</strong> ${results.timeline.phase1.deliverables.join(', ')}</p>
            </div>
            
            <div style="margin: 15px 0;">
                <h4 style="color: #f59e0b;">阶段二: ${plan.phase2.name} (中优先级)</h4>
                <p><strong>预计时间:</strong> ${results.timeline.phase2.duration}</p>
                <ul>
                    ${plan.phase2.tasks.map(task => `<li>${task.description}</li>`).join('')}
                </ul>
                <p><strong>交付成果:</strong> ${results.timeline.phase2.deliverables.join(', ')}</p>
            </div>
            
            <div style="margin: 15px 0;">
                <h4 style="color: #10b981;">阶段三: ${plan.phase3.name} (低优先级)</h4>
                <p><strong>预计时间:</strong> ${results.timeline.phase3.duration}</p>
                <ul>
                    ${plan.phase3.tasks.map(task => `<li>${task.description}</li>`).join('')}
                </ul>
                <p><strong>交付成果:</strong> ${results.timeline.phase3.deliverables.join(', ')}</p>
            </div>
        </div>
        
        <div style="background: #e0e7ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>⏱️ 总体时间线</h3>
            <p><strong>总预计时间:</strong> 6-10天</p>
            <p><strong>最小可用版本:</strong> 完成阶段一后即可基本使用</p>
            <p><strong>完整功能版本:</strong> 完成阶段二后功能完整</p>
            <p><strong>优化版本:</strong> 完成阶段三后达到最佳状态</p>
        </div>
        
        <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>💡 实施建议</h3>
            <ul>
                <li><strong>优先级原则:</strong> 先确保基础功能可用，再优化集成效果</li>
                <li><strong>渐进式完成:</strong> 每个阶段完成后都有可用的功能增量</li>
                <li><strong>保持独立性:</strong> 通过适配器和桥接实现集成，不破坏模块架构</li>
                <li><strong>测试驱动:</strong> 每个阶段都有明确的测试标准和验收条件</li>
            </ul>
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

// 延迟创建按钮
setTimeout(() => {
    createCompletionPlanButton();
    console.log('💡 点击右上角的"制定完成方案"按钮来查看详细的完成计划');
}, 11000);

// 导出函数
window.reassessRelationIntegration = reassessRelationIntegration;

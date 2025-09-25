/**
 * 系统初始化机制全面审查
 * 特别关注每次初始化是否会创建新脑图的问题
 */

function auditInitializationSystem() {
    console.log('🔍 开始审查系统初始化机制...');
    
    const auditResults = {
        issues: [],
        warnings: [],
        recommendations: [],
        dataFlowAnalysis: {},
        initializationPaths: []
    };
    
    // 1. 审查MindmapController构造函数
    console.log('📋 1. 审查MindmapController构造函数...');
    
    const mc = window.mindmapController;
    if (mc) {
        // 检查构造函数中的异步数据加载
        if (typeof mc._loadInitialData === 'function') {
            auditResults.initializationPaths.push({
                path: 'MindmapController.constructor -> _loadInitialData',
                description: '构造函数中异步加载初始数据',
                riskLevel: 'medium',
                details: '可能在没有存储数据时创建默认数据'
            });
        }
        
        // 检查getDefaultData方法
        if (typeof mc.getDefaultData === 'function') {
            try {
                const defaultData = mc.getDefaultData();
                if (defaultData && defaultData.id) {
                    auditResults.issues.push({
                        type: 'new_data_creation',
                        severity: 'high',
                        message: 'getDefaultData()每次调用都会生成新的ID',
                        details: `默认数据ID: ${defaultData.id}`,
                        impact: '每次初始化可能创建新脑图'
                    });
                }
            } catch (error) {
                auditResults.warnings.push({
                    type: 'method_error',
                    message: 'getDefaultData()方法调用失败',
                    error: error.message
                });
            }
        }
    }
    
    // 2. 审查数据加载逻辑
    console.log('📋 2. 审查数据加载逻辑...');
    
    // 检查loadMindmapFromStorage方法
    if (mc && typeof mc.loadMindmapFromStorage === 'function') {
        auditResults.dataFlowAnalysis.storageLoad = {
            method: 'loadMindmapFromStorage',
            fallback: 'getDefaultData',
            riskLevel: 'high',
            description: '如果存储中没有数据，会调用getDefaultData创建新数据'
        };
    }
    
    // 3. 审查初始化触发点
    console.log('📋 3. 审查初始化触发点...');
    
    const initTriggers = [
        {
            trigger: 'DOMContentLoaded事件',
            location: 'script.js',
            function: 'initializeWhenReady',
            riskLevel: 'medium'
        },
        {
            trigger: 'MindmapController.init()',
            location: 'jsmind-controller.js',
            function: 'init -> showSavedMindIfAny -> renderMindmap',
            riskLevel: 'high'
        },
        {
            trigger: '新建按钮点击',
            location: 'enhance_new_button.js',
            function: 'newBtn.click -> getDefaultData',
            riskLevel: 'critical'
        }
    ];
    
    auditResults.initializationPaths.push(...initTriggers);
    
    // 4. 检查数据持久化机制
    console.log('📋 4. 检查数据持久化机制...');
    
    // 检查localStorage中的数据
    const storageKeys = [
        'mindmap_data_v1',
        '__mind_full_cache_v1'
    ];
    
    storageKeys.forEach(key => {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                auditResults.dataFlowAnalysis[key] = {
                    exists: true,
                    hasData: !!parsed.data,
                    rootId: parsed.data?.id || 'unknown',
                    size: data.length
                };
            } else {
                auditResults.dataFlowAnalysis[key] = {
                    exists: false,
                    impact: '缺少存储数据可能导致创建新脑图'
                };
            }
        } catch (error) {
            auditResults.warnings.push({
                type: 'storage_error',
                key: key,
                error: error.message
            });
        }
    });
    
    // 5. 检查AutogenUnifiedStorage集成
    console.log('📋 5. 检查AutogenUnifiedStorage集成...');
    
    if (window.AutogenUnifiedStorage) {
        auditResults.dataFlowAnalysis.unifiedStorage = {
            available: true,
            integrated: !!(mc && mc.autogenStorage),
            riskLevel: mc && mc.autogenStorage ? 'low' : 'high'
        };
        
        if (!mc || !mc.autogenStorage) {
            auditResults.issues.push({
                type: 'storage_integration',
                severity: 'high',
                message: 'MindmapController未正确集成AutogenUnifiedStorage',
                impact: '可能导致数据加载失败，从而创建新脑图'
            });
        }
    }
    
    // 6. 分析问题根源
    console.log('📋 6. 分析问题根源...');
    
    const criticalIssues = auditResults.issues.filter(issue => issue.severity === 'high' || issue.severity === 'critical');
    
    if (criticalIssues.length > 0) {
        auditResults.recommendations.push({
            priority: 'critical',
            action: '修复数据加载逻辑',
            details: '确保loadMindmapFromStorage能正确加载现有数据，避免不必要的默认数据创建'
        });
    }
    
    // 检查是否存在多次初始化的风险
    const hasMultipleInitPaths = auditResults.initializationPaths.length > 2;
    if (hasMultipleInitPaths) {
        auditResults.issues.push({
            type: 'multiple_initialization',
            severity: 'medium',
            message: '存在多个初始化路径',
            details: `发现${auditResults.initializationPaths.length}个初始化触发点`,
            impact: '可能导致重复初始化和数据覆盖'
        });
    }
    
    // 7. 生成修复建议
    console.log('📋 7. 生成修复建议...');
    
    auditResults.recommendations.push(
        {
            priority: 'high',
            action: '优化getDefaultData方法',
            details: '避免每次调用都生成新ID，考虑使用固定的默认ID或检查现有数据'
        },
        {
            priority: 'medium',
            action: '加强数据加载检查',
            details: '在loadMindmapFromStorage中添加更多的数据验证和恢复逻辑'
        },
        {
            priority: 'low',
            action: '统一初始化流程',
            details: '减少初始化触发点，使用单一的初始化入口'
        }
    );
    
    // 输出审查结果
    console.log('\n📊 系统初始化审查结果:');
    console.log(`🔴 严重问题: ${auditResults.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`🟡 高风险问题: ${auditResults.issues.filter(i => i.severity === 'high').length}`);
    console.log(`🟠 中等问题: ${auditResults.issues.filter(i => i.severity === 'medium').length}`);
    console.log(`⚠️ 警告: ${auditResults.warnings.length}`);
    console.log(`💡 建议: ${auditResults.recommendations.length}`);
    
    // 详细输出问题
    auditResults.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.details) console.log(`   详情: ${issue.details}`);
        if (issue.impact) console.log(`   影响: ${issue.impact}`);
    });
    
    // 输出建议
    console.log('\n💡 修复建议:');
    auditResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
        console.log(`   ${rec.details}`);
    });
    
    return auditResults;
}

// 创建修复脚本生成器
function generateInitializationFix(auditResults) {
    console.log('🔧 生成初始化修复方案...');
    
    const fixes = [];
    
    // 修复1: 优化getDefaultData方法
    fixes.push({
        name: '优化getDefaultData方法',
        code: `
// 修复getDefaultData，避免每次都创建新ID
const originalGetDefaultData = mc.getDefaultData;
mc.getDefaultData = function() {
    // 首先尝试从存储中获取现有数据
    const existingData = localStorage.getItem('mindmap_data_v1');
    if (existingData) {
        try {
            const parsed = JSON.parse(existingData);
            if (parsed.data && parsed.data.id) {
                console.log('使用现有数据ID:', parsed.data.id);
                return this.fromJsMindTree(parsed.data);
            }
        } catch (e) {
            console.warn('解析现有数据失败:', e);
        }
    }
    
    // 如果没有现有数据，使用固定的默认ID
    const defaultId = 'root-default-mindmap';
    return {
        id: defaultId,
        label: '项目脑图',
        content: '# 根节点\\n\\n在此编写内容...',
        expanded: true,
        children: []
    };
};`
    });
    
    // 修复2: 加强数据加载检查
    fixes.push({
        name: '加强数据加载检查',
        code: `
// 修复loadMindmapFromStorage，添加更多检查
const originalLoadMindmapFromStorage = mc.loadMindmapFromStorage;
mc.loadMindmapFromStorage = async function() {
    console.log('🔍 开始加载脑图数据...');
    
    // 1. 尝试从AutogenUnifiedStorage加载
    if (this.autogenStorage) {
        try {
            const data = await this.autogenStorage.retrieve('mindmap', this.localStorageKey);
            if (data && data.data) {
                console.log('✅ 从AutogenUnifiedStorage加载成功');
                return this.fromJsMindTree(data.data);
            }
        } catch (error) {
            console.warn('AutogenUnifiedStorage加载失败:', error);
        }
    }
    
    // 2. 尝试从localStorage加载
    const keys = ['mindmap_data_v1', '__mind_full_cache_v1'];
    for (const key of keys) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.data) {
                    console.log(\`✅ 从localStorage(\${key})加载成功\`);
                    return this.fromJsMindTree(parsed.data);
                }
            }
        } catch (error) {
            console.warn(\`localStorage(\${key})加载失败:\`, error);
        }
    }
    
    console.log('⚠️ 未找到任何存储数据');
    return null;
};`
    });
    
    console.log('📋 生成的修复方案:');
    fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix.name}`);
    });
    
    return fixes;
}

// 创建审查按钮
function createAuditButton() {
    const button = document.createElement('button');
    button.textContent = '🔍 审查初始化系统';
    button.style.cssText = `
        position: fixed;
        top: 220px;
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
    
    button.addEventListener('click', () => {
        button.textContent = '⏳ 审查中...';
        button.disabled = true;
        
        try {
            const results = auditInitializationSystem();
            const fixes = generateInitializationFix(results);
            
            // 显示结果通知
            const issueCount = results.issues.length;
            const severity = issueCount > 3 ? 'error' : issueCount > 1 ? 'warning' : 'success';
            showAuditNotification(`发现${issueCount}个初始化问题`, severity);
            
            console.log('📋 完整审查报告:', results);
            console.log('🔧 修复方案:', fixes);
            
        } finally {
            setTimeout(() => {
                button.textContent = '🔍 审查初始化系统';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 初始化系统审查按钮已创建');
}

function showAuditNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 220px;
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

// 延迟创建审查按钮
setTimeout(() => {
    createAuditButton();
    console.log('💡 点击右上角的"审查初始化系统"按钮来检查初始化问题');
}, 7000);

// 导出审查函数
window.auditInitializationSystem = auditInitializationSystem;
window.generateInitializationFix = generateInitializationFix;

/**
 * StateManager状态验证调试工具
 * 专门用于诊断状态验证失败的具体原因
 */

console.log('🔍 StateManager状态验证调试工具已加载');

class StateValidationDebugger {
    constructor() {
        this.validationHistory = [];
        this.maxHistorySize = 50;
    }

    /**
     * 运行完整的状态验证调试
     */
    async runFullDiagnosis() {
        console.log('\n🔍 开始StateManager状态验证完整诊断...');
        
        try {
            // 1. 测试StateValidator独立功能
            await this.testStateValidatorStandalone();
            
            // 2. 测试StateManager默认状态
            await this.testStateManagerDefaultState();
            
            // 3. 测试Action处理过程
            await this.testActionProcessing();
            
            // 4. 分析验证规则
            await this.analyzeValidationRules();
            
        } catch (error) {
            console.error('🔍 状态验证诊断失败:', error);
        }
        
        this.printDiagnosisReport();
    }

    /**
     * 测试StateValidator独立功能
     */
    async testStateValidatorStandalone() {
        console.log('\n📋 测试StateValidator独立功能...');
        
        try {
            // 动态导入StateSchema
            const schemaModule = await import('../src/core/StateSchema.js');
            
            // 创建StateValidator实例
            const validator = new schemaModule.StateValidator();
            console.log('✅ StateValidator创建成功');
            
            // 测试默认状态创建
            const defaultState = validator.createDefaultState();
            console.log('✅ 默认状态创建成功');
            
            // 验证默认状态
            const validation = validator.validate(defaultState);
            console.log('📊 默认状态验证结果:', {
                isValid: validation.isValid,
                errorCount: validation.errors ? validation.errors.length : 0,
                warningCount: validation.warnings ? validation.warnings.length : 0
            });
            
            if (!validation.isValid) {
                console.error('❌ 默认状态验证失败:');
                validation.errors.forEach((error, index) => {
                    console.error(`  ${index + 1}. ${error}`);
                });
            }
            
            if (validation.warnings && validation.warnings.length > 0) {
                console.warn('⚠️ 默认状态验证警告:');
                validation.warnings.forEach((warning, index) => {
                    console.warn(`  ${index + 1}. ${warning}`);
                });
            }
            
            return { validator, defaultState, validation };
            
        } catch (error) {
            console.error('❌ StateValidator测试失败:', error);
            return null;
        }
    }

    /**
     * 测试StateManager默认状态
     */
    async testStateManagerDefaultState() {
        console.log('\n🏗️ 测试StateManager默认状态...');
        
        try {
            // 动态导入StateManager
            const stateModule = await import('../src/core/StateManager.js');
            
            // 创建简单的事件总线
            const mockEventBus = {
                emit: (event, data) => console.log(`🔔 Event: ${event}`, data),
                on: () => () => {},
                getStats: () => ({ totalEvents: 0 })
            };
            
            const standardEvents = {
                SYSTEM: { READY: 'system:ready', ERROR: 'system:error' },
                STORAGE: { READY: 'storage:ready', ERROR: 'storage:error' },
                MINDMAP: { UPDATED: 'mindmap:updated' },
                UI: { VIEW_CHANGED: 'ui:view_changed' },
                REGISTRY: { CHANGED: 'registry:changed' },
                COMPONENT: { ERROR: 'component:error' }
            };
            
            // 创建StateManager实例
            const stateManager = new stateModule.StateManager(mockEventBus, standardEvents);
            console.log('✅ StateManager创建成功');
            
            // 获取初始状态
            const initialState = stateManager.getState();
            console.log('✅ 初始状态获取成功');
            
            // 分析初始状态结构
            this.analyzeStateStructure(initialState);
            
            return { stateManager, initialState };
            
        } catch (error) {
            console.error('❌ StateManager测试失败:', error);
            return null;
        }
    }

    /**
     * 测试Action处理过程
     */
    async testActionProcessing() {
        console.log('\n⚡ 测试Action处理过程...');
        
        try {
            const stateModule = await import('../src/core/StateManager.js');
            
            const mockEventBus = {
                emit: (event, data) => console.log(`🔔 Action Event: ${event}`, data),
                on: () => () => {},
                getStats: () => ({ totalEvents: 0 })
            };
            
            const standardEvents = {
                SYSTEM: { READY: 'system:ready', ERROR: 'system:error' },
                STORAGE: { READY: 'storage:ready', ERROR: 'storage:error' },
                MINDMAP: { UPDATED: 'mindmap:updated' },
                UI: { VIEW_CHANGED: 'ui:view_changed' },
                REGISTRY: { CHANGED: 'registry:changed' },
                COMPONENT: { ERROR: 'component:error' }
            };
            
            const stateManager = new stateModule.StateManager(mockEventBus, standardEvents);
            
            // 测试简单Action
            console.log('🧪 测试简单UI Action...');
            const simpleAction = {
                type: 'UI_SET_ACTIVE_TAB',
                payload: 'test_tab'
            };
            
            const stateBefore = JSON.stringify(stateManager.getState());
            stateManager.dispatch(simpleAction);
            const stateAfter = JSON.stringify(stateManager.getState());
            
            console.log('📊 Action处理结果:', {
                actionType: simpleAction.type,
                stateChanged: stateBefore !== stateAfter,
                errors: stateManager.getStats().errors
            });
            
            // 测试复杂Action
            console.log('🧪 测试组件生命周期Action...');
            const complexAction = {
                type: stateModule.ActionTypes.SYSTEM.INIT_COMPONENT_LIFECYCLE,
                payload: {
                    components: { test: 'component' },
                    stats: { initialized: true }
                }
            };
            
            stateManager.dispatch(complexAction);
            console.log('📊 复杂Action处理完成');
            
            return true;
            
        } catch (error) {
            console.error('❌ Action处理测试失败:', error);
            return false;
        }
    }

    /**
     * 分析验证规则
     */
    async analyzeValidationRules() {
        console.log('\n📏 分析验证规则...');
        
        try {
            const schemaModule = await import('../src/core/StateSchema.js');
            const validator = new schemaModule.StateValidator();
            
            // 获取验证规则
            const rules = validator.validationRules;
            console.log('📊 验证规则统计:', {
                totalRules: rules.size,
                requiredFields: Array.from(rules.entries())
                    .filter(([path, rule]) => rule.required)
                    .map(([path, rule]) => path)
            });
            
            // 检查每个必需字段
            const defaultState = validator.createDefaultState();
            const requiredFields = Array.from(rules.entries())
                .filter(([path, rule]) => rule.required);
            
            console.log('\n🔍 检查必需字段:');
            requiredFields.forEach(([path, rule]) => {
                const value = this.getNestedValue(defaultState, path);
                const exists = value !== undefined && value !== null;
                console.log(`  ${exists ? '✅' : '❌'} ${path}: ${JSON.stringify(value)}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ 验证规则分析失败:', error);
            return false;
        }
    }

    /**
     * 分析状态结构
     */
    analyzeStateStructure(state) {
        console.log('\n🏗️ 状态结构分析:');
        
        const structure = this.getStateStructure(state);
        console.log('📊 状态结构:', structure);
        
        // 检查关键字段
        const keyFields = [
            'mindmap.current.nodeCount',
            'ui.activeTab',
            'ui.theme.mode',
            'system.storage.mode'
        ];
        
        console.log('\n🔍 关键字段检查:');
        keyFields.forEach(path => {
            const value = this.getNestedValue(state, path);
            const exists = value !== undefined && value !== null;
            console.log(`  ${exists ? '✅' : '❌'} ${path}: ${JSON.stringify(value)}`);
        });
    }

    /**
     * 获取状态结构概览
     */
    getStateStructure(obj, prefix = '', depth = 0) {
        if (depth > 3) return '...';
        
        const structure = {};
        
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const currentPath = prefix ? `${prefix}.${key}` : key;
                
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    structure[key] = this.getStateStructure(value, currentPath, depth + 1);
                } else {
                    structure[key] = Array.isArray(value) ? `Array(${value.length})` : typeof value;
                }
            });
        }
        
        return structure;
    }

    /**
     * 获取嵌套值
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * 打印诊断报告
     */
    printDiagnosisReport() {
        console.log('\n' + '='.repeat(60));
        console.log('🔍 StateManager状态验证诊断报告');
        console.log('='.repeat(60));
        
        console.log('\n📋 诊断步骤:');
        console.log('  1. ✅ StateValidator独立功能测试');
        console.log('  2. ✅ StateManager默认状态测试');
        console.log('  3. ✅ Action处理过程测试');
        console.log('  4. ✅ 验证规则分析');
        
        console.log('\n💡 诊断建议:');
        console.log('  - 检查控制台中的详细错误信息');
        console.log('  - 确认所有必需字段都有正确的默认值');
        console.log('  - 验证Action类型和payload格式');
        console.log('  - 检查StateSchema中的验证规则');
        
        console.log('\n🔧 下一步操作:');
        console.log('  1. 刷新页面查看修复效果');
        console.log('  2. 运行 testEmergencyFixes() 验证修复');
        console.log('  3. 如仍有问题，检查具体的验证错误信息');
        
        console.log('\n' + '='.repeat(60));
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.StateValidationDebugger = StateValidationDebugger;
    
    // 提供快速调试函数
    window.debugStateValidation = async function() {
        const stateDebugger = new StateValidationDebugger();
        return await stateDebugger.runFullDiagnosis();
    };
    
    console.log('🔍 状态验证调试工具已加载');
    console.log('使用 debugStateValidation() 函数开始诊断');
}

// 自动运行诊断（延迟执行）
if (typeof window !== 'undefined') {
    setTimeout(async () => {
        console.log('🔍 自动运行状态验证诊断...');
        await window.debugStateValidation();
    }, 3000);
}

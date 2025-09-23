/**
 * 立即状态修复脚本
 * 专门解决StateManager默认状态验证失败问题
 */

console.log('🔧 立即状态修复脚本已加载');

class ImmediateStateFixer {
    constructor() {
        this.fixAttempts = 0;
        this.maxAttempts = 3;
    }

    /**
     * 立即修复状态验证问题
     */
    async fixStateValidationIssues() {
        console.log('🔧 开始立即修复状态验证问题...');
        
        this.fixAttempts++;
        
        try {
            // 1. 检查当前StateManager状态
            await this.diagnoseCurrentState();
            
            // 2. 重新创建StateManager（如果需要）
            await this.recreateStateManagerIfNeeded();
            
            // 3. 验证修复效果
            await this.verifyFix();
            
        } catch (error) {
            console.error('🔧 立即修复失败:', error);
            
            if (this.fixAttempts < this.maxAttempts) {
                console.log(`🔧 尝试第 ${this.fixAttempts + 1} 次修复...`);
                setTimeout(() => this.fixStateValidationIssues(), 1000);
            }
        }
    }

    /**
     * 诊断当前状态
     */
    async diagnoseCurrentState() {
        console.log('🔍 诊断当前StateManager状态...');
        
        if (window.AppStateManager) {
            const currentState = window.AppStateManager.getState();
            console.log('📊 当前状态结构:', this.analyzeStateStructure(currentState));
            
            // 检查必需字段
            const requiredFields = [
                'mindmap.current.nodeCount',
                'ui.activeTab', 
                'ui.theme.mode',
                'system.storage.mode'
            ];
            
            console.log('🔍 必需字段检查:');
            requiredFields.forEach(path => {
                const value = this.getNestedValue(currentState, path);
                const exists = value !== undefined && value !== null;
                console.log(`  ${exists ? '✅' : '❌'} ${path}: ${JSON.stringify(value)}`);
            });
            
            return currentState;
        } else {
            console.log('❌ AppStateManager不存在');
            return null;
        }
    }

    /**
     * 重新创建StateManager（如果需要）
     */
    async recreateStateManagerIfNeeded() {
        console.log('🔧 检查是否需要重新创建StateManager...');
        
        if (!window.AppStateManager) {
            console.log('❌ AppStateManager不存在，无法重新创建');
            return;
        }
        
        // 获取当前状态
        const currentState = window.AppStateManager.getState();
        
        // 检查是否缺少必需字段
        const missingFields = this.checkMissingRequiredFields(currentState);
        
        if (missingFields.length > 0) {
            console.log('🔧 发现缺失字段，尝试修复状态...');
            
            try {
                // 尝试手动修复状态
                await this.patchMissingFields(missingFields);
            } catch (error) {
                console.error('🔧 手动修复失败:', error);
            }
        } else {
            console.log('✅ 所有必需字段都存在');
        }
    }

    /**
     * 检查缺失的必需字段
     */
    checkMissingRequiredFields(state) {
        const requiredFields = [
            { path: 'mindmap.current.nodeCount', defaultValue: 0 },
            { path: 'ui.activeTab', defaultValue: 'mindmap' },
            { path: 'ui.theme.mode', defaultValue: 'light' },
            { path: 'system.storage.mode', defaultValue: 'legacy' }
        ];
        
        const missing = [];
        
        requiredFields.forEach(field => {
            const value = this.getNestedValue(state, field.path);
            if (value === undefined || value === null) {
                missing.push(field);
            }
        });
        
        return missing;
    }

    /**
     * 修补缺失字段
     */
    async patchMissingFields(missingFields) {
        console.log('🔧 修补缺失字段:', missingFields.map(f => f.path));
        
        for (const field of missingFields) {
            try {
                // 使用Action来设置字段值
                const actionType = this.getActionTypeForField(field.path);
                if (actionType) {
                    console.log(`🔧 设置 ${field.path} = ${field.defaultValue}`);
                    window.AppStateManager.dispatch({
                        type: actionType,
                        payload: field.defaultValue
                    });
                } else {
                    console.warn(`⚠️ 无法找到 ${field.path} 对应的Action类型`);
                }
            } catch (error) {
                console.error(`❌ 修补字段 ${field.path} 失败:`, error);
            }
        }
    }

    /**
     * 获取字段对应的Action类型
     */
    getActionTypeForField(fieldPath) {
        const actionMap = {
            'mindmap.current.nodeCount': 'MINDMAP_SET_NODE_COUNT',
            'ui.activeTab': 'UI_SET_ACTIVE_TAB', 
            'ui.theme.mode': 'UI_SET_THEME',
            'system.storage.mode': 'SYSTEM_SET_STORAGE_MODE'
        };
        
        return actionMap[fieldPath];
    }

    /**
     * 验证修复效果
     */
    async verifyFix() {
        console.log('✅ 验证修复效果...');
        
        if (!window.AppStateManager) {
            console.log('❌ AppStateManager不存在');
            return false;
        }
        
        const currentState = window.AppStateManager.getState();
        const missingFields = this.checkMissingRequiredFields(currentState);
        
        if (missingFields.length === 0) {
            console.log('🎉 修复成功！所有必需字段都存在');
            
            // 测试一个简单的Action
            try {
                window.AppStateManager.dispatch({
                    type: 'UI_SET_ACTIVE_TAB',
                    payload: 'test_verification'
                });
                console.log('✅ Action分发测试成功');
                return true;
            } catch (error) {
                console.error('❌ Action分发测试失败:', error);
                return false;
            }
        } else {
            console.log('❌ 修复未完成，仍有缺失字段:', missingFields.map(f => f.path));
            return false;
        }
    }

    /**
     * 分析状态结构
     */
    analyzeStateStructure(obj, depth = 0) {
        if (depth > 2) return '...';
        
        const structure = {};
        
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    structure[key] = this.analyzeStateStructure(value, depth + 1);
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
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.ImmediateStateFixer = ImmediateStateFixer;
    
    // 提供快速修复函数
    window.fixStateImmediately = async function() {
        const fixer = new ImmediateStateFixer();
        return await fixer.fixStateValidationIssues();
    };
    
    console.log('🔧 立即状态修复工具已加载');
    console.log('使用 fixStateImmediately() 函数立即修复');
}

// 自动运行修复（延迟执行，确保其他系统已加载）
if (typeof window !== 'undefined') {
    setTimeout(async () => {
        console.log('🔧 自动运行立即状态修复...');
        await window.fixStateImmediately();
    }, 1500);
}

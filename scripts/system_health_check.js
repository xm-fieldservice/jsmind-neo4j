/**
 * 系统健康检查脚本 - 验证第二部分完工状态的稳定性
 * 检查存储系统、事件总线、状态管理器等核心组件
 */

class SystemHealthChecker {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            overallScore: 0,
            components: {},
            issues: [],
            recommendations: []
        };
    }

    /**
     * 运行完整的系统健康检查
     */
    async runFullCheck() {
        console.log('🔍 开始系统健康检查...');
        
        try {
            // 1. 检查存储系统
            await this.checkStorageSystem();
            
            // 2. 检查事件总线
            await this.checkEventBus();
            
            // 3. 检查状态管理器
            await this.checkStateManager();
            
            // 4. 检查核心功能模块
            await this.checkCoreModules();
            
            // 5. 计算总体评分
            this.calculateOverallScore();
            
            // 6. 生成报告
            this.generateReport();
            
            return this.results;
            
        } catch (error) {
            console.error('❌ 健康检查失败:', error);
            this.results.issues.push({
                component: 'HealthChecker',
                severity: 'critical',
                message: `健康检查过程失败: ${error.message}`,
                timestamp: new Date().toISOString()
            });
            return this.results;
        }
    }

    /**
     * 检查存储系统
     */
    async checkStorageSystem() {
        const component = 'StorageSystem';
        this.results.components[component] = {
            score: 0,
            checks: [],
            issues: []
        };

        try {
            // 检查SimpleStorageManager是否存在
            if (typeof window.SimpleStorageManager === 'undefined') {
                this.addIssue(component, 'critical', 'SimpleStorageManager未定义');
                return;
            }

            const storage = window.SimpleStorageManager;
            
            // 测试基本功能
            const testKey = 'health_check_test';
            const testData = { test: 'data', timestamp: Date.now() };

            // 测试存储功能
            try {
                const saveResult = storage.set(testKey, testData);
                this.addCheck(component, '存储功能', saveResult, '数据存储测试');
            } catch (error) {
                this.addIssue(component, 'critical', `存储失败: ${error.message}`);
            }

            // 测试读取功能
            try {
                const readResult = storage.get(testKey);
                const isValid = readResult && readResult.test === 'data';
                this.addCheck(component, '读取功能', isValid, '数据读取测试');
            } catch (error) {
                this.addIssue(component, 'critical', `读取失败: ${error.message}`);
            }

            // 测试删除功能
            try {
                const removeResult = storage.remove(testKey);
                this.addCheck(component, '删除功能', removeResult, '数据删除测试');
            } catch (error) {
                this.addIssue(component, 'warning', `删除失败: ${error.message}`);
            }

            // 检查统计信息
            try {
                const stats = storage.getStats();
                const hasStats = stats && typeof stats === 'object';
                this.addCheck(component, '统计功能', hasStats, '统计信息检查');
                
                if (hasStats) {
                    this.addCheck(component, '健康状态', stats.healthy !== false, '存储健康状态');
                    console.log('📊 存储统计:', stats);
                }
            } catch (error) {
                this.addIssue(component, 'warning', `统计检查失败: ${error.message}`);
            }

            // 计算存储系统得分
            this.calculateComponentScore(component);

        } catch (error) {
            this.addIssue(component, 'critical', `存储系统检查异常: ${error.message}`);
        }
    }

    /**
     * 检查事件总线
     */
    async checkEventBus() {
        const component = 'EventBus';
        this.results.components[component] = {
            score: 0,
            checks: [],
            issues: []
        };

        try {
            // 检查EventBus是否存在
            if (typeof window.GlobalEventBus === 'undefined') {
                this.addIssue(component, 'critical', 'GlobalEventBus未定义');
                return;
            }

            const eventBus = window.GlobalEventBus;
            
            // 测试事件发布/订阅功能
            const testEvent = 'health_check_event';
            let eventReceived = false;
            let unsubscribe = null;

            try {
                // 订阅事件
                unsubscribe = eventBus.on(testEvent, (data) => {
                    eventReceived = data && data.test === 'success';
                });

                // 发布事件
                eventBus.emit(testEvent, { test: 'success', timestamp: Date.now() });

                // 给事件处理一点时间
                await new Promise(resolve => setTimeout(resolve, 100));

                this.addCheck(component, '事件发布/订阅', eventReceived, '事件系统功能测试');

                // 清理
                if (unsubscribe) {
                    unsubscribe();
                }

            } catch (error) {
                this.addIssue(component, 'critical', `事件系统测试失败: ${error.message}`);
            }

            // 检查监听器管理
            try {
                // 测试多个监听器
                const listeners = [];
                const results = [];
                
                for (let i = 0; i < 3; i++) {
                    const unsubscribe = eventBus.on(testEvent, (data) => {
                        results.push(i);
                    });
                    listeners.push(unsubscribe);
                }

                eventBus.emit(testEvent, {});
                await new Promise(resolve => setTimeout(resolve, 50));

                // 清理监听器
                listeners.forEach(unsub => unsub());

                this.addCheck(component, '多监听器支持', results.length === 3, '多监听器管理测试');

            } catch (error) {
                this.addIssue(component, 'warning', `多监听器测试失败: ${error.message}`);
            }

            // 计算事件总线得分
            this.calculateComponentScore(component);

        } catch (error) {
            this.addIssue(component, 'critical', `事件总线检查异常: ${error.message}`);
        }
    }

    /**
     * 检查状态管理器
     */
    async checkStateManager() {
        const component = 'StateManager';
        this.results.components[component] = {
            score: 0,
            checks: [],
            issues: []
        };

        try {
            // 检查StateManager是否存在
            if (typeof window.StateManager === 'undefined') {
                this.addIssue(component, 'critical', 'StateManager未定义');
                return;
            }

            // 需要EventBus来创建StateManager实例
            if (typeof window.GlobalEventBus === 'undefined') {
                this.addIssue(component, 'critical', '需要GlobalEventBus来测试StateManager');
                return;
            }

            const eventBus = window.GlobalEventBus;
            
            // 创建简单的标准事件定义
            const standardEvents = {
                MINDMAP: { UPDATED: 'mindmap:updated' },
                UI: { VIEW_CHANGED: 'ui:view_changed' },
                REGISTRY: { CHANGED: 'registry:changed' },
                SYSTEM: { ERROR: 'system:error', READY: 'system:ready' },
                STORAGE: { READY: 'storage:ready', ERROR: 'storage:error' }
            };

            try {
                // 创建StateManager实例
                const stateManager = new window.StateManager(eventBus, standardEvents);
                
                // 测试状态获取
                const initialState = stateManager.getState();
                this.addCheck(component, '状态初始化', initialState !== null, '状态管理器初始化测试');

                // 测试Action分发
                const action = {
                    type: 'UI_SET_ACTIVE_TAB',
                    payload: 'mindmap'
                };

                const newState = stateManager.dispatch(action);
                this.addCheck(component, 'Action分发', newState !== null, 'Action分发功能测试');

                // 测试状态订阅
                let subscriptionTriggered = false;
                const unsubscribe = stateManager.subscribe((newState, oldState, action) => {
                    subscriptionTriggered = true;
                });

                stateManager.dispatch({ type: 'UI_SET_ACTIVE_TAB', payload: 'registry' });
                await new Promise(resolve => setTimeout(resolve, 50));

                this.addCheck(component, '状态订阅', subscriptionTriggered, '状态订阅功能测试');

                // 清理
                unsubscribe();

                // 测试统计信息
                const stats = stateManager.getStats();
                this.addCheck(component, '统计功能', stats && typeof stats === 'object', '统计信息检查');

            } catch (error) {
                this.addIssue(component, 'critical', `状态管理器测试失败: ${error.message}`);
            }

            // 计算状态管理器得分
            this.calculateComponentScore(component);

        } catch (error) {
            this.addIssue(component, 'critical', `状态管理器检查异常: ${error.message}`);
        }
    }

    /**
     * 检查核心功能模块
     */
    async checkCoreModules() {
        const component = 'CoreModules';
        this.results.components[component] = {
            score: 0,
            checks: [],
            issues: []
        };

        try {
            // 检查jsmind控制器
            if (typeof window.mindmapController !== 'undefined') {
                this.addCheck(component, '脑图控制器', true, '脑图控制器存在');
            } else {
                this.addIssue(component, 'warning', '脑图控制器未定义（可能是延迟加载）');
            }

            // 检查注册表相关组件
            if (typeof window.Registry !== 'undefined') {
                this.addCheck(component, '注册表系统', true, '注册表系统存在');
            } else {
                this.addIssue(component, 'warning', '注册表系统未定义（可能是延迟加载）');
            }

            // 检查全局事件监听器
            if (typeof window.addEventListener === 'function') {
                this.addCheck(component, 'DOM事件支持', true, 'DOM事件系统正常');
            }

            // 检查localStorage可用性
            if (typeof localStorage !== 'undefined') {
                this.addCheck(component, '本地存储', true, 'localStorage可用');
            } else {
                this.addIssue(component, 'critical', 'localStorage不可用');
            }

            // 计算核心模块得分
            this.calculateComponentScore(component);

        } catch (error) {
            this.addIssue(component, 'warning', `核心模块检查异常: ${error.message}`);
        }
    }

    /**
     * 添加检查结果
     */
    addCheck(component, checkName, passed, description) {
        this.results.components[component].checks.push({
            name: checkName,
            passed: !!passed,
            description: description,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 添加问题记录
     */
    addIssue(component, severity, message) {
        this.results.issues.push({
            component: component,
            severity: severity, // critical, warning, info
            message: message,
            timestamp: new Date().toISOString()
        });
        
        this.results.components[component].issues.push({
            severity: severity,
            message: message
        });
    }

    /**
     * 计算组件得分
     */
    calculateComponentScore(component) {
        const comp = this.results.components[component];
        const totalChecks = comp.checks.length;
        const passedChecks = comp.checks.filter(check => check.passed).length;
        
        comp.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
    }

    /**
     * 计算总体评分
     */
    calculateOverallScore() {
        const components = Object.values(this.results.components);
        if (components.length === 0) {
            this.results.overallScore = 0;
            return;
        }

        const totalScore = components.reduce((sum, comp) => sum + comp.score, 0);
        this.results.overallScore = Math.round(totalScore / components.length);
    }

    /**
     * 生成健康报告
     */
    generateReport() {
        console.log('\n📋 === 系统健康检查报告 ===');
        console.log(`📅 检查时间: ${new Date(this.results.timestamp).toLocaleString()}`);
        console.log(`🏆 总体评分: ${this.results.overallScore}/100`);
        
        // 组件状态摘要
        console.log('\n🔧 组件状态:');
        Object.entries(this.results.components).forEach(([name, comp]) => {
            const status = comp.score >= 80 ? '✅' : comp.score >= 60 ? '⚠️' : '❌';
            console.log(`  ${status} ${name}: ${comp.score}/100 (${comp.checks.filter(c => c.passed).length}/${comp.checks.length} 通过)`);
        });

        // 问题汇总
        if (this.results.issues.length > 0) {
            console.log('\n🚨 发现问题:');
            this.results.issues.forEach(issue => {
                const icon = issue.severity === 'critical' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`  ${icon} [${issue.component}] ${issue.message}`);
            });
        } else {
            console.log('\n✅ 未发现严重问题');
        }

        // 生成建议
        this.generateRecommendations();
        
        if (this.results.recommendations.length > 0) {
            console.log('\n💡 优化建议:');
            this.results.recommendations.forEach(rec => {
                console.log(`  📝 ${rec}`);
            });
        }

        console.log('\n=== 报告结束 ===\n');
    }

    /**
     * 生成优化建议
     */
    generateRecommendations() {
        const { components, issues } = this.results;

        // 基于组件得分生成建议
        Object.entries(components).forEach(([name, comp]) => {
            if (comp.score < 80) {
                this.results.recommendations.push(`优化 ${name} 组件（当前得分: ${comp.score}）`);
            }
        });

        // 基于问题生成具体建议
        issues.forEach(issue => {
            if (issue.severity === 'critical') {
                this.results.recommendations.push(`紧急修复: ${issue.component} - ${issue.message}`);
            } else if (issue.severity === 'warning') {
                this.results.recommendations.push(`建议修复: ${issue.component} - ${issue.message}`);
            }
        });

        // 总体建议
        if (this.results.overallScore >= 90) {
            this.results.recommendations.push('系统状态优秀，可以开始功能增强');
        } else if (this.results.overallScore >= 70) {
            this.results.recommendations.push('系统状态良好，建议先解决关键问题再继续优化');
        } else {
            this.results.recommendations.push('系统需要优先修复关键问题');
        }
    }
}

// 导出到全局，方便在浏览器控制台中使用
if (typeof window !== 'undefined') {
    window.SystemHealthChecker = SystemHealthChecker;
    
    // 提供便捷的运行函数
    window.runSystemHealthCheck = async function() {
        const checker = new SystemHealthChecker();
        return await checker.runFullCheck();
    };
    
    console.log('🔧 SystemHealthChecker 已加载');
    console.log('💡 使用方法: await runSystemHealthCheck()');
}

// 全局导出
window.SystemHealthChecker = SystemHealthChecker;

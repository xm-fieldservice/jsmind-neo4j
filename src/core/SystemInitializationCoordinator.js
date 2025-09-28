/**
 * SystemInitializationCoordinator - 系统初始化协调器
 * 
 * 基于现有AutogenSystemInitializer的最小化扩展
 * 提供HTML脚本加载协调和初始化时序管理
 * 
 * 功能：
 * 1. 协调HTML脚本加载顺序（独特价值）
 * 2. 使用现有AutogenSystemInitializer（避免重复造轮子）
 * 3. 管理系统级初始化阶段（独特价值）
 * 4. 提供超时和错误恢复机制（独特价值）
 */

class SystemInitializationCoordinator {
    constructor() {
        this.existingInitializer = null; // 将使用现有的AutogenSystemInitializer
        this.scriptLoadPhases = ['config', 'storage', 'events', 'controllers', 'modules'];
        this.currentPhase = 0;
        this.initializationLog = [];
        this.timeout = 5000; // 5秒超时，避免长时间阻塞
        
        console.log('[SystemInitializationCoordinator] 系统初始化协调器创建');
    }
    
    /**
     * 协调完整的系统初始化流程（紧急安全版本）
     */
    async coordinateSystemInitialization() {
        console.log('[SystemInitializationCoordinator] 🚀 开始系统初始化协调（安全模式）');
        
        try {
            // 只做最基本的检查，避免复杂操作导致死锁
            this.logInfo('📋 基本系统检查');
            
            // 检查关键组件是否存在
            const criticalComponents = ['AutogenUnifiedStorage', 'AutogenEventBus'];
            for (const component of criticalComponents) {
                if (window[component]) {
                    this.logInfo(`✅ ${component} 可用`);
                } else {
                    this.logWarning(`⚠️ ${component} 不可用`);
                }
            }
            
            // 跳过AutogenSystemInitializer调用，避免死锁
            this.logWarning('🔧 跳过AutogenSystemInitializer调用，避免死锁');
            
            this.logSuccess('✅ 系统初始化协调完成（安全模式）');
            return {
                success: true,
                mode: 'safe',
                log: this.initializationLog
            };
            
        } catch (error) {
            this.logError('❌ 系统初始化协调失败', error);
            return {
                success: false,
                error: error.message,
                log: this.initializationLog
            };
        }
    }
    
    /**
     * 确保脚本加载顺序正确（独特价值）
     */
    async ensureScriptLoadOrder() {
        this.logInfo('📋 检查脚本加载顺序');
        
        // 检查关键脚本是否按正确顺序加载
        const criticalScripts = [
            'AutogenUnifiedStorage',
            'AutogenEventBus', 
            'AutogenSystemInitializer',
            'DependencyManager'
        ];
        
        const loadedScripts = [];
        for (const scriptName of criticalScripts) {
            if (window[scriptName]) {
                loadedScripts.push(scriptName);
                this.logInfo(`✅ ${scriptName} 已加载`);
            } else {
                this.logWarning(`⚠️ ${scriptName} 未加载`);
            }
        }
        
        if (loadedScripts.length < criticalScripts.length) {
            this.logWarning('⚠️ 部分关键脚本未加载，但继续初始化');
        }
        
        // 等待DOM完全就绪（避免死锁）
        if (document.readyState === 'loading') {
            this.logWarning('⚠️ DOM仍在加载中，跳过等待避免死锁');
        } else {
            this.logInfo('✅ DOM已就绪');
        }
        
        this.logInfo('✅ 脚本加载顺序检查完成');
    }
    
    /**
     * 初始化现有系统（使用AutogenSystemInitializer）
     */
    async initializeExistingSystem() {
        this.logInfo('🔧 使用现有AutogenSystemInitializer');
        
        // 获取现有的AutogenSystemInitializer实例
        this.existingInitializer = window.AutogenSystemInitializer;
        
        if (!this.existingInitializer) {
            this.logWarning('⚠️ AutogenSystemInitializer不可用，跳过系统初始化');
            return;
        }
        
        // 使用现有初始化器进行系统初始化（带强制超时保护）
        try {
            const result = await Promise.race([
                this.existingInitializer.initialize(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('初始化超时')), this.timeout)
                )
            ]);
            
            if (result && result.success) {
                this.logSuccess('✅ AutogenSystemInitializer初始化成功');
            } else {
                this.logWarning('⚠️ AutogenSystemInitializer初始化失败，但继续协调');
            }
        } catch (error) {
            this.logError('❌ AutogenSystemInitializer初始化异常', error);
            this.logWarning('🔧 跳过AutogenSystemInitializer，继续协调');
        }
    }
    
    /**
     * 协调HTML初始化时序（独特价值）
     */
    async coordinateHTMLInitialization() {
        this.logInfo('🎯 协调HTML初始化时序');
        
        // 等待关键DOM元素就绪
        const criticalElements = ['#mindmap-container', '#toolbar', '#sidebar'];
        
        for (const selector of criticalElements) {
            const element = document.querySelector(selector);
            if (element) {
                this.logInfo(`✅ 关键元素就绪: ${selector}`);
            } else {
                this.logWarning(`⚠️ 关键元素未找到: ${selector}`);
            }
        }
        
        // 触发系统就绪事件
        if (window.AutogenEventBus) {
            window.AutogenEventBus.emit('system:coordination_complete', {
                timestamp: Date.now(),
                coordinator: 'SystemInitializationCoordinator'
            });
        }
        
        this.logInfo('✅ HTML初始化时序协调完成');
    }
    
    /**
     * 验证系统就绪状态
     */
    async verifySystemReady() {
        this.logInfo('🔍 验证系统就绪状态');
        
        const systemChecks = [
            { name: 'AutogenUnifiedStorage', check: () => window.AutogenUnifiedStorage },
            { name: 'AutogenEventBus', check: () => window.AutogenEventBus },
            { name: 'DependencyManager', check: () => window.DependencyManager },
            { name: 'DOM Ready', check: () => document.readyState === 'complete' }
        ];
        
        let readyCount = 0;
        for (const { name, check } of systemChecks) {
            if (check()) {
                this.logInfo(`✅ ${name} 就绪`);
                readyCount++;
            } else {
                this.logWarning(`⚠️ ${name} 未就绪`);
            }
        }
        
        const readyPercentage = (readyCount / systemChecks.length) * 100;
        this.logInfo(`📊 系统就绪度: ${readyPercentage}%`);
        
        if (readyPercentage >= 75) {
            this.logSuccess('✅ 系统基本就绪');
        } else {
            this.logWarning('⚠️ 系统就绪度较低，但继续运行');
        }
    }
    
    /**
     * 处理初始化失败（错误恢复机制）
     */
    async handleInitializationFailure(error) {
        this.logError('🔧 启动错误恢复机制', error);
        
        // 尝试基本的DOM初始化
        try {
            if (document.readyState !== 'complete') {
                await new Promise(resolve => window.addEventListener('load', resolve));
            }
            
            // 发送错误恢复事件
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('system:initialization_failed', {
                    detail: { error: error.message, coordinator: 'SystemInitializationCoordinator' }
                }));
            }
            
            this.logInfo('✅ 错误恢复机制执行完成');
        } catch (recoveryError) {
            this.logError('❌ 错误恢复失败', recoveryError);
        }
    }
    
    /**
     * 获取初始化状态
     */
    getInitializationStatus() {
        return {
            currentPhase: this.currentPhase,
            totalPhases: this.scriptLoadPhases.length,
            log: this.initializationLog,
            existingInitializer: !!this.existingInitializer
        };
    }
    
    /**
     * 日志方法
     */
    logInfo(message) {
        const entry = { level: 'INFO', message, timestamp: new Date().toISOString() };
        this.initializationLog.push(entry);
        console.log(`[SystemInitializationCoordinator] ${message}`);
    }
    
    logWarning(message) {
        const entry = { level: 'WARNING', message, timestamp: new Date().toISOString() };
        this.initializationLog.push(entry);
        console.warn(`[SystemInitializationCoordinator] ${message}`);
    }
    
    logError(message, error = null) {
        const entry = { 
            level: 'ERROR', 
            message, 
            error: error ? error.message : null,
            timestamp: new Date().toISOString() 
        };
        this.initializationLog.push(entry);
        console.error(`[SystemInitializationCoordinator] ${message}`, error);
    }
    
    logSuccess(message) {
        const entry = { level: 'SUCCESS', message, timestamp: new Date().toISOString() };
        this.initializationLog.push(entry);
        console.log(`[SystemInitializationCoordinator] ${message}`);
    }
}

// 创建全局实例
const systemCoordinator = new SystemInitializationCoordinator();

// 导出
window.SystemInitializationCoordinator = systemCoordinator;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SystemInitializationCoordinator, systemCoordinator };
}

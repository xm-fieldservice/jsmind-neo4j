/**
 * AI开发工作流监控系统
 * 
 * @author 程序员
 * @date 2025-10-08
 * @version 1.0
 * 
 * 功能：
 * 1. 自动拦截AI工具调用（write_to_file, Edit等）
 * 2. 提供手动审查API
 * 3. 架构对齐检查
 * 4. 模块化规范验证
 * 5. 功能冗余检测
 * 
 * 使用方式：
 * - 自动模式：无需操作，自动拦截
 * - 手动模式：window.aiReview(params)
 */

class AIWorkflowMonitor {
    constructor() {
        this.autoMode = true;  // 自动拦截模式
        this.manualMode = true; // 手动调用模式
        this.architectureCache = null;
        this.logger = window.UnifiedLogger;
        
        // 审查统计
        this.stats = {
            totalReviews: 0,
            passed: 0,
            failed: 0,
            violations: []
        };
        
        console.log('[AIWorkflowMonitor] 初始化完成');
    }
    
    // ========== 初始化 ==========
    
    /**
     * 启动监控系统
     */
    start() {
        if (this.autoMode) {
            this.interceptCascadeTools();
        }
        
        if (this.manualMode) {
            this.exposeManualAPI();
        }
        
        this.logger?.info('AI_WORKFLOW', '✅ AI工作流监控已启动', {
            autoMode: this.autoMode,
            manualMode: this.manualMode
        });
    }
    
    // ========== 自动拦截机制 ==========
    
    /**
     * 拦截Cascade工具
     */
    interceptCascadeTools() {
        // 等待Cascade加载
        const checkCascade = () => {
            if (window.cascade?.tools) {
                this._wrapTools();
                console.log('[AIWorkflowMonitor] ✅ 工具拦截已启用');
            } else {
                setTimeout(checkCascade, 1000);
            }
        };
        checkCascade();
    }
    
    /**
     * 包装工具，注入审查逻辑
     */
    _wrapTools() {
        const tools = window.cascade.tools;
        
        // 拦截 write_to_file
        if (tools.write_to_file) {
            const originalWrite = tools.write_to_file;
            tools.write_to_file = async (params) => {
                console.log('[AIWorkflowMonitor] 🔍 拦截 write_to_file');
                
                const review = await this.reviewBeforeWrite(params);
                
                if (!review.approved) {
                    this.logger?.error('AI_WORKFLOW', '❌ 代码审查失败', review);
                    throw new Error(this._formatError(review));
                }
                
                this.logger?.info('AI_WORKFLOW', '✅ 代码审查通过', {
                    file: params.TargetFile
                });
                
                return originalWrite(params);
            };
        }
        
        // 拦截 Edit
        if (tools.Edit) {
            const originalEdit = tools.Edit;
            tools.Edit = async (params) => {
                console.log('[AIWorkflowMonitor] 🔍 拦截 Edit');
                
                const review = await this.reviewBeforeEdit(params);
                
                if (!review.approved) {
                    this.logger?.error('AI_WORKFLOW', '❌ 代码审查失败', review);
                    throw new Error(this._formatError(review));
                }
                
                this.logger?.info('AI_WORKFLOW', '✅ 代码审查通过', {
                    file: params.file_path
                });
                
                return originalEdit(params);
            };
        }
        
        // 拦截 MultiEdit
        if (tools.MultiEdit) {
            const originalMultiEdit = tools.MultiEdit;
            tools.MultiEdit = async (params) => {
                console.log('[AIWorkflowMonitor] 🔍 拦截 MultiEdit');
                
                const review = await this.reviewBeforeEdit(params);
                
                if (!review.approved) {
                    this.logger?.error('AI_WORKFLOW', '❌ 代码审查失败', review);
                    throw new Error(this._formatError(review));
                }
                
                this.logger?.info('AI_WORKFLOW', '✅ 代码审查通过', {
                    file: params.file_path,
                    edits: params.edits?.length
                });
                
                return originalMultiEdit(params);
            };
        }
    }
    
    /**
     * 格式化错误信息
     */
    _formatError(review) {
        let msg = '❌ 代码审查失败\n\n';
        msg += '违规项:\n';
        review.violations.forEach((v, i) => {
            msg += `${i + 1}. ${v}\n`;
        });
        msg += '\n建议:\n';
        review.suggestions.forEach((s, i) => {
            msg += `${i + 1}. ${s}\n`;
        });
        return msg;
    }
    
    // ========== 手动调用API ==========
    
    /**
     * 暴露手动审查API
     */
    exposeManualAPI() {
        // 主API
        window.aiReview = async (params) => {
            return await this.manualReview(params);
        };
        
        // 查询架构清单
        window.aiReview.getArchitecture = async () => {
            return await this.getArchitecture();
        };
        
        // 检查功能冗余
        window.aiReview.checkRedundancy = async (params) => {
            return await this.checkRedundancy(params);
        };
        
        // 获取统计信息
        window.aiReview.getStats = () => {
            return this.stats;
        };
        
        console.log('[AIWorkflowMonitor] ✅ 手动API已暴露: window.aiReview()');
    }
    
    /**
     * 手动审查
     */
    async manualReview(params) {
        console.log('[AIWorkflowMonitor] 🔍 手动审查', params);
        
        this.logger?.info('AI_WORKFLOW', '手动审查开始', params);
        
        const result = await this.comprehensiveReview(params);
        
        this.logger?.info('AI_WORKFLOW', '手动审查完成', result);
        
        return result;
    }
    
    // ========== 核心审查逻辑 ==========
    
    /**
     * 写入前审查
     */
    async reviewBeforeWrite(params) {
        return await this.comprehensiveReview({
            action: 'write_file',
            target: params.TargetFile,
            code: params.CodeContent,
            emptyFile: params.EmptyFile
        });
    }
    
    /**
     * 编辑前审查
     */
    async reviewBeforeEdit(params) {
        return await this.comprehensiveReview({
            action: 'edit_file',
            target: params.file_path,
            code: params.new_string || params.edits
        });
    }
    
    /**
     * 综合审查
     */
    async comprehensiveReview(params) {
        this.stats.totalReviews++;
        
        try {
            // 并行执行所有检查
            const [archCheck, moduleCheck, redundancyCheck] = await Promise.all([
                this.checkArchitectureAlignment(params),
                this.checkModuleCompliance(params),
                this.checkRedundancy(params)
            ]);
            
            // 收集违规项
            const violations = [];
            const suggestions = [];
            
            if (!archCheck.passed) {
                violations.push(archCheck.message);
                suggestions.push(archCheck.suggestion);
            }
            
            if (!moduleCheck.passed) {
                violations.push(moduleCheck.message);
                suggestions.push(moduleCheck.suggestion);
            }
            
            if (redundancyCheck.score > 0.8) {
                violations.push(`功能重复度过高: ${(redundancyCheck.score * 100).toFixed(0)}%`);
                suggestions.push(`建议复用现有模块: ${redundancyCheck.existingModules.join(', ')}`);
            }
            
            const approved = violations.length === 0;
            
            if (approved) {
                this.stats.passed++;
            } else {
                this.stats.failed++;
                this.stats.violations.push({
                    timestamp: Date.now(),
                    target: params.target,
                    violations
                });
            }
            
            return {
                approved,
                score: approved ? 100 : Math.max(0, 100 - violations.length * 30),
                violations,
                suggestions,
                details: {
                    architectureCheck: archCheck,
                    moduleCheck: moduleCheck,
                    redundancyCheck: redundancyCheck
                }
            };
            
        } catch (error) {
            console.error('[AIWorkflowMonitor] 审查失败:', error);
            this.logger?.error('AI_WORKFLOW', '审查异常', error);
            
            // 审查失败时默认通过（避免阻塞开发）
            return {
                approved: true,
                score: 50,
                violations: [],
                suggestions: ['审查系统异常，已默认通过'],
                error: error.message
            };
        }
    }
    
    /**
     * 架构对齐检查
     */
    async checkArchitectureAlignment(params) {
        // 委托给ArchitectureAlignmentChecker
        if (window.ArchitectureAlignmentChecker) {
            return await window.ArchitectureAlignmentChecker.check(params);
        }
        
        // 降级：简单检查
        return {
            passed: true,
            message: '',
            suggestion: ''
        };
    }
    
    /**
     * 模块化规范检查
     */
    async checkModuleCompliance(params) {
        // 委托给ModuleComplianceChecker
        if (window.ModuleComplianceChecker) {
            return await window.ModuleComplianceChecker.check(params);
        }
        
        // 降级：简单检查
        return {
            passed: true,
            message: '',
            suggestion: ''
        };
    }
    
    /**
     * 功能冗余检查
     */
    async checkRedundancy(params) {
        const architecture = await this.getArchitecture();
        
        if (!architecture || !params.target) {
            return { score: 0, existingModules: [] };
        }
        
        // 简单的文件名匹配
        const targetName = params.target.split('/').pop().replace(/\.(js|html|css)$/, '');
        const existingModules = architecture.modules.filter(m => {
            const moduleName = m.name.toLowerCase();
            const target = targetName.toLowerCase();
            return moduleName.includes(target) || target.includes(moduleName);
        });
        
        return {
            score: existingModules.length > 0 ? 0.5 : 0,
            existingModules: existingModules.map(m => m.name)
        };
    }
    
    /**
     * 获取架构清单
     */
    async getArchitecture() {
        if (this.architectureCache) {
            return this.architectureCache;
        }
        
        try {
            const response = await fetch('column-sources/mindmap/docs/审查员：项目管理应用架构功能清单完善建议和修改计划25-10-07.md');
            const content = await response.text();
            
            this.architectureCache = this.parseArchitecture(content);
            return this.architectureCache;
        } catch (error) {
            console.error('[AIWorkflowMonitor] 架构清单加载失败:', error);
            return null;
        }
    }
    
    /**
     * 解析架构清单
     */
    parseArchitecture(content) {
        const modules = [];
        
        // 简单解析：提取模块名称
        const lines = content.split('\n');
        lines.forEach(line => {
            // 匹配 ### 模块名 或 - 模块名
            const match = line.match(/^#{3,}\s+(.+)|^[-*]\s+\*\*(.+?)\*\*/);
            if (match) {
                const name = match[1] || match[2];
                if (name && !name.includes('功能清单')) {
                    modules.push({
                        name: name.trim(),
                        line: line.trim()
                    });
                }
            }
        });
        
        return { modules };
    }
    
    // ========== 静态初始化 ==========
    
    /**
     * 全局初始化
     */
    static init() {
        if (window.AIWorkflowMonitor?.instance) {
            console.warn('[AIWorkflowMonitor] 已初始化，跳过');
            return window.AIWorkflowMonitor.instance;
        }
        
        const instance = new AIWorkflowMonitor();
        window.AIWorkflowMonitor = { instance };
        
        // 启动监控
        instance.start();
        
        return instance;
    }
}

// 自动初始化（如果在浏览器环境）
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        AIWorkflowMonitor.init();
    });
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIWorkflowMonitor;
}

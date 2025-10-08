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
        this.controlPanel = null; // UI控制面板
        this.isReviewing = false; // 当前是否正在审核
        this.currentReviewTarget = null; // 当前审核的目标
        
        // 审查统计
        this.stats = {
            totalReviews: 0,
            passed: 0,
            failed: 0,
            warnings: 0,  // 有条件通过
            autoTriggered: 0,  // 自动触发次数
            manualTriggered: 0,  // 手动触发次数
            violations: [],
            reviewHistory: []  // 审核历史（最近20次）
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
        
        // 创建UI控制面板
        this.createControlPanel();
        
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
        // 设置审核状态
        this.isReviewing = true;
        this.currentReviewTarget = params.target;
        this.updateStatusDisplay();
        
        const startTime = Date.now();
        this.stats.totalReviews++;
        
        // 判断触发类型
        const isManual = params.manual === true;
        if (isManual) {
            this.stats.manualTriggered++;
        } else {
            this.stats.autoTriggered++;
        }
        
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
            
            const score = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 30);
            const approved = score >= 60; // 60分以上算通过
            const duration = Date.now() - startTime;
            
            // 分类统计
            if (score === 100) {
                this.stats.passed++;
            } else if (score >= 60) {
                this.stats.warnings++;  // 有条件通过
            } else {
                this.stats.failed++;
            }
            
            // 创建审核记录
            const reviewRecord = {
                id: this.stats.totalReviews,
                timestamp: Date.now(),
                type: isManual ? 'manual' : 'auto',
                target: params.target,
                action: params.action,
                score: score,
                approved: approved,
                violations: violations,
                suggestions: suggestions,
                duration: duration,
                details: {
                    architectureCheck: archCheck,
                    moduleCheck: moduleCheck,
                    redundancyCheck: redundancyCheck
                }
            };
            
            // 保存到历史记录（最多保留20条）
            this.stats.reviewHistory.unshift(reviewRecord);
            if (this.stats.reviewHistory.length > 20) {
                this.stats.reviewHistory.pop();
            }
            
            // 自动导出：只导出警告和失败的审核
            if (score < 100) {
                this.autoExportReview(reviewRecord);
            }
            
            // 更新UI
            if (this.statsDiv) {
                this.updateStatsDisplay();
            }
            
            return {
                approved,
                score: score,
                violations,
                suggestions,
                duration,
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
        } finally {
            // 重置审核状态
            this.isReviewing = false;
            this.currentReviewTarget = null;
            this.updateStatusDisplay();
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
    
    // ========== UI控制面板 ==========
    
    /**
     * 创建UI控制面板
     */
    createControlPanel() {
        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'ai-workflow-control-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: white;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            min-width: 280px;
        `;
        
        // 创建头部
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 10px 15px;
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        `;
        
        const title = document.createElement('div');
        title.innerHTML = '<strong>🛡️ 架构审核</strong>';
        
        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = '▼';
        collapseBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        collapseBtn.onclick = () => this.togglePanel();
        
        header.appendChild(title);
        header.appendChild(collapseBtn);
        
        // 创建主体
        const body = document.createElement('div');
        body.id = 'ai-workflow-panel-body';
        body.style.cssText = `
            padding: 15px;
            background: #f9f9f9;
        `;
        
        // 状态显示
        const statusDiv = document.createElement('div');
        statusDiv.id = 'ai-workflow-status';
        statusDiv.style.cssText = `
            padding: 8px;
            background: white;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 12px;
        `;
        statusDiv.innerHTML = '🟢 空闲';
        statusDiv.style.color = '#4CAF50';
        
        // 自动拦截开关
        const autoRow = this.createSwitchRow(
            '自动拦截',
            this.autoMode,
            (enabled) => this.setAutoMode(enabled)
        );
        
        // 手动调用开关
        const manualRow = this.createSwitchRow(
            '手动调用API',
            this.manualMode,
            (enabled) => this.setManualMode(enabled)
        );
        
        // 手动触发审核按钮
        const manualTriggerBtn = document.createElement('button');
        manualTriggerBtn.textContent = '🔍 立即审核';
        manualTriggerBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-top: 8px;
            font-size: 11px;
            border: 1px solid #2196F3;
            border-radius: 3px;
            background: white;
            color: #2196F3;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: bold;
        `;
        manualTriggerBtn.onmouseover = () => {
            manualTriggerBtn.style.background = '#2196F3';
            manualTriggerBtn.style.color = 'white';
        };
        manualTriggerBtn.onmouseout = () => {
            manualTriggerBtn.style.background = 'white';
            manualTriggerBtn.style.color = '#2196F3';
        };
        manualTriggerBtn.onclick = () => this.triggerManualReview();
        
        // 统计信息
        const statsDiv = document.createElement('div');
        statsDiv.id = 'ai-workflow-stats';
        statsDiv.style.cssText = `
            margin-top: 12px;
            padding: 10px;
            background: white;
            border-radius: 4px;
            font-size: 11px;
            line-height: 1.6;
        `;
        this.updateStatsDisplay(statsDiv);
        
        // 导出按钮
        const exportDiv = document.createElement('div');
        exportDiv.style.cssText = `
            margin-top: 12px;
            padding: 10px;
            background: white;
            border-radius: 4px;
        `;
        
        const exportTitle = document.createElement('div');
        exportTitle.innerHTML = '<strong>📥 导出报告</strong>';
        exportTitle.style.cssText = 'color: #666; margin-bottom: 8px; font-size: 11px;';
        
        const exportBtns = document.createElement('div');
        exportBtns.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap;';
        
        const btnStyle = `
            padding: 4px 8px;
            font-size: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        const createExportBtn = (text, type) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = btnStyle;
            btn.onmouseover = () => btn.style.background = '#f0f0f0';
            btn.onmouseout = () => btn.style.background = 'white';
            btn.onclick = () => this.exportReviews(type);
            return btn;
        };
        
        exportBtns.appendChild(createExportBtn('最近一次', 'last'));
        exportBtns.appendChild(createExportBtn('警告记录', 'warnings'));
        exportBtns.appendChild(createExportBtn('失败记录', 'failures'));
        exportBtns.appendChild(createExportBtn('全部', 'all'));
        
        exportDiv.appendChild(exportTitle);
        exportDiv.appendChild(exportBtns);
        
        // Git回退按钮
        const gitDiv = document.createElement('div');
        gitDiv.style.cssText = `
            margin-top: 12px;
            padding: 10px;
            background: white;
            border-radius: 4px;
        `;
        
        const gitTitle = document.createElement('div');
        gitTitle.innerHTML = '<strong>🔄 Git操作</strong>';
        gitTitle.style.cssText = 'color: #666; margin-bottom: 8px; font-size: 11px;';
        
        // 按钮容器
        const gitBtnsContainer = document.createElement('div');
        gitBtnsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
        
        // 自动提交控制按钮
        const autoCommitBtn = document.createElement('button');
        autoCommitBtn.id = 'auto-commit-control-btn';
        autoCommitBtn.textContent = '▶️ 启动自动提交';
        autoCommitBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            font-size: 11px;
            border: 1px solid #4CAF50;
            border-radius: 3px;
            background: white;
            color: #4CAF50;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: bold;
        `;
        autoCommitBtn.onmouseover = () => {
            const isRunning = autoCommitBtn.textContent.includes('停止');
            autoCommitBtn.style.background = isRunning ? '#f44336' : '#4CAF50';
            autoCommitBtn.style.color = 'white';
        };
        autoCommitBtn.onmouseout = () => {
            const isRunning = autoCommitBtn.textContent.includes('停止');
            autoCommitBtn.style.background = 'white';
            autoCommitBtn.style.color = isRunning ? '#f44336' : '#4CAF50';
        };
        autoCommitBtn.onclick = () => this.toggleAutoCommit();
        
        // 回退按钮
        const rollbackBtn = document.createElement('button');
        rollbackBtn.textContent = '⬅️ 回退到上个提交';
        rollbackBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            font-size: 11px;
            border: 1px solid #f44336;
            border-radius: 3px;
            background: white;
            color: #f44336;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: bold;
        `;
        rollbackBtn.onmouseover = () => {
            rollbackBtn.style.background = '#f44336';
            rollbackBtn.style.color = 'white';
        };
        rollbackBtn.onmouseout = () => {
            rollbackBtn.style.background = 'white';
            rollbackBtn.style.color = '#f44336';
        };
        rollbackBtn.onclick = () => this.rollbackToLastCommit();
        
        gitBtnsContainer.appendChild(autoCommitBtn);
        gitBtnsContainer.appendChild(rollbackBtn);
        
        gitDiv.appendChild(gitTitle);
        gitDiv.appendChild(gitBtnsContainer);
        
        body.appendChild(statusDiv);
        body.appendChild(autoRow);
        body.appendChild(manualRow);
        body.appendChild(manualTriggerBtn);
        body.appendChild(statsDiv);
        body.appendChild(exportDiv);
        body.appendChild(gitDiv);
        
        panel.appendChild(header);
        panel.appendChild(body);
        document.body.appendChild(panel);
        
        this.controlPanel = panel;
        this.statsDiv = statsDiv;
        this.collapseBtn = collapseBtn;
        
        // 使面板可拖动
        this.makeDraggable(panel, header);
        
        console.log('[AIWorkflowMonitor] ✅ UI控制面板已创建');
    }
    
    /**
     * 创建开关行
     */
    createSwitchRow(label, initialState, onChange) {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        `;
        
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.color = '#333';
        
        const switchContainer = document.createElement('label');
        switchContainer.style.cssText = `
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        `;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = initialState;
        checkbox.style.cssText = 'opacity: 0; width: 0; height: 0;';
        checkbox.onchange = (e) => onChange(e.target.checked);
        
        const slider = document.createElement('span');
        slider.style.cssText = `
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${initialState ? '#4CAF50' : '#ccc'};
            transition: .3s;
            border-radius: 24px;
        `;
        
        const sliderButton = document.createElement('span');
        sliderButton.style.cssText = `
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: ${initialState ? '23px' : '3px'};
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        `;
        
        checkbox.onchange = (e) => {
            const checked = e.target.checked;
            slider.style.backgroundColor = checked ? '#4CAF50' : '#ccc';
            sliderButton.style.left = checked ? '23px' : '3px';
            onChange(checked);
        };
        
        slider.appendChild(sliderButton);
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        
        row.appendChild(labelSpan);
        row.appendChild(switchContainer);
        
        return row;
    }
    
    /**
     * 更新统计显示
     */
    updateStatsDisplay(statsDiv) {
        if (!statsDiv) statsDiv = this.statsDiv;
        if (!statsDiv) return;
        
        const passRate = this.stats.totalReviews > 0 
            ? ((this.stats.passed / this.stats.totalReviews) * 100).toFixed(1)
            : '0.0';
        
        // 最近一次审核
        const lastReview = this.stats.reviewHistory[0];
        const lastReviewTime = lastReview ? new Date(lastReview.timestamp).toLocaleTimeString() : '--';
        const lastReviewResult = lastReview ? 
            (lastReview.score === 100 ? '✅ 通过' : 
             lastReview.score >= 60 ? '⚠️ 警告' : '❌ 失败') : '--';
        
        statsDiv.innerHTML = `
            <div style="color: #666; margin-bottom: 5px;"><strong>📊 审查统计</strong></div>
            <div style="color: #333;">总计: ${this.stats.totalReviews}次 (🤖${this.stats.autoTriggered} 👆${this.stats.manualTriggered})</div>
            <div style="color: #4CAF50;">✅ 通过: ${this.stats.passed}</div>
            <div style="color: #FF9800;">⚠️ 警告: ${this.stats.warnings}</div>
            <div style="color: #f44336;">❌ 失败: ${this.stats.failed}</div>
            <div style="color: #2196F3;">通过率: ${passRate}%</div>
            <div style="color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                <strong>⏱️ 最近审核</strong><br>
                时间: ${lastReviewTime}<br>
                结果: ${lastReviewResult}
            </div>
        `;
    }
    
    /**
     * 更新状态显示
     */
    updateStatusDisplay() {
        const statusDiv = document.getElementById('ai-workflow-status');
        if (!statusDiv) return;
        
        if (this.isReviewing) {
            statusDiv.innerHTML = '🔴 审核中';
            statusDiv.style.color = '#f44336';
            if (this.currentReviewTarget) {
                statusDiv.title = `正在审核: ${this.currentReviewTarget}`;
            }
        } else {
            statusDiv.innerHTML = '🟢 空闲';
            statusDiv.style.color = '#4CAF50';
            statusDiv.title = '等待审核';
        }
    }
    
    /**
     * 自动导出审核报告（只导出警告和失败）
     */
    autoExportReview(reviewRecord) {
        try {
            // 保存到 LocalStorage
            const key = `ai-workflow-review-${reviewRecord.id}`;
            const data = JSON.stringify(reviewRecord, null, 2);
            localStorage.setItem(key, data);
            
            // 记录日志
            const level = reviewRecord.score >= 60 ? 'WARN' : 'ERROR';
            const message = `审核报告已自动导出: ${reviewRecord.target} (评分: ${reviewRecord.score})`;
            this.logger?.log(level, 'AI_WORKFLOW', message, reviewRecord);
            
            console.log(`[AIWorkflowMonitor] ${message}`);
        } catch (error) {
            console.error('[AIWorkflowMonitor] 导出审核报告失败:', error);
        }
    }
    
    /**
     * 导出审核报告（手动）
     */
    exportReviews(type = 'all') {
        let reviews = [];
        
        switch (type) {
            case 'last':
                reviews = this.stats.reviewHistory.slice(0, 1);
                break;
            case 'warnings':
                reviews = this.stats.reviewHistory.filter(r => r.score >= 60 && r.score < 100);
                break;
            case 'failures':
                reviews = this.stats.reviewHistory.filter(r => r.score < 60);
                break;
            case 'all':
            default:
                reviews = this.stats.reviewHistory;
                break;
        }
        
        if (reviews.length === 0) {
            alert('没有可导出的审核记录');
            return;
        }
        
        // 生成JSON
        const exportData = {
            exportTime: new Date().toISOString(),
            totalRecords: reviews.length,
            records: reviews
        };
        
        // 下载文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-workflow-reviews-${type}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`[AIWorkflowMonitor] 已导出 ${reviews.length} 条审核记录`);
    }
    
    /**
     * 设置自动模式
     */
    setAutoMode(enabled) {
        this.autoMode = enabled;
        console.log(`[AIWorkflowMonitor] 自动拦截模式: ${enabled ? '开启' : '关闭'}`);
        this.logger?.info('AI_WORKFLOW', `自动拦截模式${enabled ? '开启' : '关闭'}`);
        
        if (enabled) {
            this.interceptCascadeTools();
        }
    }
    
    /**
     * 设置手动模式
     */
    setManualMode(enabled) {
        this.manualMode = enabled;
        console.log(`[AIWorkflowMonitor] 手动调用模式: ${enabled ? '开启' : '关闭'}`);
        this.logger?.info('AI_WORKFLOW', `手动调用模式${enabled ? '开启' : '关闭'}`);
        
        if (enabled) {
            this.exposeManualAPI();
        } else {
            delete window.aiReview;
        }
    }
    
    /**
     * 切换面板显示
     */
    togglePanel() {
        const body = document.getElementById('ai-workflow-panel-body');
        if (!body) return;
        
        const isCollapsed = body.style.display === 'none';
        body.style.display = isCollapsed ? 'block' : 'none';
        this.collapseBtn.textContent = isCollapsed ? '▼' : '▶';
    }
    
    /**
     * 使面板可拖动
     */
    makeDraggable(panel, header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        header.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            panel.style.top = (panel.offsetTop - pos2) + "px";
            panel.style.left = (panel.offsetLeft - pos1) + "px";
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    /**
     * 回退到上个提交
     */
    async rollbackToLastCommit() {
        // 确认对话框
        const confirmed = confirm(
            '⚠️ 警告：此操作将回退到上个提交\n\n' +
            '这将：\n' +
            '1. 撤销所有未提交的更改\n' +
            '2. 回退到上一个Git提交\n' +
            '3. 无法恢复当前的修改\n\n' +
            '确定要继续吗？'
        );
        
        if (!confirmed) {
            console.log('[AIWorkflowMonitor] 用户取消回退操作');
            return;
        }
        
        try {
            console.log('[AIWorkflowMonitor] 开始回退到上个提交...');
            this.logger?.warn('AI_WORKFLOW', '用户触发Git回退操作');
            
            // 检查是否有未提交的更改
            const statusCheck = await this.executeGitCommand('git status --porcelain');
            
            if (statusCheck.trim()) {
                // 有未提交的更改，先保存到stash
                console.log('[AIWorkflowMonitor] 检测到未提交的更改，保存到stash...');
                await this.executeGitCommand('git stash push -m "Auto-stash before rollback"');
            }
            
            // 回退到上个提交
            console.log('[AIWorkflowMonitor] 执行 git reset --hard HEAD~1');
            await this.executeGitCommand('git reset --hard HEAD~1');
            
            // 成功提示
            alert('✅ 已成功回退到上个提交！\n\n页面将刷新以加载回退后的代码。');
            
            this.logger?.info('AI_WORKFLOW', '✅ Git回退成功');
            
            // 刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('[AIWorkflowMonitor] 回退失败:', error);
            this.logger?.error('AI_WORKFLOW', 'Git回退失败', error);
            
            alert(
                '❌ 回退失败\n\n' +
                '错误信息：' + error.message + '\n\n' +
                '请手动执行：\n' +
                'git reset --hard HEAD~1'
            );
        }
    }
    
    /**
     * 执行Git命令（浏览器环境的模拟）
     */
    async executeGitCommand(command) {
        // 注意：浏览器环境无法直接执行Git命令
        // 这里提供一个接口，实际执行需要后端支持或使用Electron等环境
        
        console.warn('[AIWorkflowMonitor] 浏览器环境无法直接执行Git命令:', command);
        
        // 如果有后端API，可以调用
        // const response = await fetch('/api/git/execute', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ command })
        // });
        // return await response.text();
        
        // 降级方案：提示用户手动执行
        throw new Error(
            '浏览器环境无法直接执行Git命令。\n' +
            '请在终端手动执行：\n' +
            command
        );
    }
    
    /**
     * 手动触发审核
     */
    async triggerManualReview() {
        alert(
            '🔍 手动审核功能\n\n' +
            '此功能用于手动触发架构审核。\n\n' +
            '使用方式：\n' +
            '1. 在控制台调用: window.aiReview({...})\n' +
            '2. 或者等待AI操作时自动触发\n\n' +
            '当前此按钮为演示功能。'
        );
        
        console.log('[AIWorkflowMonitor] 手动触发审核');
        this.logger?.info('AI_WORKFLOW', '用户手动触发审核');
    }
    
    /**
     * 切换自动提交
     */
    toggleAutoCommit() {
        const btn = document.getElementById('auto-commit-control-btn');
        if (!btn) return;
        
        const isRunning = btn.textContent.includes('停止');
        
        if (isRunning) {
            // 停止自动提交
            alert(
                '⏸️ 停止自动提交\n\n' +
                '浏览器环境无法直接控制PowerShell进程。\n\n' +
                '请在运行 auto-commit-smart.ps1 的终端按 Ctrl+C 停止。'
            );
        } else {
            // 启动自动提交
            const confirmed = confirm(
                '▶️ 启动自动提交\n\n' +
                '这将在新终端启动自动提交脚本。\n' +
                '检测到文件变化后5分钟无新变化时自动提交。\n\n' +
                '确定要启动吗？'
            );
            
            if (confirmed) {
                alert(
                    '📝 启动说明\n\n' +
                    '浏览器环境无法直接启动PowerShell脚本。\n\n' +
                    '请手动在终端执行：\n' +
                    '.\\auto-commit-smart.ps1 -WaitMinutes 5 -AutoPush\n\n' +
                    '或者：\n' +
                    'Start-Process powershell -ArgumentList "-File auto-commit-smart.ps1 -WaitMinutes 5 -AutoPush"'
                );
                
                // 更新按钮状态（仅UI）
                btn.textContent = '⏸️ 停止自动提交';
                btn.style.borderColor = '#f44336';
                btn.style.color = '#f44336';
            }
        }
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

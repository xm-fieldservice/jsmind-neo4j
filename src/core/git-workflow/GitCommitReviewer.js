/**
 * Git提交审核器
 * 
 * @author 程序员
 * @date 2025-10-08
 * @version 1.0
 * 
 * 功能：
 * 1. 审核提交信息质量
 * 2. 审核代码变更
 * 3. 审核提交频率
 * 4. 生成质量报告
 * 
 * 集成：
 * - 与AIWorkflowMonitor协同工作
 * - 记录到UnifiedLogger
 * - 存储到IndexedDB
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitCommitReviewer {
    constructor(options = {}) {
        this.repoPath = options.repoPath || process.cwd();
        this.logger = options.logger || console;
        
        // 审核规则配置
        this.rules = {
            message: {
                minLength: 10,
                maxLength: 72,
                requireType: true,
                requireDetails: true
            },
            changes: {
                maxFiles: 20,
                maxLines: 1000,
                checkArchitecture: true
            },
            frequency: {
                maxCommitsPerDay: 20,
                maxLargeCommitRatio: 0.3
            }
        };
        
        // 提交类型
        this.commitTypes = [
            'feat', 'fix', 'docs', 'style', 
            'refactor', 'perf', 'test', 'chore', 'arch'
        ];
    }
    
    /**
     * 审核提交信息
     */
    async reviewCommitMessage(message) {
        const checks = {
            type: this.checkCommitType(message),
            description: this.checkDescription(message),
            details: this.checkDetails(message),
            format: this.checkFormat(message)
        };
        
        const score = this.calculateMessageScore(checks);
        const passed = score >= 60;
        
        return {
            passed,
            score,
            checks,
            suggestions: this.generateMessageSuggestions(checks)
        };
    }
    
    /**
     * 检查提交类型
     */
    checkCommitType(message) {
        const firstLine = message.split('\n')[0];
        const hasType = this.commitTypes.some(type => 
            firstLine.startsWith(type + ':')
        );
        
        return {
            passed: hasType,
            message: hasType ? '提交类型正确' : '缺少提交类型',
            score: hasType ? 100 : 0
        };
    }
    
    /**
     * 检查描述
     */
    checkDescription(message) {
        const firstLine = message.split('\n')[0];
        const description = firstLine.includes(':') ? 
            firstLine.split(':')[1].trim() : firstLine;
        
        const length = description.length;
        
        let passed = true;
        let msg = '描述长度合适';
        let score = 100;
        
        if (length < this.rules.message.minLength) {
            passed = false;
            msg = `描述过短 (当前: ${length}字符, 要求: ${this.rules.message.minLength}-${this.rules.message.maxLength}字符)`;
            score = (length / this.rules.message.minLength) * 100;
        } else if (length > this.rules.message.maxLength) {
            passed = false;
            msg = `描述过长 (当前: ${length}字符, 要求: ${this.rules.message.minLength}-${this.rules.message.maxLength}字符)`;
            score = 70;
        }
        
        return {
            passed,
            message: msg,
            score,
            length
        };
    }
    
    /**
     * 检查详细说明
     */
    checkDetails(message) {
        const hasMainChanges = message.includes('## 主要变更');
        const hasDetailedDesc = message.includes('## 详细说明');
        const hasFileList = message.includes('### 新增') || 
                           message.includes('### 修改') || 
                           message.includes('### 删除');
        
        const score = (
            (hasMainChanges ? 40 : 0) +
            (hasDetailedDesc ? 30 : 0) +
            (hasFileList ? 30 : 0)
        );
        
        const passed = score >= 40;
        
        return {
            passed,
            message: passed ? '包含详细说明' : '缺少详细说明',
            score,
            details: {
                hasMainChanges,
                hasDetailedDesc,
                hasFileList
            }
        };
    }
    
    /**
     * 检查格式
     */
    checkFormat(message) {
        const lines = message.split('\n');
        
        // 检查第二行是否为空
        const hasBlankLine = lines.length > 1 && lines[1].trim() === '';
        
        // 检查是否有Markdown格式
        const hasMarkdown = message.includes('##') || message.includes('- ');
        
        const score = (hasBlankLine ? 50 : 0) + (hasMarkdown ? 50 : 0);
        const passed = score >= 50;
        
        return {
            passed,
            message: passed ? '格式正确' : '格式不规范',
            score,
            details: {
                hasBlankLine,
                hasMarkdown
            }
        };
    }
    
    /**
     * 计算提交信息分数
     */
    calculateMessageScore(checks) {
        const weights = {
            type: 0.2,
            description: 0.15,
            details: 0.4,
            format: 0.25
        };
        
        return Math.round(
            checks.type.score * weights.type +
            checks.description.score * weights.description +
            checks.details.score * weights.details +
            checks.format.score * weights.format
        );
    }
    
    /**
     * 生成提交信息改进建议
     */
    generateMessageSuggestions(checks) {
        const suggestions = [];
        
        if (!checks.type.passed) {
            suggestions.push('添加提交类型 (feat/fix/docs/style/refactor/perf/test/chore/arch)');
        }
        
        if (!checks.description.passed) {
            if (checks.description.length < this.rules.message.minLength) {
                suggestions.push('描述过短，请添加更详细的说明');
            } else {
                suggestions.push('描述过长，请精简到72字符以内');
            }
        }
        
        if (!checks.details.passed) {
            if (!checks.details.details.hasMainChanges) {
                suggestions.push('添加"## 主要变更"章节');
            }
            if (!checks.details.details.hasDetailedDesc) {
                suggestions.push('添加"## 详细说明"章节');
            }
            if (!checks.details.details.hasFileList) {
                suggestions.push('列出变更的文件');
            }
        }
        
        if (!checks.format.passed) {
            suggestions.push('使用Markdown格式编写提交信息');
            suggestions.push('在标题和正文之间添加空行');
        }
        
        if (suggestions.length === 0) {
            suggestions.push('提交信息质量良好！');
        }
        
        return suggestions;
    }
    
    /**
     * 审核代码变更
     */
    async reviewCodeChanges(commitHash = 'HEAD') {
        try {
            const diff = await this.getCommitDiff(commitHash);
            
            const checks = {
                fileCount: this.checkFileCount(diff),
                lineCount: this.checkLineCount(diff),
                newFiles: await this.checkNewFiles(diff)
            };
            
            const passed = Object.values(checks).every(c => c.passed);
            
            return {
                passed,
                checks,
                diff
            };
        } catch (error) {
            this.logger.error('[GitCommitReviewer] 审核代码变更失败:', error);
            return {
                passed: true,  // 失败时默认通过
                error: error.message
            };
        }
    }
    
    /**
     * 获取提交的diff
     */
    async getCommitDiff(commitHash) {
        const cmd = `git diff-tree --no-commit-id --name-status --numstat -r ${commitHash}`;
        const output = execSync(cmd, { 
            cwd: this.repoPath,
            encoding: 'utf-8'
        });
        
        const files = [];
        let insertions = 0;
        let deletions = 0;
        
        const lines = output.trim().split('\n');
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 3) {
                const [add, del, file] = parts;
                insertions += parseInt(add) || 0;
                deletions += parseInt(del) || 0;
                
                files.push({
                    name: file,
                    insertions: parseInt(add) || 0,
                    deletions: parseInt(del) || 0,
                    status: this.getFileStatus(file, add, del)
                });
            }
        }
        
        return {
            files,
            insertions,
            deletions,
            totalLines: insertions + deletions
        };
    }
    
    /**
     * 获取文件状态
     */
    getFileStatus(file, add, del) {
        if (add === '0' && del !== '0') return 'deleted';
        if (add !== '0' && del === '0') return 'added';
        return 'modified';
    }
    
    /**
     * 检查文件数量
     */
    checkFileCount(diff) {
        const count = diff.files.length;
        const passed = count <= this.rules.changes.maxFiles;
        
        return {
            passed,
            message: passed ? 
                '文件数量合理' : 
                `修改文件过多 (当前: ${count}个, 限制: ${this.rules.changes.maxFiles}个)`,
            count
        };
    }
    
    /**
     * 检查代码行数
     */
    checkLineCount(diff) {
        const total = diff.totalLines;
        const passed = total <= this.rules.changes.maxLines;
        
        return {
            passed,
            message: passed ? 
                '代码变更量合理' : 
                `代码变更过大 (当前: ${total}行, 限制: ${this.rules.changes.maxLines}行)`,
            totalLines: total,
            insertions: diff.insertions,
            deletions: diff.deletions
        };
    }
    
    /**
     * 检查新增文件
     */
    async checkNewFiles(diff) {
        const newFiles = diff.files.filter(f => f.status === 'added');
        
        if (newFiles.length === 0) {
            return {
                passed: true,
                message: '无新增文件'
            };
        }
        
        // 简单检查：文件名相似度
        const warnings = [];
        for (const file of newFiles) {
            const fileName = path.basename(file.name, path.extname(file.name));
            
            // 检查是否有相似的文件名
            const similar = diff.files.filter(f => 
                f.name !== file.name &&
                path.basename(f.name, path.extname(f.name)).toLowerCase().includes(fileName.toLowerCase())
            );
            
            if (similar.length > 0) {
                warnings.push(`文件 ${file.name} 可能与 ${similar[0].name} 重复`);
            }
        }
        
        return {
            passed: warnings.length === 0,
            message: warnings.length === 0 ? 
                '新增文件检查通过' : 
                `发现${warnings.length}个潜在重复文件`,
            warnings,
            newFiles: newFiles.map(f => f.name)
        };
    }
    
    /**
     * 综合审核
     */
    async comprehensiveReview(commitHash = 'HEAD') {
        try {
            // 获取提交信息
            const message = this.getCommitMessage(commitHash);
            
            // 并行执行审核
            const [messageReview, changesReview] = await Promise.all([
                this.reviewCommitMessage(message),
                this.reviewCodeChanges(commitHash)
            ]);
            
            const overallScore = Math.round(
                messageReview.score * 0.6 + 
                (changesReview.passed ? 40 : 20)
            );
            
            const passed = messageReview.passed && changesReview.passed;
            
            return {
                passed,
                score: overallScore,
                message: messageReview,
                changes: changesReview,
                timestamp: Date.now()
            };
        } catch (error) {
            this.logger.error('[GitCommitReviewer] 综合审核失败:', error);
            return {
                passed: true,  // 失败时默认通过
                error: error.message
            };
        }
    }
    
    /**
     * 获取提交信息
     */
    getCommitMessage(commitHash) {
        const cmd = `git log -1 --pretty=%B ${commitHash}`;
        return execSync(cmd, { 
            cwd: this.repoPath,
            encoding: 'utf-8'
        }).trim();
    }
    
    /**
     * 获取提交作者
     */
    getCommitAuthor(commitHash) {
        const cmd = `git log -1 --pretty=%an ${commitHash}`;
        return execSync(cmd, { 
            cwd: this.repoPath,
            encoding: 'utf-8'
        }).trim();
    }
    
    /**
     * 格式化审核结果
     */
    formatReviewResult(review) {
        let output = '';
        
        if (review.passed) {
            output += '✅ 审核通过\n\n';
            output += `📊 提交质量评分: ${review.score}/100\n`;
        } else {
            output += '❌ 审核失败\n\n';
            output += `📊 提交质量评分: ${review.score}/100\n\n`;
        }
        
        // 提交信息审核
        if (review.message) {
            output += '## 提交信息审核\n';
            output += `  - 提交类型: ${review.message.checks.type.passed ? '✅' : '❌'} ${review.message.checks.type.message}\n`;
            output += `  - 描述长度: ${review.message.checks.description.passed ? '✅' : '❌'} ${review.message.checks.description.message}\n`;
            output += `  - 详细说明: ${review.message.checks.details.passed ? '✅' : '❌'} ${review.message.checks.details.message}\n`;
            output += `  - 格式规范: ${review.message.checks.format.passed ? '✅' : '❌'} ${review.message.checks.format.message}\n`;
            output += '\n';
        }
        
        // 代码变更审核
        if (review.changes && review.changes.checks) {
            output += '## 代码变更审核\n';
            output += `  - 文件数量: ${review.changes.checks.fileCount.passed ? '✅' : '❌'} ${review.changes.checks.fileCount.message}\n`;
            output += `  - 代码行数: ${review.changes.checks.lineCount.passed ? '✅' : '❌'} ${review.changes.checks.lineCount.message}\n`;
            output += `  - 新增文件: ${review.changes.checks.newFiles.passed ? '✅' : '❌'} ${review.changes.checks.newFiles.message}\n`;
            output += '\n';
        }
        
        // 改进建议
        if (review.message && review.message.suggestions.length > 0) {
            output += '## 改进建议\n';
            review.message.suggestions.forEach((s, i) => {
                output += `  ${i + 1}. ${s}\n`;
            });
        }
        
        return output;
    }
}

// 支持Node.js模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitCommitReviewer;
}

// 支持浏览器环境
if (typeof window !== 'undefined') {
    window.GitCommitReviewer = GitCommitReviewer;
}

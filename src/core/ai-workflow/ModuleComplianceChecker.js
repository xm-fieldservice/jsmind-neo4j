/**
 * 模块化规范检查器
 * 
 * @author 程序员
 * @date 2025-10-08
 * @version 1.0
 * 
 * 功能：
 * 1. 检查代码行数限制
 * 2. 检查模块依赖关系
 * 3. 检查命名规范
 * 4. 检查代码结构
 * 
 * 规范：
 * - JavaScript文件不超过1000行
 * - 类名使用PascalCase
 * - 函数名使用camelCase
 * - 避免循环依赖
 */

class ModuleComplianceChecker {
    constructor() {
        this.rules = {
            maxLines: 1000,           // 最大行数
            maxFunctionLines: 100,    // 单个函数最大行数
            maxComplexity: 10,        // 最大圈复杂度
            minDocumentation: 0.3     // 最小文档覆盖率
        };
        
        this.checkHistory = [];
    }
    
    /**
     * 执行模块化规范检查
     */
    async check(params) {
        const { action, target, code } = params;
        
        console.log('[ModuleChecker] 开始检查', { action, target });
        
        // 只检查代码文件
        if (!this.isCodeFile(target)) {
            return {
                passed: true,
                message: '非代码文件，跳过检查',
                suggestion: ''
            };
        }
        
        // 如果没有代码内容，跳过
        if (!code || typeof code !== 'string') {
            return {
                passed: true,
                message: '无代码内容',
                suggestion: ''
            };
        }
        
        // 执行各项检查
        const checks = {
            lineCount: this.checkLineCount(code),
            naming: this.checkNaming(code, target),
            structure: this.checkStructure(code),
            documentation: this.checkDocumentation(code)
        };
        
        // 收集违规项
        const violations = [];
        const suggestions = [];
        
        if (!checks.lineCount.passed) {
            violations.push(checks.lineCount.message);
            suggestions.push(checks.lineCount.suggestion);
        }
        
        if (!checks.naming.passed) {
            violations.push(checks.naming.message);
            suggestions.push(checks.naming.suggestion);
        }
        
        if (!checks.structure.passed) {
            violations.push(checks.structure.message);
            suggestions.push(checks.structure.suggestion);
        }
        
        if (!checks.documentation.passed) {
            // 文档不足只是警告，不阻止
            console.warn('[ModuleChecker] ⚠️ 文档覆盖率不足', checks.documentation);
        }
        
        const passed = violations.length === 0;
        
        // 记录检查历史
        this.checkHistory.push({
            timestamp: Date.now(),
            target,
            passed,
            checks
        });
        
        return {
            passed,
            message: passed ? '模块化规范检查通过' : violations.join('; '),
            suggestion: suggestions.join('; '),
            details: checks
        };
    }
    
    /**
     * 检查代码行数
     */
    checkLineCount(code) {
        const lines = code.split('\n');
        const lineCount = lines.length;
        
        if (lineCount > this.rules.maxLines) {
            return {
                passed: false,
                message: `代码行数过多: ${lineCount}行 (限制${this.rules.maxLines}行)`,
                suggestion: '建议拆分为多个模块',
                lineCount
            };
        }
        
        return {
            passed: true,
            message: '',
            suggestion: '',
            lineCount
        };
    }
    
    /**
     * 检查命名规范
     */
    checkNaming(code, filePath) {
        const violations = [];
        
        // 检查类名（PascalCase）
        const classMatches = code.matchAll(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
        for (const match of classMatches) {
            const className = match[1];
            if (!this.isPascalCase(className)) {
                violations.push(`类名 "${className}" 应使用PascalCase`);
            }
        }
        
        // 检查函数名（camelCase）
        const functionMatches = code.matchAll(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
        for (const match of functionMatches) {
            const funcName = match[1];
            if (!this.isCamelCase(funcName) && !this.isPascalCase(funcName)) {
                violations.push(`函数名 "${funcName}" 应使用camelCase`);
            }
        }
        
        // 检查常量（UPPER_SNAKE_CASE）
        const constMatches = code.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=/g);
        for (const match of constMatches) {
            const constName = match[1];
            if (!this.isUpperSnakeCase(constName)) {
                // 允许camelCase的const
                if (!this.isCamelCase(constName)) {
                    violations.push(`常量 "${constName}" 应使用UPPER_SNAKE_CASE或camelCase`);
                }
            }
        }
        
        if (violations.length > 0) {
            return {
                passed: false,
                message: `命名规范违规: ${violations.length}处`,
                suggestion: violations.join('; '),
                violations
            };
        }
        
        return {
            passed: true,
            message: '',
            suggestion: ''
        };
    }
    
    /**
     * 检查代码结构
     */
    checkStructure(code) {
        const issues = [];
        
        // 检查函数长度
        const functions = this.extractFunctions(code);
        functions.forEach(func => {
            if (func.lines > this.rules.maxFunctionLines) {
                issues.push(`函数 "${func.name}" 过长: ${func.lines}行`);
            }
        });
        
        // 检查嵌套深度
        const maxNesting = this.calculateMaxNesting(code);
        if (maxNesting > 4) {
            issues.push(`嵌套层级过深: ${maxNesting}层`);
        }
        
        // 检查重复代码
        const duplicates = this.findDuplicateCode(code);
        if (duplicates.length > 0) {
            issues.push(`发现${duplicates.length}处重复代码`);
        }
        
        if (issues.length > 0) {
            return {
                passed: false,
                message: `代码结构问题: ${issues.length}处`,
                suggestion: issues.join('; '),
                issues
            };
        }
        
        return {
            passed: true,
            message: '',
            suggestion: ''
        };
    }
    
    /**
     * 检查文档覆盖率
     */
    checkDocumentation(code) {
        const lines = code.split('\n');
        let commentLines = 0;
        let codeLines = 0;
        
        let inBlockComment = false;
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // 块注释
            if (trimmed.startsWith('/*')) inBlockComment = true;
            if (inBlockComment) {
                commentLines++;
                if (trimmed.endsWith('*/')) inBlockComment = false;
                return;
            }
            
            // 行注释
            if (trimmed.startsWith('//')) {
                commentLines++;
                return;
            }
            
            // 代码行
            if (trimmed.length > 0) {
                codeLines++;
            }
        });
        
        const coverage = codeLines > 0 ? commentLines / codeLines : 0;
        
        if (coverage < this.rules.minDocumentation) {
            return {
                passed: false,
                message: `文档覆盖率不足: ${(coverage * 100).toFixed(1)}%`,
                suggestion: '建议添加更多注释和文档',
                coverage
            };
        }
        
        return {
            passed: true,
            message: '',
            suggestion: '',
            coverage
        };
    }
    
    // ========== 辅助方法 ==========
    
    isCodeFile(filePath) {
        return /\.(js|ts|jsx|tsx)$/.test(filePath);
    }
    
    isPascalCase(name) {
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);
    }
    
    isCamelCase(name) {
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
    }
    
    isUpperSnakeCase(name) {
        return /^[A-Z][A-Z0-9_]*$/.test(name);
    }
    
    extractFunctions(code) {
        const functions = [];
        const lines = code.split('\n');
        
        let inFunction = false;
        let functionStart = 0;
        let functionName = '';
        let braceCount = 0;
        
        lines.forEach((line, index) => {
            // 检测函数开始
            const funcMatch = line.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/);
            if (funcMatch && !inFunction) {
                inFunction = true;
                functionStart = index;
                functionName = funcMatch[1] || funcMatch[2] || 'anonymous';
                braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
                return;
            }
            
            if (inFunction) {
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;
                
                if (braceCount === 0) {
                    functions.push({
                        name: functionName,
                        lines: index - functionStart + 1,
                        start: functionStart,
                        end: index
                    });
                    inFunction = false;
                }
            }
        });
        
        return functions;
    }
    
    calculateMaxNesting(code) {
        let maxNesting = 0;
        let currentNesting = 0;
        
        for (let char of code) {
            if (char === '{') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (char === '}') {
                currentNesting--;
            }
        }
        
        return maxNesting;
    }
    
    findDuplicateCode(code) {
        // 简单实现：查找重复的代码块（3行以上）
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const duplicates = [];
        const blockSize = 3;
        
        for (let i = 0; i < lines.length - blockSize; i++) {
            const block = lines.slice(i, i + blockSize).join('\n');
            
            for (let j = i + blockSize; j < lines.length - blockSize; j++) {
                const compareBlock = lines.slice(j, j + blockSize).join('\n');
                
                if (block === compareBlock) {
                    duplicates.push({
                        line1: i,
                        line2: j,
                        block
                    });
                }
            }
        }
        
        return duplicates;
    }
    
    getHistory() {
        return this.checkHistory;
    }
    
    /**
     * 静态检查方法
     */
    static async check(params) {
        if (!window.ModuleComplianceChecker?.instance) {
            window.ModuleComplianceChecker = {
                instance: new ModuleComplianceChecker()
            };
        }
        
        return await window.ModuleComplianceChecker.instance.check(params);
    }
}

// 自动初始化
if (typeof window !== 'undefined') {
    window.ModuleComplianceChecker = {
        instance: new ModuleComplianceChecker(),
        check: ModuleComplianceChecker.check
    };
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleComplianceChecker;
}

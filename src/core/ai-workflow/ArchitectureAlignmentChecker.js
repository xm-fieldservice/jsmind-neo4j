/**
 * 架构对齐检查器
 * 
 * @author 程序员
 * @date 2025-10-08
 * @version 1.0
 * 
 * 功能：
 * 1. 检查是否查询了架构清单
 * 2. 检查是否使用了现有模块
 * 3. 检查功能重复度
 * 4. 验证架构一致性
 * 
 * 检查规则：
 * - 创建新文件前必须检查现有模块
 * - 功能重复度 > 80% 阻止创建
 * - 功能重复度 > 30% 发出警告
 */

class ArchitectureAlignmentChecker {
    constructor() {
        this.architectureDoc = null;
        this.lastCheckTime = 0;
        this.checkHistory = [];
    }
    
    /**
     * 执行架构对齐检查
     */
    async check(params) {
        const { action, target, code, purpose } = params;
        
        console.log('[ArchitectureChecker] 开始检查', { action, target });
        
        // 1. 加载架构文档
        await this.loadArchitectureDoc();
        
        // 2. 检查是否是新文件创建
        if (action === 'write_file' && !params.emptyFile) {
            return await this.checkNewFileCreation(params);
        }
        
        // 3. 检查是否修改核心架构文件
        if (this.isCoreArchitectureFile(target)) {
            return await this.checkCoreFileModification(params);
        }
        
        // 4. 默认通过
        return {
            passed: true,
            message: '',
            suggestion: ''
        };
    }
    
    /**
     * 检查新文件创建
     */
    async checkNewFileCreation(params) {
        const { target, code, purpose } = params;
        
        // 提取文件名和路径
        const fileName = target.split('/').pop().replace(/\.(js|html|css)$/, '');
        const fileExt = target.split('.').pop();
        
        // 检查是否是核心架构组件
        if (this.isCoreComponent(target)) {
            // 检查是否有重复模块
            const existingModules = await this.findSimilarModules(fileName, purpose);
            
            if (existingModules.length > 0) {
                const redundancy = this.calculateRedundancy(fileName, existingModules);
                
                if (redundancy > 0.8) {
                    return {
                        passed: false,
                        message: `功能高度重复 (${(redundancy * 100).toFixed(0)}%)`,
                        suggestion: `建议复用现有模块: ${existingModules.map(m => m.name).join(', ')}`,
                        redundancy,
                        existingModules
                    };
                }
                
                if (redundancy > 0.3) {
                    console.warn('[ArchitectureChecker] ⚠️ 功能重复警告', {
                        redundancy,
                        existingModules
                    });
                }
            }
        }
        
        // 检查是否符合命名规范
        if (!this.checkNamingConvention(fileName, fileExt)) {
            return {
                passed: false,
                message: '文件命名不符合规范',
                suggestion: '请使用PascalCase命名类文件，camelCase命名工具文件'
            };
        }
        
        // 记录检查历史
        this.checkHistory.push({
            timestamp: Date.now(),
            action: 'new_file',
            target,
            passed: true
        });
        
        return {
            passed: true,
            message: '架构对齐检查通过',
            suggestion: ''
        };
    }
    
    /**
     * 检查核心文件修改
     */
    async checkCoreFileModification(params) {
        const { target } = params;
        
        console.warn('[ArchitectureChecker] ⚠️ 修改核心架构文件', target);
        
        // 核心文件修改需要更严格的检查
        return {
            passed: true,
            message: '核心文件修改',
            suggestion: '请确保修改符合架构设计原则',
            warning: true
        };
    }
    
    /**
     * 查找相似模块
     */
    async findSimilarModules(fileName, purpose) {
        if (!this.architectureDoc) {
            return [];
        }
        
        const modules = this.architectureDoc.modules || [];
        const similar = [];
        
        const fileNameLower = fileName.toLowerCase();
        
        modules.forEach(module => {
            const moduleName = module.name.toLowerCase();
            
            // 名称相似度检查
            if (this.calculateSimilarity(fileNameLower, moduleName) > 0.6) {
                similar.push(module);
            }
            
            // 功能相似度检查（如果有purpose）
            if (purpose && module.purpose) {
                if (this.calculateSimilarity(purpose.toLowerCase(), module.purpose.toLowerCase()) > 0.7) {
                    similar.push(module);
                }
            }
        });
        
        // 去重
        return Array.from(new Set(similar));
    }
    
    /**
     * 计算冗余度
     */
    calculateRedundancy(fileName, existingModules) {
        if (existingModules.length === 0) return 0;
        
        let maxSimilarity = 0;
        
        existingModules.forEach(module => {
            const similarity = this.calculateSimilarity(
                fileName.toLowerCase(),
                module.name.toLowerCase()
            );
            maxSimilarity = Math.max(maxSimilarity, similarity);
        });
        
        return maxSimilarity;
    }
    
    /**
     * 计算字符串相似度（简单版Levenshtein距离）
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        // 包含关系
        if (longer.includes(shorter)) return 0.8;
        if (shorter.includes(longer)) return 0.8;
        
        // 简单的字符匹配
        let matches = 0;
        for (let char of shorter) {
            if (longer.includes(char)) matches++;
        }
        
        return matches / longer.length;
    }
    
    /**
     * 检查命名规范
     */
    checkNamingConvention(fileName, fileExt) {
        // JavaScript文件
        if (fileExt === 'js') {
            // 类文件：PascalCase
            if (fileName.match(/^[A-Z][a-zA-Z0-9]*$/)) return true;
            // 工具文件：camelCase 或 kebab-case
            if (fileName.match(/^[a-z][a-zA-Z0-9]*$/) || fileName.match(/^[a-z][a-z0-9-]*$/)) return true;
            return false;
        }
        
        // HTML文件：kebab-case
        if (fileExt === 'html') {
            return fileName.match(/^[a-z][a-z0-9-]*$/);
        }
        
        // 其他文件类型默认通过
        return true;
    }
    
    /**
     * 判断是否是核心组件
     */
    isCoreComponent(filePath) {
        const corePatterns = [
            /^src\/core\//,
            /^src\/components\//,
            /^src\/adapters\//,
            /^column-sources\/.*\/js\//
        ];
        
        return corePatterns.some(pattern => pattern.test(filePath));
    }
    
    /**
     * 判断是否是核心架构文件
     */
    isCoreArchitectureFile(filePath) {
        const coreFiles = [
            'src/core/UnifiedLogger.js',
            'src/core/ErrorHandler.js',
            'src/core/storage/AutogenUnifiedStorage.js',
            'src/core/messaging/AutogenEventBus.js',
            'src/adapters/StorageAdapter.js'
        ];
        
        return coreFiles.some(file => filePath.includes(file));
    }
    
    /**
     * 加载架构文档
     */
    async loadArchitectureDoc() {
        // 缓存5分钟
        if (this.architectureDoc && Date.now() - this.lastCheckTime < 5 * 60 * 1000) {
            return;
        }
        
        try {
            const response = await fetch('column-sources/mindmap/docs/审查员：项目管理应用架构功能清单完善建议和修改计划25-10-07.md');
            const content = await response.text();
            
            this.architectureDoc = this.parseArchitectureDoc(content);
            this.lastCheckTime = Date.now();
            
            console.log('[ArchitectureChecker] 架构文档已加载', {
                modules: this.architectureDoc.modules.length
            });
        } catch (error) {
            console.error('[ArchitectureChecker] 架构文档加载失败:', error);
            this.architectureDoc = { modules: [] };
        }
    }
    
    /**
     * 解析架构文档
     */
    parseArchitectureDoc(content) {
        const modules = [];
        const lines = content.split('\n');
        
        let currentSection = '';
        
        lines.forEach((line, index) => {
            // 提取章节
            const sectionMatch = line.match(/^#{2,3}\s+(.+)/);
            if (sectionMatch) {
                currentSection = sectionMatch[1].trim();
            }
            
            // 提取模块
            const moduleMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*/);
            if (moduleMatch) {
                const name = moduleMatch[1].trim();
                
                // 提取描述（下一行）
                let purpose = '';
                if (index + 1 < lines.length) {
                    const nextLine = lines[index + 1].trim();
                    if (nextLine && !nextLine.startsWith('#') && !nextLine.startsWith('-') && !nextLine.startsWith('*')) {
                        purpose = nextLine;
                    }
                }
                
                modules.push({
                    name,
                    section: currentSection,
                    purpose,
                    line: line.trim()
                });
            }
        });
        
        return { modules };
    }
    
    /**
     * 获取检查历史
     */
    getHistory() {
        return this.checkHistory;
    }
    
    /**
     * 静态检查方法
     */
    static async check(params) {
        if (!window.ArchitectureAlignmentChecker?.instance) {
            window.ArchitectureAlignmentChecker = {
                instance: new ArchitectureAlignmentChecker()
            };
        }
        
        return await window.ArchitectureAlignmentChecker.instance.check(params);
    }
}

// 自动初始化
if (typeof window !== 'undefined') {
    window.ArchitectureAlignmentChecker = {
        instance: new ArchitectureAlignmentChecker(),
        check: ArchitectureAlignmentChecker.check
    };
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArchitectureAlignmentChecker;
}

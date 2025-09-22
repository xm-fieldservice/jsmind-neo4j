/**
 * SimpleDataValidator - 简化的数据验证器
 * 只验证，不自动修复
 * 
 * 设计原则：
 * - 只验证数据结构，不自动修复
 * - 提供清晰的问题报告
 * - 让用户决定如何处理数据问题
 * - 适用于外部JSON读入场景
 */
class SimpleDataValidator {
    constructor() {
        console.log('[SimpleValidator] 初始化完成');
    }
    
    /**
     * 验证脑图数据
     * @param {Object} mindmapData - 脑图数据对象
     * @returns {Object} - 验证结果
     */
    validateMindmap(mindmapData) {
        const result = {
            valid: true,
            issues: [],
            warnings: [],
            summary: ''
        };
        
        // 基本存在性检查
        if (!mindmapData) {
            result.valid = false;
            result.issues.push('数据为空或未定义');
            result.summary = '数据完全缺失';
            return result;
        }
        
        // 检查顶层结构
        this._validateTopLevel(mindmapData, result);
        
        // 检查数据对象
        if (mindmapData.data) {
            this._validateDataObject(mindmapData.data, result);
        } else {
            result.valid = false;
            result.issues.push('缺少data对象');
        }
        
        // 生成摘要
        this._generateSummary(result);
        
        return result;
    }
    
    /**
     * 验证项目目录数据
     * @param {Array} projectsData - 项目数组
     * @returns {Object} - 验证结果
     */
    validateProjects(projectsData) {
        const result = {
            valid: true,
            issues: [],
            warnings: [],
            summary: ''
        };
        
        if (!Array.isArray(projectsData)) {
            result.valid = false;
            result.issues.push('项目数据不是数组格式');
            result.summary = '项目数据格式错误';
            return result;
        }
        
        // 检查每个项目
        for (let i = 0; i < projectsData.length; i++) {
            const project = projectsData[i];
            this._validateProject(project, i, result);
        }
        
        // 检查重复ID
        this._checkDuplicateProjectIds(projectsData, result);
        
        // 生成摘要
        this._generateSummary(result);
        
        return result;
    }
    
    /**
     * 验证顶层结构
     * @param {Object} data - 数据对象
     * @param {Object} result - 结果对象
     */
    _validateTopLevel(data, result) {
        // 检查format字段
        if (!data.format) {
            result.issues.push('缺少format字段');
        } else if (data.format !== 'node_tree') {
            result.warnings.push(`format字段值为"${data.format}"，期望为"node_tree"`);
        }
        
        // 检查其他可能的顶层字段
        if (data.meta) {
            this._validateMeta(data.meta, result);
        }
    }
    
    /**
     * 验证元数据
     * @param {Object} meta - 元数据对象
     * @param {Object} result - 结果对象
     */
    _validateMeta(meta, result) {
        if (meta.mind_id && typeof meta.mind_id !== 'string') {
            result.warnings.push('meta.mind_id不是字符串类型');
        }
        
        if (meta.saved_at && !this._isValidDate(meta.saved_at)) {
            result.warnings.push('meta.saved_at不是有效的日期格式');
        }
    }
    
    /**
     * 验证数据对象（根节点）
     * @param {Object} dataObj - 数据对象
     * @param {Object} result - 结果对象
     */
    _validateDataObject(dataObj, result) {
        // 检查根节点ID
        if (!dataObj.id) {
            result.valid = false;
            result.issues.push('根节点缺少id字段');
        } else if (typeof dataObj.id !== 'string') {
            result.issues.push('根节点id不是字符串类型');
        }
        
        // 检查根节点标题
        if (!dataObj.topic && !dataObj.label) {
            result.issues.push('根节点缺少topic或label字段');
        } else {
            if (dataObj.topic && typeof dataObj.topic !== 'string') {
                result.issues.push('根节点topic不是字符串类型');
            }
            if (dataObj.label && typeof dataObj.label !== 'string') {
                result.issues.push('根节点label不是字符串类型');
            }
        }
        
        // 检查children数组
        if (dataObj.children !== undefined) {
            if (!Array.isArray(dataObj.children)) {
                result.valid = false;
                result.issues.push('根节点children不是数组类型');
            } else {
                this._validateNodesRecursive(dataObj.children, result, '根节点');
            }
        }
        
        // 检查内容一致性
        this._checkContentConsistency(dataObj, result, '根节点');
    }
    
    /**
     * 递归验证节点数组
     * @param {Array} nodes - 节点数组
     * @param {Object} result - 结果对象
     * @param {string} parentPath - 父节点路径
     */
    _validateNodesRecursive(nodes, result, parentPath) {
        if (!Array.isArray(nodes)) {
            result.issues.push(`${parentPath}的children不是数组类型`);
            return;
        }
        
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodePath = `${parentPath} > 子节点[${i}]`;
            
            this._validateSingleNode(node, result, nodePath);
            
            // 递归验证子节点
            if (node.children && Array.isArray(node.children)) {
                this._validateNodesRecursive(node.children, result, nodePath);
            }
        }
    }
    
    /**
     * 验证单个节点
     * @param {Object} node - 节点对象
     * @param {Object} result - 结果对象
     * @param {string} nodePath - 节点路径
     */
    _validateSingleNode(node, result, nodePath) {
        if (!node || typeof node !== 'object') {
            result.issues.push(`${nodePath}不是有效的对象`);
            return;
        }
        
        // 检查节点ID
        if (!node.id) {
            result.issues.push(`${nodePath}缺少id字段`);
        } else if (typeof node.id !== 'string') {
            result.issues.push(`${nodePath}的id不是字符串类型`);
        }
        
        // 检查节点标题
        if (!node.topic && !node.label) {
            result.issues.push(`${nodePath}缺少topic或label字段`);
        }
        
        // 检查children类型
        if (node.children !== undefined && !Array.isArray(node.children)) {
            result.issues.push(`${nodePath}的children不是数组类型`);
        }
        
        // 检查内容一致性
        this._checkContentConsistency(node, result, nodePath);
    }
    
    /**
     * 检查内容一致性
     * @param {Object} node - 节点对象
     * @param {Object} result - 结果对象
     * @param {string} nodePath - 节点路径
     */
    _checkContentConsistency(node, result, nodePath) {
        const hasContent = node.content && typeof node.content === 'string';
        const hasDataContent = node.data && node.data.content && typeof node.data.content === 'string';
        
        if (hasContent && hasDataContent) {
            if (node.content !== node.data.content) {
                result.warnings.push(`${nodePath}的content和data.content不一致`);
            }
        } else if (hasContent && !hasDataContent) {
            result.warnings.push(`${nodePath}有content但缺少data.content`);
        } else if (!hasContent && hasDataContent) {
            result.warnings.push(`${nodePath}有data.content但缺少content`);
        }
    }
    
    /**
     * 验证单个项目
     * @param {Object} project - 项目对象
     * @param {number} index - 项目索引
     * @param {Object} result - 结果对象
     */
    _validateProject(project, index, result) {
        const projectPath = `项目[${index}]`;
        
        if (!project || typeof project !== 'object') {
            result.issues.push(`${projectPath}不是有效的对象`);
            return;
        }
        
        // 检查必需字段
        if (!project.id) {
            result.issues.push(`${projectPath}缺少id字段`);
        }
        
        if (!project.name) {
            result.issues.push(`${projectPath}缺少name字段`);
        }
        
        // 检查payload
        if (!project.payload) {
            result.issues.push(`${projectPath}缺少payload字段`);
        } else if (typeof project.payload !== 'object') {
            result.issues.push(`${projectPath}的payload不是对象类型`);
        }
        
        // 检查时间戳
        if (project.createdAt && !this._isValidTimestamp(project.createdAt)) {
            result.warnings.push(`${projectPath}的createdAt不是有效的时间戳`);
        }
        
        if (project.updatedAt && !this._isValidTimestamp(project.updatedAt)) {
            result.warnings.push(`${projectPath}的updatedAt不是有效的时间戳`);
        }
    }
    
    /**
     * 检查项目ID重复
     * @param {Array} projects - 项目数组
     * @param {Object} result - 结果对象
     */
    _checkDuplicateProjectIds(projects, result) {
        const idMap = new Map();
        
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            if (project.id) {
                if (idMap.has(project.id)) {
                    const firstIndex = idMap.get(project.id);
                    result.issues.push(`项目ID"${project.id}"重复，出现在索引${firstIndex}和${i}`);
                } else {
                    idMap.set(project.id, i);
                }
            }
        }
    }
    
    /**
     * 生成验证摘要
     * @param {Object} result - 结果对象
     */
    _generateSummary(result) {
        const issueCount = result.issues.length;
        const warningCount = result.warnings.length;
        
        if (issueCount === 0 && warningCount === 0) {
            result.summary = '数据验证通过，没有发现问题';
        } else if (issueCount === 0) {
            result.summary = `数据基本有效，但有${warningCount}个警告`;
        } else {
            result.summary = `数据验证失败，发现${issueCount}个错误`;
            if (warningCount > 0) {
                result.summary += `和${warningCount}个警告`;
            }
        }
    }
    
    /**
     * 检查是否为有效日期
     * @param {*} dateValue - 日期值
     * @returns {boolean} - 是否有效
     */
    _isValidDate(dateValue) {
        if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            return !isNaN(date.getTime());
        }
        return false;
    }
    
    /**
     * 检查是否为有效时间戳
     * @param {*} timestamp - 时间戳值
     * @returns {boolean} - 是否有效
     */
    _isValidTimestamp(timestamp) {
        if (typeof timestamp === 'number') {
            return timestamp > 0 && timestamp < Date.now() + 86400000; // 不能超过明天
        }
        if (typeof timestamp === 'string') {
            const num = parseInt(timestamp, 10);
            return !isNaN(num) && num > 0;
        }
        return false;
    }
    
    /**
     * 打印验证结果
     * @param {Object} validationResult - 验证结果
     */
    printValidationResult(validationResult) {
        console.log(`[SimpleValidator] ${validationResult.summary}`);
        
        if (validationResult.issues.length > 0) {
            console.error('[SimpleValidator] 错误列表:');
            validationResult.issues.forEach((issue, index) => {
                console.error(`  ${index + 1}. ${issue}`);
            });
        }
        
        if (validationResult.warnings.length > 0) {
            console.warn('[SimpleValidator] 警告列表:');
            validationResult.warnings.forEach((warning, index) => {
                console.warn(`  ${index + 1}. ${warning}`);
            });
        }
    }
}

// 创建单例
const simpleValidator = new SimpleDataValidator();

// 导出
export default simpleValidator;

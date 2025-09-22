/**
 * DefaultStorageTypes - 默认存储类型定义
 * 预定义常用的存储类型和Schema
 */

/**
 * 脑图存储类型配置
 */
export const MINDMAP_TYPE = {
    name: 'mindmap',
    schema: {
        properties: {
            id: { type: 'string', required: true },
            format: { type: 'string', required: true, enum: ['node_tree', 'node_array', 'freemind'] },
            data: { type: 'object', required: true },
            meta: { type: 'object' }
        },
        required: ['id', 'format', 'data']
    },
    options: {
        version: '1.1',
        migrations: [
            {
                from: '1.0',
                to: '1.1',
                transform: (item) => {
                    // 从1.0到1.1的迁移：确保format字段存在
                    if (!item.data.format) {
                        item.data.format = 'node_tree';
                    }
                    
                    // 确保meta字段存在
                    if (!item.data.meta) {
                        item.data.meta = {
                            mind_id: item._meta.id,
                            format_version: 1,
                            saved_at: item._meta.storedAt,
                            source: 'migration'
                        };
                    }
                    
                    return item;
                }
            }
        ],
        validator: (data) => {
            const errors = [];
            
            // 验证data字段结构
            if (data.data && !data.data.id) {
                errors.push('脑图数据必须包含根节点ID');
            }
            
            if (data.data && !data.data.topic && !data.data.label) {
                errors.push('脑图根节点必须有标题');
            }
            
            // 验证节点结构
            if (data.data && data.data.children) {
                const nodeErrors = validateMindmapNodes(data.data.children);
                errors.push(...nodeErrors);
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }
    }
};

/**
 * 项目存储类型配置
 */
export const PROJECT_TYPE = {
    name: 'project',
    schema: {
        properties: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true },
            status: { type: 'string', enum: ['active', 'completed', 'paused', 'archived'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            tags: { type: 'array' },
            payload: { type: 'object' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        },
        required: ['id', 'name']
    },
    options: {
        version: '1.0',
        migrations: [],
        validator: (data) => {
            const errors = [];
            
            if (data.name && data.name.trim().length === 0) {
                errors.push('项目名称不能为空');
            }
            
            if (data.status && !['active', 'completed', 'paused', 'archived'].includes(data.status)) {
                errors.push('项目状态值无效');
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }
    }
};

/**
 * 设置存储类型配置
 */
export const SETTINGS_TYPE = {
    name: 'settings',
    schema: {
        properties: {
            category: { type: 'string', required: true },
            key: { type: 'string', required: true },
            value: { type: 'string' },
            type: { type: 'string', enum: ['string', 'number', 'boolean', 'object'] },
            description: { type: 'string' }
        },
        required: ['category', 'key']
    },
    options: {
        version: '1.0',
        migrations: [],
        validator: (data) => {
            const errors = [];
            
            if (data.category && data.category.trim().length === 0) {
                errors.push('设置分类不能为空');
            }
            
            if (data.key && data.key.trim().length === 0) {
                errors.push('设置键名不能为空');
            }
            
            // 验证值类型
            if (data.type && data.value !== undefined) {
                const valueType = typeof data.value;
                if (data.type === 'number' && valueType !== 'number') {
                    errors.push('设置值类型与声明类型不匹配');
                }
                if (data.type === 'boolean' && valueType !== 'boolean') {
                    errors.push('设置值类型与声明类型不匹配');
                }
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }
    }
};

/**
 * 缓存存储类型配置
 */
export const CACHE_TYPE = {
    name: 'cache',
    schema: {
        properties: {
            key: { type: 'string', required: true },
            value: { type: 'string', required: true },
            ttl: { type: 'number' },
            tags: { type: 'array' }
        },
        required: ['key', 'value']
    },
    options: {
        version: '1.0',
        migrations: [],
        validator: (data) => {
            const errors = [];
            
            if (data.ttl && (typeof data.ttl !== 'number' || data.ttl <= 0)) {
                errors.push('TTL必须是正数');
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }
    }
};

/**
 * 验证脑图节点结构
 * @param {Array} nodes - 节点数组
 * @returns {Array} - 错误列表
 */
function validateMindmapNodes(nodes) {
    const errors = [];
    
    if (!Array.isArray(nodes)) {
        errors.push('children必须是数组');
        return errors;
    }
    
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (!node.id) {
            errors.push(`节点[${i}]缺少ID`);
        }
        
        if (!node.topic && !node.label) {
            errors.push(`节点[${i}]缺少标题`);
        }
        
        // 递归验证子节点
        if (node.children && Array.isArray(node.children)) {
            const childErrors = validateMindmapNodes(node.children);
            errors.push(...childErrors.map(err => `节点[${i}].${err}`));
        }
    }
    
    return errors;
}

/**
 * 注册所有默认存储类型
 * @param {StorageRegistry} registry - 存储注册中心
 * @returns {Object} - 注册结果统计
 */
export function registerDefaultTypes(registry) {
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    const types = [MINDMAP_TYPE, PROJECT_TYPE, SETTINGS_TYPE, CACHE_TYPE];
    
    for (const type of types) {
        try {
            const success = registry.register(type.name, type.schema, type.options);
            if (success) {
                results.success++;
                console.log(`[DefaultStorageTypes] ✅ 注册 ${type.name} 类型成功`);
            } else {
                results.failed++;
                results.errors.push(`注册 ${type.name} 类型失败`);
            }
        } catch (error) {
            results.failed++;
            results.errors.push(`注册 ${type.name} 类型异常: ${error.message}`);
            console.error(`[DefaultStorageTypes] 注册 ${type.name} 类型异常:`, error);
        }
    }
    
    console.log(`[DefaultStorageTypes] 默认类型注册完成: 成功 ${results.success}, 失败 ${results.failed}`);
    return results;
}

/**
 * 获取所有默认类型的配置
 * @returns {Array} - 类型配置数组
 */
export function getDefaultTypes() {
    return [MINDMAP_TYPE, PROJECT_TYPE, SETTINGS_TYPE, CACHE_TYPE];
}

/**
 * 根据名称获取默认类型配置
 * @param {string} typeName - 类型名称
 * @returns {Object|null} - 类型配置或null
 */
export function getDefaultType(typeName) {
    const types = getDefaultTypes();
    return types.find(type => type.name === typeName) || null;
}

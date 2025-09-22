/**
 * StorageRegistry - 存储注册中心
 * 基于Schema的注册式localStorage管理系统
 * 
 * 核心特性：
 * - Schema驱动的类型定义
 * - 版本控制和数据迁移
 * - 类型安全验证
 * - 统一的存储格式
 */

/**
 * @typedef {Object} StorageSchema
 * @property {Object} properties - 数据属性定义
 * @property {Array<string>} required - 必需字段
 * @property {string} version - Schema版本
 */

/**
 * @typedef {Object} StorageTypeConfig
 * @property {StorageSchema} schema - 数据Schema
 * @property {string} version - 当前版本
 * @property {Array<Migration>} migrations - 迁移规则
 * @property {Function} validator - 自定义验证器
 */

/**
 * @typedef {Object} Migration
 * @property {string} from - 源版本
 * @property {string} to - 目标版本
 * @property {Function} transform - 转换函数
 */

class StorageRegistry {
    constructor() {
        this.registry = new Map(); // type -> StorageTypeConfig
        this.versions = new Map();  // type -> version history
        
        console.log('[StorageRegistry] 存储注册中心初始化');
    }

    /**
     * 注册新的存储类型
     * @param {string} type - 存储类型名称
     * @param {StorageSchema} schema - 数据Schema
     * @param {Object} options - 配置选项
     * @param {string} options.version - 版本号
     * @param {Array<Migration>} options.migrations - 迁移规则
     * @param {Function} options.validator - 自定义验证器
     * @returns {boolean} - 注册是否成功
     */
    register(type, schema, options = {}) {
        try {
            // 验证输入参数
            if (!type || typeof type !== 'string') {
                throw new Error('存储类型名称必须是非空字符串');
            }

            if (!schema || typeof schema !== 'object') {
                throw new Error('Schema必须是对象');
            }

            // 检查重复注册
            if (this.registry.has(type)) {
                console.warn(`[StorageRegistry] 存储类型 "${type}" 已存在，将被覆盖`);
            }

            // 构建完整配置
            const config = {
                schema: this._normalizeSchema(schema),
                version: options.version || '1.0',
                migrations: options.migrations || [],
                validator: options.validator || null,
                registeredAt: new Date().toISOString()
            };

            // 验证迁移规则
            this._validateMigrations(config.migrations);

            // 注册类型
            this.registry.set(type, config);

            // 记录版本历史
            if (!this.versions.has(type)) {
                this.versions.set(type, []);
            }
            this.versions.get(type).push({
                version: config.version,
                registeredAt: config.registeredAt
            });

            console.log(`[StorageRegistry] ✅ 存储类型 "${type}" 注册成功 (版本: ${config.version})`);
            return true;

        } catch (error) {
            console.error(`[StorageRegistry] 注册存储类型 "${type}" 失败:`, error);
            return false;
        }
    }

    /**
     * 获取存储类型的配置
     * @param {string} type - 存储类型名称
     * @returns {StorageTypeConfig|null} - 类型配置
     */
    getSchema(type) {
        const config = this.registry.get(type);
        if (!config) {
            console.warn(`[StorageRegistry] 存储类型 "${type}" 未注册`);
            return null;
        }
        return config;
    }

    /**
     * 检查类型是否已注册
     * @param {string} type - 存储类型名称
     * @returns {boolean} - 是否已注册
     */
    isRegistered(type) {
        return this.registry.has(type);
    }

    /**
     * 列出所有注册的类型
     * @returns {Array<string>} - 存储类型名称列表
     */
    listTypes() {
        return Array.from(this.registry.keys());
    }

    /**
     * 获取类型的版本历史
     * @param {string} type - 存储类型名称
     * @returns {Array<Object>} - 版本历史
     */
    getVersionHistory(type) {
        return this.versions.get(type) || [];
    }

    /**
     * 注销存储类型
     * @param {string} type - 存储类型名称
     * @returns {boolean} - 注销是否成功
     */
    unregister(type) {
        try {
            if (!this.registry.has(type)) {
                console.warn(`[StorageRegistry] 存储类型 "${type}" 不存在`);
                return false;
            }

            this.registry.delete(type);
            this.versions.delete(type);

            console.log(`[StorageRegistry] ✅ 存储类型 "${type}" 已注销`);
            return true;

        } catch (error) {
            console.error(`[StorageRegistry] 注销存储类型 "${type}" 失败:`, error);
            return false;
        }
    }

    /**
     * 验证数据是否符合Schema
     * @param {string} type - 存储类型
     * @param {*} data - 要验证的数据
     * @returns {Object} - 验证结果 {valid: boolean, errors: Array}
     */
    validateData(type, data) {
        const config = this.getSchema(type);
        if (!config) {
            return {
                valid: false,
                errors: [`存储类型 "${type}" 未注册`]
            };
        }

        const errors = [];

        try {
            // 基础Schema验证
            const schemaErrors = this._validateAgainstSchema(data, config.schema);
            errors.push(...schemaErrors);

            // 自定义验证器
            if (config.validator && typeof config.validator === 'function') {
                const customResult = config.validator(data);
                if (customResult && !customResult.valid) {
                    errors.push(...(customResult.errors || ['自定义验证失败']));
                }
            }

        } catch (error) {
            errors.push(`验证过程异常: ${error.message}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取注册中心统计信息
     * @returns {Object} - 统计信息
     */
    getStats() {
        const stats = {
            totalTypes: this.registry.size,
            types: {},
            registryHealth: 'healthy'
        };

        for (const [type, config] of this.registry) {
            stats.types[type] = {
                version: config.version,
                migrationsCount: config.migrations.length,
                hasValidator: !!config.validator,
                registeredAt: config.registeredAt
            };
        }

        return stats;
    }

    /**
     * 标准化Schema格式
     * @private
     */
    _normalizeSchema(schema) {
        return {
            properties: schema.properties || {},
            required: schema.required || [],
            version: schema.version || '1.0'
        };
    }

    /**
     * 验证迁移规则
     * @private
     */
    _validateMigrations(migrations) {
        for (const migration of migrations) {
            if (!migration.from || !migration.to || !migration.transform) {
                throw new Error('迁移规则必须包含 from, to, transform 字段');
            }

            if (typeof migration.transform !== 'function') {
                throw new Error('迁移的 transform 必须是函数');
            }
        }
    }

    /**
     * 根据Schema验证数据
     * @private
     */
    _validateAgainstSchema(data, schema) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            errors.push('数据必须是对象');
            return errors;
        }

        // 检查必需字段
        for (const field of schema.required || []) {
            if (!(field in data)) {
                errors.push(`缺少必需字段: ${field}`);
            }
        }

        // 检查字段类型
        for (const [field, definition] of Object.entries(schema.properties || {})) {
            if (field in data) {
                const fieldErrors = this._validateField(field, data[field], definition);
                errors.push(...fieldErrors);
            }
        }

        return errors;
    }

    /**
     * 验证单个字段
     * @private
     */
    _validateField(fieldName, value, definition) {
        const errors = [];

        if (definition.type) {
            const expectedType = definition.type;
            const actualType = Array.isArray(value) ? 'array' : typeof value;

            if (actualType !== expectedType) {
                errors.push(`字段 "${fieldName}" 类型错误: 期望 ${expectedType}, 实际 ${actualType}`);
            }
        }

        if (definition.enum && !definition.enum.includes(value)) {
            errors.push(`字段 "${fieldName}" 值不在允许范围内: ${definition.enum.join(', ')}`);
        }

        if (definition.required && (value === null || value === undefined)) {
            errors.push(`字段 "${fieldName}" 是必需的`);
        }

        return errors;
    }
}

// 导出
export default StorageRegistry;

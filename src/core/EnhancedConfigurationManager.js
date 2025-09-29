/**
 * EnhancedConfigurationManager.js - 增强配置管理器
 * 提供高级配置管理功能，包含配置验证、缓存和环境检测
 */
class EnhancedConfigurationManager {
    constructor() {
        this.configs = new Map();
        this.cache = new Map();
        this.environment = this.detectEnvironment();
        this.initialized = false;
    }

    /**
     * 检测当前运行环境
     */
    detectEnvironment() {
        // 检测是否在Electron环境中
        const isElectron = typeof window !== 'undefined' && window.process && window.process.type;

        // 检测是否在Node.js环境中
        const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

        // 检测是否在浏览器环境中
        const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

        return {
            isElectron,
            isNode,
            isBrowser,
            platform: isNode ? process.platform : (isBrowser ? 'browser' : 'unknown'),
            version: isNode ? process.version : (isBrowser ? window.navigator.userAgent : 'unknown')
        };
    }

    /**
     * 初始化配置管理器
     */
    async initialize() {
        try {
            console.log('[EnhancedConfigurationManager] 开始初始化...');

            // 加载默认配置
            await this.loadDefaultConfigurations();

            // 验证配置完整性
            await this.validateConfigurations();

            this.initialized = true;
            console.log('[EnhancedConfigurationManager] ✅ 初始化完成');
            return true;

        } catch (error) {
            console.error('[EnhancedConfigurationManager] 初始化失败:', error);
            return false;
        }
    }

    /**
     * 加载默认配置
     */
    async loadDefaultConfigurations() {
        const defaultConfigs = {
            system: {
                name: 'Project Manager',
                version: '2.0.0',
                debug: false,
                logLevel: 'info'
            },
            storage: {
                defaultProvider: 'AutogenUnifiedStorage',
                cacheEnabled: true,
                syncInterval: 5000
            },
            ui: {
                theme: 'light',
                animations: true,
                autoSave: true
            },
            api: {
                baseUrl: 'http://localhost:8081',
                timeout: 10000,
                retryCount: 3
            }
        };

        for (const [category, config] of Object.entries(defaultConfigs)) {
            this.configs.set(category, config);
        }
    }

    /**
     * 验证配置完整性
     */
    async validateConfigurations() {
        const requiredCategories = ['system', 'storage', 'ui', 'api'];
        const missing = [];

        for (const category of requiredCategories) {
            if (!this.configs.has(category)) {
                missing.push(category);
            }
        }

        if (missing.length > 0) {
            throw new Error(`缺少必需的配置类别: ${missing.join(', ')}`);
        }

        console.log('[EnhancedConfigurationManager] 配置验证通过');
    }

    /**
     * 获取指定类别的配置
     */
    getConfig(category, key = null) {
        if (!this.configs.has(category)) {
            console.warn(`[EnhancedConfigurationManager] 配置类别 '${category}' 不存在`);
            return null;
        }

        const config = this.configs.get(category);

        if (key) {
            return config[key] || null;
        }

        return config;
    }

    /**
     * 获取API配置的便捷方法
     */
    async getApiConfig() {
        return this.getConfig('api') || {};
    }

    /**
     * 设置配置值
     */
    setConfig(category, key, value) {
        if (!this.configs.has(category)) {
            this.configs.set(category, {});
        }

        const config = this.configs.get(category);
        config[key] = value;

        // 清除相关缓存
        this.clearCache(category, key);

        console.log(`[EnhancedConfigurationManager] 设置配置 ${category}.${key} = ${value}`);
    }

    /**
     * 清除缓存
     */
    clearCache(category = null, key = null) {
        if (category && key) {
            const cacheKey = `${category}:${key}`;
            this.cache.delete(cacheKey);
        } else if (category) {
            // 清除整个类别的缓存
            for (const cacheKey of this.cache.keys()) {
                if (cacheKey.startsWith(`${category}:`)) {
                    this.cache.delete(cacheKey);
                }
            }
        } else {
            // 清除所有缓存
            this.cache.clear();
        }
    }

    /**
     * 获取带缓存的配置
     */
    getCachedConfig(category, key, ttl = 30000) {
        const cacheKey = `${category}:${key}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < ttl) {
                return cached.value;
            }
        }

        const value = this.getConfig(category, key);

        // 缓存结果
        this.cache.set(cacheKey, {
            value,
            timestamp: Date.now()
        });

        return value;
    }

    /**
     * 获取所有配置
     */
    getAllConfigs() {
        const result = {};
        for (const [category, config] of this.configs) {
            result[category] = { ...config };
        }
        return result;
    }

    /**
     * 导出配置到JSON
     */
    exportConfig() {
        return {
            timestamp: new Date().toISOString(),
            environment: this.environment,
            configs: this.getAllConfigs()
        };
    }

    /**
     * 从JSON导入配置
     */
    importConfig(configData) {
        try {
            if (configData.configs) {
                for (const [category, config] of Object.entries(configData.configs)) {
                    this.configs.set(category, config);
                }
            }

            // 清除所有缓存
            this.cache.clear();

            console.log('[EnhancedConfigurationManager] 配置导入成功');
            return true;
        } catch (error) {
            console.error('[EnhancedConfigurationManager] 配置导入失败:', error);
            return false;
        }
    }

    /**
     * 获取状态（供测试）
     */
    getStatus() {
        return {
            initialized: this.initialized,
            cacheSize: this.cache.size,
            configCount: this.configs.size,
            environment: this.environment
        };
    }
}

// 全局实例
if (typeof window !== 'undefined') {
    window.EnhancedConfigurationManager = new EnhancedConfigurationManager();
}

console.log('[EnhancedConfigurationManager] 模块加载完成');

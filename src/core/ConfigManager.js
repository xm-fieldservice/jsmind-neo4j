/**
 * 配置管理器 - 基于AutogenUnifiedStorage的轻量包装
 * 复用度: 95% (仅5%新增包装逻辑)
 */

const ConfigManager = {
    /**
     * 获取配置值
     * @param {string} path - 配置路径 (如 'api.endpoints.neo4j')
     * @param {*} defaultValue - 默认值
     */
    async get(path, defaultValue = null) {
        const value = await AutogenUnifiedStorage.retrieve('app_state', `config.${path}`);
        return value !== null ? value : defaultValue;
    },

    /**
     * 设置配置值
     * @param {string} path - 配置路径
     * @param {*} value - 配置值
     * @param {string} layer - 配置层级 ('user'|'system'|'runtime')
     */
    async set(path, value, layer = 'user') {
        const success = await AutogenUnifiedStorage.store('app_state', `config.${path}`, value, { layer });
        if (success && typeof AutogenEventBus !== 'undefined') {
            AutogenEventBus.emit('config:changed', { path, value, layer });
        }
        return success;
    },

    /**
     * 获取API配置 (便捷方法)
     */
    async getApiConfig() {
        return await this.get('api', {
            neo4j: { url: 'bolt://localhost:7687', user: 'neo4j', password: 'password' },
            endpoints: { base: '/api/v1' }
        });
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.ConfigManager = ConfigManager;
}

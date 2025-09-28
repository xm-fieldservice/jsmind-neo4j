/**
 * DataUtils.js - 数据处理工具类
 * 
 * 职责：提供通用的数据处理工具方法
 * 架构层级：🛠️ 工具层 (Utility Layer)
 * 
 * Phase 6.2 优化：提取公共工具方法，避免代码重复
 */

class DataUtils {
    /**
     * 计算数据哈希值（用于变更检测）
     * @param {Object} data - 需要计算哈希的数据
     * @returns {string} 哈希值字符串
     */
    static calculateDataHash(data) {
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }
            return hash.toString(16);
        } catch (error) {
            console.warn('[DataUtils] 计算哈希值失败:', error);
            return 'hash_error_' + Date.now();
        }
    }

    /**
     * 深度克隆对象
     * @param {Object} obj - 需要克隆的对象
     * @returns {Object} 克隆后的对象
     */
    static deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('[DataUtils] 深度克隆失败:', error);
            return obj;
        }
    }

    /**
     * 验证数据结构
     * @param {Object} data - 需要验证的数据
     * @param {Array} requiredFields - 必需字段列表
     * @returns {boolean} 验证结果
     */
    static validateDataStructure(data, requiredFields = []) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        for (const field of requiredFields) {
            if (!(field in data)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 安全获取嵌套属性
     * @param {Object} obj - 对象
     * @param {string} path - 属性路径（如 'a.b.c'）
     * @param {*} defaultValue - 默认值
     * @returns {*} 属性值或默认值
     */
    static safeGet(obj, path, defaultValue = null) {
        try {
            const keys = path.split('.');
            let result = obj;
            
            for (const key of keys) {
                if (result && typeof result === 'object' && key in result) {
                    result = result[key];
                } else {
                    return defaultValue;
                }
            }
            
            return result;
        } catch (error) {
            return defaultValue;
        }
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小字符串
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 全局注册
if (typeof window !== 'undefined') {
    window.DataUtils = DataUtils;
}

export default DataUtils;

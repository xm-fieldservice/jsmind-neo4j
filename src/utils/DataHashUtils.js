/**
 * 数据哈希计算工具 - 统一框架工具
 * 消除重复的哈希计算实现
 */
class DataHashUtils {
    /**
     * 计算数据哈希值
     */
    static calculateDataHash(data) {
        try {
            if (!data) return '0';
            
            // 标准化数据格式
            const normalizedData = this.normalizeData(data);
            const str = JSON.stringify(normalizedData);
            
            // 使用简单但有效的哈希算法
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }
            
            return Math.abs(hash).toString(36); // 转换为36进制字符串
        } catch (error) {
            console.error('[DataHashUtils] 哈希计算失败:', error);
            return Date.now().toString(36);
        }
    }

    /**
     * 标准化数据格式，确保一致的哈希计算
     */
    static normalizeData(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.normalizeData(item));
        }
        
        // 对象键排序，确保一致性
        const normalized = {};
        const keys = Object.keys(data).sort();
        
        for (const key of keys) {
            // 跳过一些不影响内容的元数据
            if (key === 'timestamp' || key === 'lastModified' || key === '_temp') {
                continue;
            }
            normalized[key] = this.normalizeData(data[key]);
        }
        
        return normalized;
    }

    /**
     * 快速哈希计算（用于性能敏感场景）
     */
    static fastHash(str) {
        if (typeof str !== 'string') {
            str = JSON.stringify(str);
        }
        
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * 比较两个数据对象是否相同（基于哈希）
     */
    static isDataEqual(data1, data2) {
        try {
            const hash1 = this.calculateDataHash(data1);
            const hash2 = this.calculateDataHash(data2);
            return hash1 === hash2;
        } catch (error) {
            console.error('[DataHashUtils] 数据比较失败:', error);
            return false;
        }
    }

    /**
     * 获取数据大小（字节）
     */
    static getDataSize(data) {
        try {
            const str = JSON.stringify(data);
            return new Blob([str]).size;
        } catch (error) {
            console.error('[DataHashUtils] 数据大小计算失败:', error);
            return 0;
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataHashUtils;
} else if (typeof window !== 'undefined') {
    window.DataUtils = DataHashUtils; // 注册为全局DataUtils
}

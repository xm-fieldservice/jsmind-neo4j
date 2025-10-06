/**
 * 关系类型配置
 * 对齐Neo4j关系模型
 * 
 * @module relation-types
 * @description 定义脑图节点间的6种关系类型，包括符号、颜色、方向等配置
 */

/**
 * 关系类型枚举
 * @enum {string}
 */
export const RelationType = {
    RELATED_TO: 'RELATED_TO',
    STRONGLY_RELATED: 'STRONGLY_RELATED',
    INFLUENCES: 'INFLUENCES',
    STRONGLY_INFLUENCES: 'STRONGLY_INFLUENCES',
    CAUSED_BY: 'CAUSED_BY',
    STRONGLY_CAUSED_BY: 'STRONGLY_CAUSED_BY'
};

/**
 * 关系类型配置对象
 * @type {Object.<string, RelationConfig>}
 */
export const RELATION_TYPES = {
    /**
     * 关联关系 - 双向关联，说不清的关系
     */
    'RELATED_TO': {
        name: '关联关系',
        symbol: '⬌',
        unicode: '\u2B0C',
        bgColor: '#ffcccc',
        fgColor: '#000000',
        strength: 'normal',
        direction: 'both',
        neo4jType: 'RELATED_TO',
        description: '双向关联，说不清的关系'
    },
    
    /**
     * 强关联关系 - 双向强关联
     */
    'STRONGLY_RELATED': {
        name: '强关联关系',
        symbol: '⇔',
        unicode: '\u21D4',
        bgColor: '#ff9999',
        fgColor: '#000000',
        strength: 'strong',
        direction: 'both',
        neo4jType: 'STRONGLY_RELATED',
        description: '双向强关联'
    },
    
    /**
     * 出向关系 - 影响力推及
     */
    'INFLUENCES': {
        name: '出向关系',
        symbol: '⮕',
        unicode: '\u2B95',
        bgColor: '#ccffcc',
        fgColor: '#000000',
        strength: 'normal',
        direction: 'out',
        neo4jType: 'INFLUENCES',
        description: '影响力推及'
    },
    
    /**
     * 强出向关系 - 强影响力
     */
    'STRONGLY_INFLUENCES': {
        name: '强出向关系',
        symbol: '⮕⮕',
        unicode: '\u2B95\u2B95',
        bgColor: '#99ff99',
        fgColor: '#000000',
        strength: 'strong',
        direction: 'out',
        neo4jType: 'STRONGLY_INFLUENCES',
        description: '强影响力'
    },
    
    /**
     * 入向关系 - 因果逻辑决定
     */
    'CAUSED_BY': {
        name: '入向关系',
        symbol: '🔙',
        unicode: '\U0001F519',
        bgColor: '#ccccff',
        fgColor: '#000000',
        strength: 'normal',
        direction: 'in',
        neo4jType: 'CAUSED_BY',
        description: '因果逻辑决定'
    },
    
    /**
     * 强入向关系 - 强因果逻辑
     */
    'STRONGLY_CAUSED_BY': {
        name: '强入向关系',
        symbol: '🔙🔙',
        unicode: '\U0001F519\U0001F519',
        bgColor: '#9999ff',
        fgColor: '#000000',
        strength: 'strong',
        direction: 'in',
        neo4jType: 'STRONGLY_CAUSED_BY',
        description: '强因果逻辑'
    }
};

/**
 * 默认关系类型（用于拖拽和快捷键）
 * @type {string}
 */
export const DEFAULT_RELATION_TYPE = 'RELATED_TO';

/**
 * 获取关系类型配置
 * @param {string} relationType - 关系类型
 * @returns {RelationConfig|null} 关系配置对象
 */
export function getRelationConfig(relationType) {
    return RELATION_TYPES[relationType] || null;
}

/**
 * 验证关系类型是否有效
 * @param {string} relationType - 关系类型
 * @returns {boolean} 是否有效
 */
export function isValidRelationType(relationType) {
    return relationType in RELATION_TYPES;
}

/**
 * 获取所有关系类型列表
 * @returns {Array<string>} 关系类型数组
 */
export function getAllRelationTypes() {
    return Object.keys(RELATION_TYPES);
}

/**
 * 根据符号获取关系类型
 * @param {string} symbol - 关系符号
 * @returns {string|null} 关系类型
 */
export function getRelationTypeBySymbol(symbol) {
    for (const [type, config] of Object.entries(RELATION_TYPES)) {
        if (config.symbol === symbol) {
            return type;
        }
    }
    return null;
}

/**
 * 关系类型配置接口定义
 * @typedef {Object} RelationConfig
 * @property {string} name - 关系名称
 * @property {string} symbol - 显示符号
 * @property {string} unicode - Unicode编码
 * @property {string} bgColor - 背景颜色
 * @property {string} fgColor - 前景颜色
 * @property {string} strength - 关系强度 (normal|strong)
 * @property {string} direction - 关系方向 (both|out|in)
 * @property {string} neo4jType - Neo4j关系类型
 * @property {string} description - 描述
 */

console.log('[RelationTypes] 关系类型配置模块已加载');

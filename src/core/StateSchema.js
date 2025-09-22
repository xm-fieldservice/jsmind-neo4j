/**
 * 状态Schema定义
 * 阶段2.2：定义明确的状态结构和验证规则
 * 为Redux-like状态容器提供类型安全和数据验证
 */

/**
 * 脑图状态Schema
 */
export const MindmapStateSchema = {
    // 当前脑图信息
    current: {
        pid: null,              // 当前脑图PID
        title: '',              // 脑图标题
        nodeCount: 0,           // 节点数量
        lastModified: null,     // 最后修改时间
        hasUnsavedChanges: false // 是否有未保存的更改
    },
    
    // 脑图列表
    list: [],                   // 脑图项目列表
    
    // 选择状态
    selection: {
        selectedNodeId: null,   // 当前选中的节点ID
        selectedNodes: [],      // 多选节点列表
        focusedNodeId: null     // 聚焦的节点ID
    },
    
    // 视图状态
    view: {
        mode: 'full',           // 视图模式: 'full' | 'subtree' | 'filtered'
        zoomLevel: 1.0,         // 缩放级别
        centerPosition: { x: 0, y: 0 }, // 中心位置
        isEditing: false        // 是否处于编辑模式
    },
    
    // 缓存状态
    cache: {
        fullMindData: null,     // 全图数据缓存
        subtreeData: null,      // 子树数据缓存
        lastCacheTime: null     // 最后缓存时间
    }
};

/**
 * UI状态Schema
 */
export const UIStateSchema = {
    // 活动标签
    activeTab: 'mindmap',       // 'mindmap' | 'registry' | 'workspace' | 'relations'
    
    // 视图状态
    view: {
        sidebarCollapsed: false, // 侧边栏是否折叠
        panelSizes: {           // 面板大小
            left: 300,
            right: 300,
            bottom: 200
        },
        activePanel: 'project-list' // 活动面板
    },
    
    // 过滤器状态
    filters: {
        searchQuery: '',        // 搜索查询
        selectedTags: [],       // 选中的标签
        dateRange: null,        // 日期范围
        nodeType: 'all'         // 节点类型过滤
    },
    
    // 主题和设置
    theme: {
        mode: 'light',          // 'light' | 'dark'
        primaryColor: '#007bff', // 主色调
        fontSize: 14            // 字体大小
    },
    
    // 通知状态
    notifications: [],          // 通知列表
    
    // 模态框状态
    modals: {
        isImportDialogOpen: false,
        isExportDialogOpen: false,
        isSettingsDialogOpen: false
    }
};

/**
 * 注册表状态Schema
 */
export const RegistryStateSchema = {
    // 项目列表
    projects: [],               // 项目列表
    
    // 任务状态
    tasks: [],                  // 任务列表
    
    // 关系数据
    relations: {
        nodes: [],              // 关系节点
        edges: [],              // 关系边
        lastUpdated: null       // 最后更新时间
    },
    
    // 查询状态
    query: {
        results: [],            // 查询结果
        isLoading: false,       // 是否正在查询
        lastQuery: '',          // 最后的查询
        totalCount: 0           // 结果总数
    }
};

/**
 * 系统状态Schema
 */
export const SystemStateSchema = {
    // 初始化状态
    initialization: {
        isInitialized: false,   // 系统是否已初始化
        loadedModules: [],      // 已加载的模块
        failedModules: [],      // 加载失败的模块
        initStartTime: null,    // 初始化开始时间
        initEndTime: null       // 初始化结束时间
    },
    
    // 存储状态
    storage: {
        mode: 'legacy',         // 存储模式: 'legacy' | 'formal' | 'dual'
        isHealthy: true,        // 存储系统是否健康
        lastBackup: null,       // 最后备份时间
        usageStats: {           // 使用统计
            reads: 0,
            writes: 0,
            errors: 0
        }
    },
    
    // 性能状态
    performance: {
        memoryUsage: 0,         // 内存使用量
        renderTime: 0,          // 渲染耗时
        lastGC: null,           // 最后垃圾回收时间
        fps: 60                 // 帧率
    },
    
    // 错误状态
    errors: {
        count: 0,               // 错误总数
        lastError: null,        // 最后的错误
        errorHistory: []        // 错误历史
    }
};

/**
 * 完整的应用状态Schema
 */
export const AppStateSchema = {
    mindmap: MindmapStateSchema,
    ui: UIStateSchema,
    registry: RegistryStateSchema,
    system: SystemStateSchema,
    
    // 元数据
    meta: {
        version: '2.0',         // 状态版本
        createdAt: null,        // 创建时间
        lastUpdated: null,      // 最后更新时间
        stateSize: 0            // 状态大小（字节）
    }
};

/**
 * 状态验证器
 */
export class StateValidator {
    constructor() {
        this.validationRules = new Map();
        this._initializeRules();
    }

    /**
     * 初始化验证规则
     * @private
     */
    _initializeRules() {
        // 脑图状态验证规则
        this.validationRules.set('mindmap.current.pid', {
            type: ['string', 'null'],
            required: false
        });
        
        this.validationRules.set('mindmap.current.nodeCount', {
            type: 'number',
            min: 0,
            required: true
        });
        
        this.validationRules.set('ui.activeTab', {
            type: 'string',
            enum: ['mindmap', 'registry', 'workspace', 'relations'],
            required: true
        });
        
        this.validationRules.set('ui.theme.mode', {
            type: 'string',
            enum: ['light', 'dark'],
            required: true
        });
        
        this.validationRules.set('system.storage.mode', {
            type: 'string',
            enum: ['legacy', 'formal', 'dual'],
            required: true
        });
    }

    /**
     * 验证状态对象
     * @param {Object} state - 要验证的状态
     * @param {string} path - 状态路径
     * @returns {Object} 验证结果
     */
    validate(state, path = '') {
        const errors = [];
        const warnings = [];
        
        try {
            this._validateObject(state, path, errors, warnings);
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                validatedAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                isValid: false,
                errors: [`验证过程出错: ${error.message}`],
                warnings,
                validatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * 验证对象
     * @private
     */
    _validateObject(obj, path, errors, warnings) {
        if (!obj || typeof obj !== 'object') {
            errors.push(`${path}: 必须是对象类型`);
            return;
        }
        
        // 检查必需字段
        for (const [rulePath, rule] of this.validationRules) {
            if (rulePath.startsWith(path)) {
                const fieldPath = rulePath.substring(path.length + 1);
                const value = this._getNestedValue(obj, fieldPath);
                
                if (rule.required && (value === undefined || value === null)) {
                    errors.push(`${rulePath}: 必需字段缺失`);
                    continue;
                }
                
                if (value !== undefined && value !== null) {
                    this._validateValue(value, rule, rulePath, errors, warnings);
                }
            }
        }
    }

    /**
     * 验证值
     * @private
     */
    _validateValue(value, rule, path, errors, warnings) {
        // 类型验证
        if (rule.type) {
            const types = Array.isArray(rule.type) ? rule.type : [rule.type];
            const valueType = typeof value;
            
            if (!types.includes(valueType)) {
                errors.push(`${path}: 类型错误，期望 ${types.join('|')}，实际 ${valueType}`);
                return;
            }
        }
        
        // 枚举验证
        if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${path}: 值不在允许范围内，期望 ${rule.enum.join('|')}，实际 ${value}`);
        }
        
        // 数值范围验证
        if (typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                errors.push(`${path}: 值太小，最小值 ${rule.min}，实际 ${value}`);
            }
            if (rule.max !== undefined && value > rule.max) {
                errors.push(`${path}: 值太大，最大值 ${rule.max}，实际 ${value}`);
            }
        }
        
        // 字符串长度验证
        if (typeof value === 'string') {
            if (rule.minLength !== undefined && value.length < rule.minLength) {
                warnings.push(`${path}: 字符串太短，建议最小长度 ${rule.minLength}`);
            }
            if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                errors.push(`${path}: 字符串太长，最大长度 ${rule.maxLength}，实际 ${value.length}`);
            }
        }
    }

    /**
     * 获取嵌套值
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * 创建默认状态
     * @returns {Object} 默认状态对象
     */
    createDefaultState() {
        return {
            mindmap: {
                current: {
                    pid: null,
                    title: '',
                    nodeCount: 0,
                    lastModified: null,
                    hasUnsavedChanges: false
                },
                list: [],
                selection: {
                    selectedNodeId: null,
                    selectedNodes: [],
                    focusedNodeId: null
                },
                view: {
                    mode: 'full',
                    zoomLevel: 1.0,
                    centerPosition: { x: 0, y: 0 },
                    isEditing: false
                },
                cache: {
                    fullMindData: null,
                    subtreeData: null,
                    lastCacheTime: null
                }
            },
            ui: {
                activeTab: 'mindmap',
                view: {
                    sidebarCollapsed: false,
                    panelSizes: {
                        left: 300,
                        right: 300,
                        bottom: 200
                    },
                    activePanel: 'project-list'
                },
                filters: {
                    searchQuery: '',
                    selectedTags: [],
                    dateRange: null,
                    nodeType: 'all'
                },
                theme: {
                    mode: 'light',
                    primaryColor: '#007bff',
                    fontSize: 14
                },
                notifications: [],
                modals: {
                    isImportDialogOpen: false,
                    isExportDialogOpen: false,
                    isSettingsDialogOpen: false
                }
            },
            registry: {
                projects: [],
                tasks: [],
                relations: {
                    nodes: [],
                    edges: [],
                    lastUpdated: null
                },
                query: {
                    results: [],
                    isLoading: false,
                    lastQuery: '',
                    totalCount: 0
                }
            },
            system: {
                initialization: {
                    isInitialized: false,
                    loadedModules: [],
                    failedModules: [],
                    initStartTime: Date.now(),
                    initEndTime: null
                },
                storage: {
                    mode: 'legacy',
                    isHealthy: true,
                    lastBackup: null,
                    usageStats: {
                        reads: 0,
                        writes: 0,
                        errors: 0
                    }
                },
                performance: {
                    memoryUsage: 0,
                    renderTime: 0,
                    lastGC: null,
                    fps: 60
                },
                errors: {
                    count: 0,
                    lastError: null,
                    errorHistory: []
                }
            },
            meta: {
                version: '2.0',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                stateSize: 0
            }
        };
    }
}

/**
 * 状态工具函数
 */
export const StateUtils = {
    /**
     * 深度克隆状态
     */
    deepClone(state) {
        try {
            return JSON.parse(JSON.stringify(state));
        } catch (error) {
            console.error('[StateUtils] 深度克隆失败:', error);
            return null;
        }
    },

    /**
     * 合并状态
     */
    mergeState(currentState, updates) {
        try {
            const newState = this.deepClone(currentState);
            return this._deepMerge(newState, updates);
        } catch (error) {
            console.error('[StateUtils] 状态合并失败:', error);
            return currentState;
        }
    },

    /**
     * 深度合并
     * @private
     */
    _deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    this._deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    },

    /**
     * 获取状态大小
     */
    getStateSize(state) {
        try {
            return JSON.stringify(state).length;
        } catch (error) {
            console.error('[StateUtils] 获取状态大小失败:', error);
            return 0;
        }
    },

    /**
     * 比较状态差异
     */
    diffState(oldState, newState) {
        const changes = [];
        this._diffObject(oldState, newState, '', changes);
        return changes;
    },

    /**
     * 比较对象差异
     * @private
     */
    _diffObject(oldObj, newObj, path, changes) {
        const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const oldValue = oldObj?.[key];
            const newValue = newObj?.[key];
            
            if (oldValue !== newValue) {
                if (typeof oldValue === 'object' && typeof newValue === 'object' && 
                    oldValue !== null && newValue !== null && 
                    !Array.isArray(oldValue) && !Array.isArray(newValue)) {
                    this._diffObject(oldValue, newValue, currentPath, changes);
                } else {
                    changes.push({
                        path: currentPath,
                        oldValue,
                        newValue,
                        type: oldValue === undefined ? 'added' : 
                              newValue === undefined ? 'removed' : 'changed'
                    });
                }
            }
        }
    }
};

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.StateValidator = StateValidator;
    window.StateUtils = StateUtils;
    window.AppStateSchema = AppStateSchema;
}

export default {
    AppStateSchema,
    MindmapStateSchema,
    UIStateSchema,
    RegistryStateSchema,
    SystemStateSchema,
    StateValidator,
    StateUtils
};

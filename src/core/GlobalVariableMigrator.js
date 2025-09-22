/**
 * 全局变量迁移器
 * 阶段2.2：将分散的全局变量迁移到集中状态管理
 * 提供向后兼容的代理层，逐步替换全局变量访问
 */

import { ActionTypes } from './StateManager.js';

/**
 * 全局变量迁移器
 */
export class GlobalVariableMigrator {
    constructor(stateManager, eventBus, standardEvents) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 迁移映射表
        this.migrationMap = new Map();
        
        // 代理对象缓存
        this.proxies = new Map();
        
        // 迁移统计
        this.stats = {
            migratedVariables: 0,
            proxyAccesses: 0,
            directAccesses: 0,
            warnings: 0
        };
        
        console.log('[GlobalMigrator] 全局变量迁移器已创建');
        
        this._initializeMigrationMap();
        this._setupGlobalProxies();
    }

    /**
     * 初始化迁移映射
     * @private
     */
    _initializeMigrationMap() {
        // 脑图相关全局变量迁移
        this.migrationMap.set('__currentMindPid', {
            statePath: 'mindmap.current.pid',
            actionType: ActionTypes.MINDMAP.SET_CURRENT_PID,
            getter: () => this.stateManager.getState('mindmap.current.pid'),
            setter: (value) => this.stateManager.dispatch({
                type: ActionTypes.MINDMAP.SET_CURRENT_PID,
                payload: value
            }),
            deprecated: false,
            description: '当前脑图PID'
        });
        
        this.migrationMap.set('__mindFullCache', {
            statePath: 'mindmap.cache.fullMindData',
            actionType: ActionTypes.MINDMAP.SET_CACHE_DATA,
            getter: () => this.stateManager.getState('mindmap.cache.fullMindData'),
            setter: (value) => this.stateManager.dispatch({
                type: ActionTypes.MINDMAP.SET_CACHE_DATA,
                payload: value
            }),
            deprecated: false,
            description: '脑图全量缓存'
        });
        
        // UI相关全局变量迁移
        this.migrationMap.set('__activeTab', {
            statePath: 'ui.activeTab',
            actionType: ActionTypes.UI.SET_ACTIVE_TAB,
            getter: () => this.stateManager.getState('ui.activeTab'),
            setter: (value) => this.stateManager.dispatch({
                type: ActionTypes.UI.SET_ACTIVE_TAB,
                payload: value
            }),
            deprecated: false,
            description: '当前活动标签'
        });
        
        this.migrationMap.set('__sidebarCollapsed', {
            statePath: 'ui.view.sidebarCollapsed',
            actionType: ActionTypes.UI.TOGGLE_SIDEBAR,
            getter: () => this.stateManager.getState('ui.view.sidebarCollapsed'),
            setter: (value) => this.stateManager.dispatch({
                type: ActionTypes.UI.TOGGLE_SIDEBAR,
                payload: value
            }),
            deprecated: false,
            description: '侧边栏折叠状态'
        });
        
        // 系统相关全局变量迁移
        this.migrationMap.set('__systemInitialized', {
            statePath: 'system.initialization.isInitialized',
            actionType: ActionTypes.SYSTEM.SET_INITIALIZED,
            getter: () => this.stateManager.getState('system.initialization.isInitialized'),
            setter: (value) => this.stateManager.dispatch({
                type: ActionTypes.SYSTEM.SET_INITIALIZED,
                payload: value
            }),
            deprecated: false,
            description: '系统初始化状态'
        });
        
        this.migrationMap.set('__storageMode', {
            statePath: 'system.storage.mode',
            actionType: ActionTypes.SYSTEM.SET_STORAGE_MODE,
            getter: () => this.stateManager.getState('system.storage.mode'),
            setter: (value) => this.stateManager.dispatch({
                type: ActionTypes.SYSTEM.SET_STORAGE_MODE,
                payload: value
            }),
            deprecated: false,
            description: '存储模式'
        });
        
        // 注册表相关全局变量迁移
        this.migrationMap.set('Registry', {
            statePath: 'registry',
            actionType: null, // 复杂对象，不使用单一Action
            getter: () => {
                const registryState = this.stateManager.getState('registry');
                return this._createRegistryProxy(registryState);
            },
            setter: (value) => {
                console.warn('[GlobalMigrator] Registry对象应该通过具体的Action更新，而不是直接赋值');
            },
            deprecated: true,
            description: '注册表对象（建议使用状态管理器）'
        });
        
        console.log(`[GlobalMigrator] 已配置 ${this.migrationMap.size} 个全局变量迁移`);
    }

    /**
     * 设置全局代理
     * @private
     */
    _setupGlobalProxies() {
        if (typeof window === 'undefined') {
            return;
        }
        
        for (const [globalName, config] of this.migrationMap) {
            this._createGlobalProxy(globalName, config);
        }
    }

    /**
     * 创建全局变量代理
     * @private
     */
    _createGlobalProxy(globalName, config) {
        // 保存原始值（如果存在）
        const originalValue = window[globalName];
        
        // 如果原始值存在且状态中没有值，则迁移原始值
        if (originalValue !== undefined) {
            const currentStateValue = config.getter();
            if (currentStateValue === null || currentStateValue === undefined) {
                config.setter(originalValue);
                console.log(`[GlobalMigrator] 已迁移 ${globalName} 的原始值到状态管理器`);
            }
        }
        
        // 创建代理属性
        Object.defineProperty(window, globalName, {
            get: () => {
                this.stats.proxyAccesses++;
                
                if (config.deprecated) {
                    this.stats.warnings++;
                    console.warn(`[GlobalMigrator] ${globalName} 已废弃，建议使用状态管理器: ${config.description}`);
                }
                
                return config.getter();
            },
            
            set: (value) => {
                this.stats.proxyAccesses++;
                
                if (config.deprecated) {
                    this.stats.warnings++;
                    console.warn(`[GlobalMigrator] ${globalName} 已废弃，建议使用状态管理器: ${config.description}`);
                }
                
                config.setter(value);
                
                // 发布全局变量变更事件
                this.eventBus.emit(this.events.SYSTEM.GLOBAL_CHANGED, {
                    name: globalName,
                    newValue: value,
                    statePath: config.statePath,
                    deprecated: config.deprecated
                });
            },
            
            configurable: true,
            enumerable: true
        });
        
        this.stats.migratedVariables++;
        console.log(`[GlobalMigrator] 已设置 ${globalName} 的代理`);
    }

    /**
     * 创建Registry代理对象
     * @private
     */
    _createRegistryProxy(registryState) {
        if (this.proxies.has('Registry')) {
            return this.proxies.get('Registry');
        }
        
        const registryProxy = {
            // 模拟Registry.cmd接口
            cmd: {
                register: async (project) => {
                    this.stateManager.dispatch({
                        type: ActionTypes.REGISTRY.ADD_PROJECT,
                        payload: project
                    });
                    
                    // 发布注册事件
                    this.eventBus.emit(this.events.REGISTRY.CHANGED, {
                        action: 'register',
                        project
                    });
                    
                    return project;
                },
                
                select: (projectId) => {
                    // 更新当前选中的项目
                    this.stateManager.dispatch({
                        type: ActionTypes.MINDMAP.SET_CURRENT_PID,
                        payload: projectId
                    });
                    
                    // 发布选择事件
                    this.eventBus.emit(this.events.MINDMAP.SELECTION_CHANGED, {
                        selectedProjectId: projectId
                    });
                },
                
                update: (projectId, updates) => {
                    this.stateManager.dispatch({
                        type: ActionTypes.REGISTRY.UPDATE_PROJECT,
                        payload: { id: projectId, ...updates }
                    });
                },
                
                remove: (projectId) => {
                    this.stateManager.dispatch({
                        type: ActionTypes.REGISTRY.REMOVE_PROJECT,
                        payload: projectId
                    });
                }
            },
            
            // 模拟Registry.store接口
            store: {
                state: registryState,
                setProjects: (projects) => {
                    this.stateManager.dispatch({
                        type: ActionTypes.REGISTRY.SET_PROJECTS,
                        payload: projects
                    });
                }
            },
            
            // 获取项目列表
            getProjects: () => {
                return this.stateManager.getState('registry.projects') || [];
            },
            
            // 查找项目
            findProject: (projectId) => {
                const projects = this.stateManager.getState('registry.projects') || [];
                return projects.find(p => p.id === projectId);
            }
        };
        
        this.proxies.set('Registry', registryProxy);
        return registryProxy;
    }

    /**
     * 手动迁移全局变量
     * @param {string} globalName - 全局变量名
     * @param {*} value - 变量值
     */
    migrateGlobalVariable(globalName, value) {
        const config = this.migrationMap.get(globalName);
        if (!config) {
            console.warn(`[GlobalMigrator] 未知的全局变量: ${globalName}`);
            return false;
        }
        
        try {
            config.setter(value);
            console.log(`[GlobalMigrator] 已手动迁移 ${globalName}`);
            return true;
        } catch (error) {
            console.error(`[GlobalMigrator] 迁移 ${globalName} 失败:`, error);
            return false;
        }
    }

    /**
     * 批量迁移全局变量
     * @param {Object} globals - 全局变量对象
     */
    batchMigrateGlobals(globals) {
        const results = {};
        
        for (const [name, value] of Object.entries(globals)) {
            results[name] = this.migrateGlobalVariable(name, value);
        }
        
        console.log('[GlobalMigrator] 批量迁移结果:', results);
        return results;
    }

    /**
     * 检查全局变量使用情况
     */
    analyzeGlobalUsage() {
        const analysis = {
            migratedVariables: [],
            unmanagedVariables: [],
            deprecatedUsage: []
        };
        
        // 检查已迁移的变量
        for (const [name, config] of this.migrationMap) {
            analysis.migratedVariables.push({
                name,
                statePath: config.statePath,
                deprecated: config.deprecated,
                description: config.description,
                currentValue: config.getter()
            });
            
            if (config.deprecated) {
                analysis.deprecatedUsage.push(name);
            }
        }
        
        // 检查未管理的全局变量
        if (typeof window !== 'undefined') {
            const commonGlobals = [
                'mindmapController', 'StorageUtils', 'GlobalEventBus',
                'ComponentAdapters', 'MindmapAdapter', 'GlobalAdapter'
            ];
            
            for (const globalName of commonGlobals) {
                if (window[globalName] !== undefined && !this.migrationMap.has(globalName)) {
                    analysis.unmanagedVariables.push({
                        name: globalName,
                        type: typeof window[globalName],
                        hasValue: window[globalName] !== null && window[globalName] !== undefined
                    });
                }
            }
        }
        
        return analysis;
    }

    /**
     * 生成迁移报告
     */
    generateMigrationReport() {
        const analysis = this.analyzeGlobalUsage();
        
        const report = {
            summary: {
                totalMigrated: this.stats.migratedVariables,
                proxyAccesses: this.stats.proxyAccesses,
                directAccesses: this.stats.directAccesses,
                warnings: this.stats.warnings,
                deprecatedCount: analysis.deprecatedUsage.length,
                unmanagedCount: analysis.unmanagedVariables.length
            },
            
            migratedVariables: analysis.migratedVariables,
            unmanagedVariables: analysis.unmanagedVariables,
            deprecatedUsage: analysis.deprecatedUsage,
            
            recommendations: this._generateRecommendations(analysis)
        };
        
        return report;
    }

    /**
     * 生成迁移建议
     * @private
     */
    _generateRecommendations(analysis) {
        const recommendations = [];
        
        // 废弃变量建议
        if (analysis.deprecatedUsage.length > 0) {
            recommendations.push({
                type: 'deprecated',
                priority: 'high',
                message: `发现 ${analysis.deprecatedUsage.length} 个废弃的全局变量仍在使用`,
                variables: analysis.deprecatedUsage,
                action: '建议使用状态管理器的相应API替换这些变量'
            });
        }
        
        // 未管理变量建议
        if (analysis.unmanagedVariables.length > 0) {
            recommendations.push({
                type: 'unmanaged',
                priority: 'medium',
                message: `发现 ${analysis.unmanagedVariables.length} 个未管理的全局变量`,
                variables: analysis.unmanagedVariables.map(v => v.name),
                action: '考虑将这些变量迁移到状态管理器或组件事件适配器'
            });
        }
        
        // 性能建议
        if (this.stats.proxyAccesses > 1000) {
            recommendations.push({
                type: 'performance',
                priority: 'low',
                message: `代理访问次数较高 (${this.stats.proxyAccesses})`,
                action: '考虑直接使用状态管理器API以获得更好的性能'
            });
        }
        
        return recommendations;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            migrationMapSize: this.migrationMap.size,
            proxyCacheSize: this.proxies.size
        };
    }

    /**
     * 清理代理
     */
    cleanup() {
        // 清理代理缓存
        this.proxies.clear();
        
        // 重置统计
        this.stats = {
            migratedVariables: 0,
            proxyAccesses: 0,
            directAccesses: 0,
            warnings: 0
        };
        
        console.log('[GlobalMigrator] 已清理代理缓存');
    }

    /**
     * 启用/禁用废弃警告
     */
    setDeprecationWarnings(enabled) {
        this.showDeprecationWarnings = !!enabled;
        console.log(`[GlobalMigrator] 废弃警告${enabled ? '已启用' : '已禁用'}`);
    }
}

/**
 * 全局变量迁移助手
 */
export class GlobalMigrationHelper {
    constructor(migrator) {
        this.migrator = migrator;
    }

    /**
     * 创建迁移指南
     */
    createMigrationGuide() {
        const report = this.migrator.generateMigrationReport();
        
        const guide = {
            title: '全局变量迁移指南',
            
            overview: {
                totalVariables: report.summary.totalMigrated,
                migrationStatus: report.summary.totalMigrated > 0 ? 'active' : 'pending',
                completionRate: this._calculateCompletionRate(report)
            },
            
            steps: [
                {
                    step: 1,
                    title: '替换直接全局变量访问',
                    description: '将 window.globalVar 替换为 stateManager.getState(path)',
                    examples: this._generateReplacementExamples()
                },
                {
                    step: 2,
                    title: '使用Action更新状态',
                    description: '将直接赋值替换为 stateManager.dispatch(action)',
                    examples: this._generateActionExamples()
                },
                {
                    step: 3,
                    title: '订阅状态变化',
                    description: '使用 stateManager.subscribe() 监听状态变化',
                    examples: this._generateSubscriptionExamples()
                }
            ],
            
            recommendations: report.recommendations
        };
        
        return guide;
    }

    /**
     * 计算完成率
     * @private
     */
    _calculateCompletionRate(report) {
        const total = report.summary.totalMigrated + report.summary.unmanagedCount;
        if (total === 0) return 100;
        
        const migrated = report.summary.totalMigrated - report.summary.deprecatedCount;
        return Math.round((migrated / total) * 100);
    }

    /**
     * 生成替换示例
     * @private
     */
    _generateReplacementExamples() {
        return [
            {
                before: 'const pid = window.__currentMindPid;',
                after: 'const pid = stateManager.getState("mindmap.current.pid");'
            },
            {
                before: 'const cache = window.__mindFullCache;',
                after: 'const cache = stateManager.getState("mindmap.cache.fullMindData");'
            },
            {
                before: 'const tab = window.__activeTab;',
                after: 'const tab = stateManager.getState("ui.activeTab");'
            }
        ];
    }

    /**
     * 生成Action示例
     * @private
     */
    _generateActionExamples() {
        return [
            {
                before: 'window.__currentMindPid = "new-pid";',
                after: 'stateManager.dispatch({ type: "MINDMAP_SET_CURRENT_PID", payload: "new-pid" });'
            },
            {
                before: 'window.__activeTab = "registry";',
                after: 'stateManager.dispatch({ type: "UI_SET_ACTIVE_TAB", payload: "registry" });'
            }
        ];
    }

    /**
     * 生成订阅示例
     * @private
     */
    _generateSubscriptionExamples() {
        return [
            {
                description: '监听脑图PID变化',
                code: 'stateManager.subscribe((pid) => { console.log("PID changed:", pid); }, "mindmap.current.pid");'
            },
            {
                description: '监听UI标签变化',
                code: 'stateManager.subscribe((tab) => { updateUI(tab); }, "ui.activeTab");'
            }
        ];
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.GlobalVariableMigrator = GlobalVariableMigrator;
    window.GlobalMigrationHelper = GlobalMigrationHelper;
}

export default GlobalVariableMigrator;

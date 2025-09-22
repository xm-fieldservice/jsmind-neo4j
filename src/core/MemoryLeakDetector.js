/**
 * 内存泄漏检测器
 * 阶段2.3：添加内存泄漏检测和监控
 * 检测DOM节点泄漏、事件监听器泄漏、定时器泄漏等常见内存泄漏问题
 */

import { ActionTypes } from './StateManager.js';

/**
 * 内存泄漏类型枚举
 */
export const MemoryLeakType = {
    DOM_NODES: 'dom_nodes',
    EVENT_LISTENERS: 'event_listeners',
    TIMERS: 'timers',
    CLOSURES: 'closures',
    GLOBAL_VARIABLES: 'global_variables',
    CIRCULAR_REFERENCES: 'circular_references'
};

/**
 * 检测严重程度
 */
export const LeakSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * 内存泄漏检测器
 */
export class MemoryLeakDetector {
    constructor(stateManager, eventBus, standardEvents) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 检测配置
        this.config = {
            enabled: true,
            interval: 30000,
            maxDomNodes: 10000,
            maxEventListeners: 1000,
            maxTimers: 100,
            maxGlobalVars: 500,
            memoryGrowthThreshold: 50
        };
        
        // 检测状态
        this.isRunning = false;
        this.detectionTimer = null;
        
        // 基线数据
        this.baseline = {
            domNodes: 0,
            eventListeners: 0,
            timers: 0,
            globalVars: 0,
            memoryUsage: 0,
            timestamp: Date.now()
        };
        
        // 历史数据和检测结果
        this.history = [];
        this.maxHistorySize = 100;
        this.leaks = new Map();
        this.warnings = [];
        
        // 统计信息
        this.stats = {
            totalDetections: 0,
            leaksFound: 0,
            warningsGenerated: 0,
            lastDetection: null,
            averageDetectionTime: 0
        };
        
        // 跟踪器
        this.domObserver = null;
        this.eventListenerTracker = new Map();
        this.timerTracker = new Set();
        this.globalVarTracker = new Set();
        
        console.log('[MemoryLeakDetector] 内存泄漏检测器已创建');
        
        this._initializeTrackers();
        this._setupEventListeners();
    }

    /**
     * 初始化跟踪器
     * @private
     */
    _initializeTrackers() {
        if (typeof window === 'undefined') {
            console.warn('[MemoryLeakDetector] 非浏览器环境，部分功能不可用');
            return;
        }
        
        this._initializeDOMObserver();
        this._initializeEventListenerTracker();
        this._initializeTimerTracker();
        this._initializeGlobalVariableTracker();
        this._setBaseline();
    }

    /**
     * 初始化DOM观察器
     * @private
     */
    _initializeDOMObserver() {
        if (!window.MutationObserver) return;
        
        this.domObserver = new MutationObserver((mutations) => {
            let addedNodes = 0;
            let removedNodes = 0;
            
            mutations.forEach(mutation => {
                addedNodes += mutation.addedNodes.length;
                removedNodes += mutation.removedNodes.length;
            });
            
            if (addedNodes > 100 || removedNodes > 100) {
                console.warn(`[MemoryLeakDetector] 大量DOM变化: 添加${addedNodes}个, 移除${removedNodes}个节点`);
            }
        });
        
        this.domObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
        
        console.log('[MemoryLeakDetector] DOM观察器已启动');
    }

    /**
     * 初始化事件监听器跟踪
     * @private
     */
    _initializeEventListenerTracker() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const key = this.constructor.name + '_' + type + '_' + Date.now();
            this._memoryLeakDetectorKey = this._memoryLeakDetectorKey || key;
            
            if (window.memoryLeakDetector) {
                window.memoryLeakDetector.eventListenerTracker.set(key, {
                    target: this,
                    type,
                    listener,
                    options,
                    timestamp: Date.now()
                });
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            if (this._memoryLeakDetectorKey && window.memoryLeakDetector) {
                window.memoryLeakDetector.eventListenerTracker.delete(this._memoryLeakDetectorKey);
            }
            
            return originalRemoveEventListener.call(this, type, listener, options);
        };
        
        console.log('[MemoryLeakDetector] 事件监听器跟踪已启动');
    }

    /**
     * 初始化定时器跟踪
     * @private
     */
    _initializeTimerTracker() {
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        const originalClearTimeout = window.clearTimeout;
        const originalClearInterval = window.clearInterval;
        
        window.setTimeout = (callback, delay, ...args) => {
            const id = originalSetTimeout(callback, delay, ...args);
            
            if (window.memoryLeakDetector) {
                window.memoryLeakDetector.timerTracker.add({
                    id,
                    type: 'timeout',
                    delay,
                    timestamp: Date.now()
                });
            }
            
            return id;
        };
        
        window.setInterval = (callback, delay, ...args) => {
            const id = originalSetInterval(callback, delay, ...args);
            
            if (window.memoryLeakDetector) {
                window.memoryLeakDetector.timerTracker.add({
                    id,
                    type: 'interval',
                    delay,
                    timestamp: Date.now()
                });
            }
            
            return id;
        };
        
        window.clearTimeout = (id) => {
            if (window.memoryLeakDetector) {
                for (const timer of window.memoryLeakDetector.timerTracker) {
                    if (timer.id === id) {
                        window.memoryLeakDetector.timerTracker.delete(timer);
                        break;
                    }
                }
            }
            
            return originalClearTimeout(id);
        };
        
        window.clearInterval = (id) => {
            if (window.memoryLeakDetector) {
                for (const timer of window.memoryLeakDetector.timerTracker) {
                    if (timer.id === id) {
                        window.memoryLeakDetector.timerTracker.delete(timer);
                        break;
                    }
                }
            }
            
            return originalClearInterval(id);
        };
        
        console.log('[MemoryLeakDetector] 定时器跟踪已启动');
    }

    /**
     * 初始化全局变量跟踪
     * @private
     */
    _initializeGlobalVariableTracker() {
        for (const key in window) {
            if (window.hasOwnProperty(key)) {
                this.globalVarTracker.add(key);
            }
        }
        
        console.log(`[MemoryLeakDetector] 全局变量跟踪已启动，初始变量数: ${this.globalVarTracker.size}`);
    }

    /**
     * 设置基线数据
     * @private
     */
    _setBaseline() {
        this.baseline = {
            domNodes: this._countDOMNodes(),
            eventListeners: this.eventListenerTracker.size,
            timers: this.timerTracker.size,
            globalVars: this.globalVarTracker.size,
            memoryUsage: this._getMemoryUsage(),
            timestamp: Date.now()
        };
        
        console.log('[MemoryLeakDetector] 基线数据已设置:', this.baseline);
    }

    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.stop();
            });
        }
        
        this.eventBus.on(this.events.COMPONENT.DESTROYED, (payload) => {
            this._checkComponentCleanup(payload.component);
        });
    }

    /**
     * 启动检测
     */
    start(config = {}) {
        if (this.isRunning) {
            console.warn('[MemoryLeakDetector] 检测器已在运行');
            return;
        }
        
        this.config = { ...this.config, ...config };
        
        if (!this.config.enabled) {
            console.log('[MemoryLeakDetector] 检测器已禁用');
            return;
        }
        
        this.isRunning = true;
        
        this.detectionTimer = setInterval(() => {
            this._performDetection();
        }, this.config.interval);
        
        console.log(`[MemoryLeakDetector] 检测器已启动，检测间隔: ${this.config.interval}ms`);
        
        this._performDetection();
        
        this.eventBus.emit(this.events.SYSTEM.MEMORY_DETECTOR_STARTED, {
            config: this.config,
            baseline: this.baseline
        });
    }

    /**
     * 停止检测
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.detectionTimer) {
            clearInterval(this.detectionTimer);
            this.detectionTimer = null;
        }
        
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
        
        console.log('[MemoryLeakDetector] 检测器已停止');
        
        this.eventBus.emit(this.events.SYSTEM.MEMORY_DETECTOR_STOPPED, {
            stats: this.getStats()
        });
    }

    /**
     * 执行检测
     * @private
     */
    async _performDetection() {
        const startTime = Date.now();
        
        try {
            console.log('[MemoryLeakDetector] 开始内存泄漏检测...');
            
            const current = {
                domNodes: this._countDOMNodes(),
                eventListeners: this.eventListenerTracker.size,
                timers: this.timerTracker.size,
                globalVars: this._countGlobalVariables(),
                memoryUsage: this._getMemoryUsage(),
                timestamp: Date.now()
            };
            
            const detectionResults = {
                domLeaks: this._detectDOMLeaks(current),
                eventListenerLeaks: this._detectEventListenerLeaks(current),
                timerLeaks: this._detectTimerLeaks(current),
                globalVarLeaks: this._detectGlobalVariableLeaks(current),
                memoryLeaks: this._detectMemoryLeaks(current)
            };
            
            this.history.push(current);
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            }
            
            this._processDetectionResults(detectionResults, current);
            
            this.stats.totalDetections++;
            this.stats.lastDetection = Date.now();
            
            const detectionTime = Date.now() - startTime;
            this.stats.averageDetectionTime = this._updateAverage(
                this.stats.averageDetectionTime,
                detectionTime,
                this.stats.totalDetections
            );
            
            console.log(`[MemoryLeakDetector] 检测完成，耗时: ${detectionTime}ms`);
            
            this.eventBus.emit(this.events.SYSTEM.MEMORY_DETECTION_COMPLETE, {
                current,
                results: detectionResults,
                detectionTime,
                stats: this.getStats()
            });
            
        } catch (error) {
            console.error('[MemoryLeakDetector] 检测过程中发生错误:', error);
            
            this.eventBus.emit(this.events.SYSTEM.MEMORY_DETECTION_ERROR, {
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 检测DOM节点泄漏
     * @private
     */
    _detectDOMLeaks(current) {
        const growth = current.domNodes - this.baseline.domNodes;
        const growthRate = growth / this.baseline.domNodes;
        
        let severity = LeakSeverity.LOW;
        if (current.domNodes > this.config.maxDomNodes) {
            severity = LeakSeverity.CRITICAL;
        } else if (growthRate > 2) {
            severity = LeakSeverity.HIGH;
        } else if (growthRate > 1) {
            severity = LeakSeverity.MEDIUM;
        }
        
        return {
            type: MemoryLeakType.DOM_NODES,
            detected: growth > 0 && growthRate > 0.5,
            severity,
            current: current.domNodes,
            baseline: this.baseline.domNodes,
            growth,
            growthRate: (growthRate * 100).toFixed(1) + '%',
            message: `DOM节点数量从 ${this.baseline.domNodes} 增长到 ${current.domNodes}`
        };
    }

    /**
     * 检测事件监听器泄漏
     * @private
     */
    _detectEventListenerLeaks(current) {
        const growth = current.eventListeners - this.baseline.eventListeners;
        const growthRate = growth / Math.max(this.baseline.eventListeners, 1);
        
        let severity = LeakSeverity.LOW;
        if (current.eventListeners > this.config.maxEventListeners) {
            severity = LeakSeverity.CRITICAL;
        } else if (growthRate > 3) {
            severity = LeakSeverity.HIGH;
        } else if (growthRate > 1.5) {
            severity = LeakSeverity.MEDIUM;
        }
        
        return {
            type: MemoryLeakType.EVENT_LISTENERS,
            detected: growth > 0 && growthRate > 0.5,
            severity,
            current: current.eventListeners,
            baseline: this.baseline.eventListeners,
            growth,
            growthRate: (growthRate * 100).toFixed(1) + '%',
            message: `事件监听器数量从 ${this.baseline.eventListeners} 增长到 ${current.eventListeners}`
        };
    }

    /**
     * 检测定时器泄漏
     * @private
     */
    _detectTimerLeaks(current) {
        const growth = current.timers - this.baseline.timers;
        const growthRate = growth / Math.max(this.baseline.timers, 1);
        
        let severity = LeakSeverity.LOW;
        if (current.timers > this.config.maxTimers) {
            severity = LeakSeverity.CRITICAL;
        } else if (growthRate > 2) {
            severity = LeakSeverity.HIGH;
        } else if (growthRate > 1) {
            severity = LeakSeverity.MEDIUM;
        }
        
        return {
            type: MemoryLeakType.TIMERS,
            detected: growth > 0 && growthRate > 0.3,
            severity,
            current: current.timers,
            baseline: this.baseline.timers,
            growth,
            growthRate: (growthRate * 100).toFixed(1) + '%',
            message: `定时器数量从 ${this.baseline.timers} 增长到 ${current.timers}`
        };
    }

    /**
     * 检测全局变量泄漏
     * @private
     */
    _detectGlobalVariableLeaks(current) {
        const growth = current.globalVars - this.baseline.globalVars;
        const growthRate = growth / this.baseline.globalVars;
        
        let severity = LeakSeverity.LOW;
        if (current.globalVars > this.config.maxGlobalVars) {
            severity = LeakSeverity.HIGH;
        } else if (growthRate > 0.5) {
            severity = LeakSeverity.MEDIUM;
        }
        
        return {
            type: MemoryLeakType.GLOBAL_VARIABLES,
            detected: growth > 0 && growthRate > 0.1,
            severity,
            current: current.globalVars,
            baseline: this.baseline.globalVars,
            growth,
            growthRate: (growthRate * 100).toFixed(1) + '%',
            message: `全局变量数量从 ${this.baseline.globalVars} 增长到 ${current.globalVars}`
        };
    }

    /**
     * 检测内存泄漏
     * @private
     */
    _detectMemoryLeaks(current) {
        const growth = current.memoryUsage - this.baseline.memoryUsage;
        const growthRate = growth / Math.max(this.baseline.memoryUsage, 1);
        
        let severity = LeakSeverity.LOW;
        if (growth > this.config.memoryGrowthThreshold * 2) {
            severity = LeakSeverity.CRITICAL;
        } else if (growth > this.config.memoryGrowthThreshold) {
            severity = LeakSeverity.HIGH;
        } else if (growthRate > 0.5) {
            severity = LeakSeverity.MEDIUM;
        }
        
        return {
            type: MemoryLeakType.CLOSURES,
            detected: growth > this.config.memoryGrowthThreshold * 0.5,
            severity,
            current: current.memoryUsage,
            baseline: this.baseline.memoryUsage,
            growth,
            growthRate: (growthRate * 100).toFixed(1) + '%',
            message: `内存使用量从 ${this.baseline.memoryUsage.toFixed(1)}MB 增长到 ${current.memoryUsage.toFixed(1)}MB`
        };
    }

    /**
     * 处理检测结果
     * @private
     */
    _processDetectionResults(results, current) {
        const detectedLeaks = [];
        
        for (const [key, result] of Object.entries(results)) {
            if (result.detected) {
                detectedLeaks.push(result);
                
                this.leaks.set(result.type, {
                    ...result,
                    detectedAt: Date.now(),
                    occurrences: (this.leaks.get(result.type)?.occurrences || 0) + 1
                });
                
                this._generateWarning(result);
                
                console.warn(`[MemoryLeakDetector] 检测到${result.severity}级别的${result.type}泄漏: ${result.message}`);
            }
        }
        
        if (detectedLeaks.length > 0) {
            this.stats.leaksFound += detectedLeaks.length;
            
            this.eventBus.emit(this.events.SYSTEM.MEMORY_LEAK_DETECTED, {
                leaks: detectedLeaks,
                current,
                timestamp: Date.now()
            });
        }
        
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.UPDATE_MEMORY_STATUS,
            payload: {
                current,
                leaks: Array.from(this.leaks.values()),
                warnings: this.warnings.slice(-10),
                stats: this.getStats()
            }
        });
    }

    /**
     * 生成警告
     * @private
     */
    _generateWarning(result) {
        const warning = {
            id: Date.now() + '_' + result.type,
            type: result.type,
            severity: result.severity,
            message: result.message,
            timestamp: Date.now(),
            suggestions: this._generateSuggestions(result)
        };
        
        this.warnings.push(warning);
        this.stats.warningsGenerated++;
        
        if (this.warnings.length > 50) {
            this.warnings.shift();
        }
        
        this.eventBus.emit(this.events.SYSTEM.MEMORY_WARNING, warning);
    }

    /**
     * 生成修复建议
     * @private
     */
    _generateSuggestions(result) {
        const suggestions = [];
        
        switch (result.type) {
            case MemoryLeakType.DOM_NODES:
                suggestions.push('检查是否有未移除的DOM节点');
                suggestions.push('确保动态创建的元素在不需要时被正确移除');
                break;
                
            case MemoryLeakType.EVENT_LISTENERS:
                suggestions.push('检查是否有未移除的事件监听器');
                suggestions.push('在组件销毁时调用removeEventListener');
                break;
                
            case MemoryLeakType.TIMERS:
                suggestions.push('检查是否有未清理的定时器');
                suggestions.push('确保调用clearTimeout和clearInterval');
                break;
                
            case MemoryLeakType.GLOBAL_VARIABLES:
                suggestions.push('避免创建不必要的全局变量');
                suggestions.push('使用模块化和命名空间');
                break;
                
            case MemoryLeakType.CLOSURES:
                suggestions.push('检查是否有内存密集型操作');
                suggestions.push('避免创建大量闭包');
                break;
        }
        
        return suggestions;
    }

    /**
     * 检查组件清理
     * @private
     */
    _checkComponentCleanup(componentName) {
        const componentLeaks = [];
        
        for (const [key, listener] of this.eventListenerTracker) {
            if (key.includes(componentName)) {
                componentLeaks.push({
                    type: 'event_listener',
                    key,
                    listener
                });
            }
        }
        
        for (const timer of this.timerTracker) {
            if (timer.component === componentName) {
                componentLeaks.push({
                    type: 'timer',
                    timer
                });
            }
        }
        
        if (componentLeaks.length > 0) {
            console.warn(`[MemoryLeakDetector] 组件 ${componentName} 可能存在资源泄漏:`, componentLeaks);
            
            this.eventBus.emit(this.events.SYSTEM.COMPONENT_LEAK_DETECTED, {
                component: componentName,
                leaks: componentLeaks,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 统计DOM节点数量
     * @private
     */
    _countDOMNodes() {
        if (typeof document === 'undefined') return 0;
        return document.getElementsByTagName('*').length;
    }

    /**
     * 统计全局变量数量
     * @private
     */
    _countGlobalVariables() {
        if (typeof window === 'undefined') return 0;
        return Object.keys(window).length;
    }

    /**
     * 获取内存使用量
     * @private
     */
    _getMemoryUsage() {
        if (typeof performance === 'undefined' || !performance.memory) {
            return 0;
        }
        
        return performance.memory.usedJSHeapSize / (1024 * 1024);
    }

    /**
     * 更新平均值
     * @private
     */
    _updateAverage(currentAverage, newValue, count) {
        return ((currentAverage * (count - 1)) + newValue) / count;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            config: this.config,
            baseline: this.baseline,
            currentLeaks: this.leaks.size,
            currentWarnings: this.warnings.length,
            historySize: this.history.length
        };
    }

    /**
     * 获取检测报告
     */
    getReport() {
        const current = this.history[this.history.length - 1] || this.baseline;
        
        return {
            summary: {
                isRunning: this.isRunning,
                totalLeaks: this.leaks.size,
                totalWarnings: this.warnings.length,
                lastDetection: this.stats.lastDetection
            },
            
            current: {
                domNodes: current.domNodes,
                eventListeners: current.eventListeners,
                timers: current.timers,
                globalVars: current.globalVars,
                memoryUsage: current.memoryUsage,
                timestamp: current.timestamp
            },
            
            baseline: this.baseline,
            leaks: Array.from(this.leaks.values()),
            warnings: this.warnings.slice(-10),
            stats: this.getStats()
        };
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.MemoryLeakType = MemoryLeakType;
    window.LeakSeverity = LeakSeverity;
    window.MemoryLeakDetector = MemoryLeakDetector;
    window.memoryLeakDetector = null; // 将在初始化时设置
}

export default MemoryLeakDetector;

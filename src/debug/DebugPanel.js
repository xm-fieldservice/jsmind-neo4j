/**
 * 统一调试面板
 * 整合所有调试功能：控制台增强、脑图状态检查、命名问题监控
 * 替代多个分散的调试脚本
 */

class DebugPanel {
    constructor() {
        this.isVisible = false;
        this.panelElement = null;
        this.activeTab = 'console';
        this.monitors = new Map();
        this.init();
    }

    init() {
        this.createPanel();
        this.initMonitors();
        this.bindEvents();
        console.log('[DebugPanel] 统一调试面板初始化完成');
    }

    createPanel() {
        this.panelElement = document.createElement('div');
        this.panelElement.id = 'unified-debug-panel';
        this.panelElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 500px;
            height: 600px;
            background: #1e1e1e;
            color: #d4d4d4;
            border: 1px solid #3c3c3c;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10000;
            display: none;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            overflow: hidden;
        `;

        this.panelElement.innerHTML = `
            <div class="debug-header" style="padding: 12px; background: #2d2d30; border-bottom: 1px solid #3c3c3c; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 8px;">
                    <button class="tab-btn active" data-tab="console">🖥️ 控制台</button>
                    <button class="tab-btn" data-tab="mindmap">🧠 脑图状态</button>
                    <button class="tab-btn" data-tab="naming">🏷️ 命名监控</button>
                    <button class="tab-btn" data-tab="system">⚙️ 系统信息</button>
                </div>
                <button id="close-debug-panel" style="background: none; border: none; color: #d4d4d4; font-size: 16px; cursor: pointer;">×</button>
            </div>
            
            <div class="debug-content" style="height: calc(100% - 60px); overflow: hidden;">
                <!-- 控制台标签页 -->
                <div id="tab-console" class="tab-content active" style="height: 100%; display: flex; flex-direction: column;">
                    <div style="padding: 8px; background: #252526; border-bottom: 1px solid #3c3c3c;">
                        <button id="clear-console" style="background: #0e639c; color: white; border: none; padding: 4px 8px; border-radius: 3px; margin-right: 8px;">清空</button>
                        <button id="export-logs" style="background: #14a085; color: white; border: none; padding: 4px 8px; border-radius: 3px; margin-right: 8px;">导出</button>
                        <label style="color: #cccccc;">
                            <input type="checkbox" id="auto-scroll" checked> 自动滚动
                        </label>
                    </div>
                    <div id="console-output" style="flex: 1; padding: 8px; overflow-y: auto; background: #1e1e1e; font-family: monospace; font-size: 11px; line-height: 1.4;"></div>
                </div>

                <!-- 脑图状态标签页 -->
                <div id="tab-mindmap" class="tab-content" style="height: 100%; padding: 12px; overflow-y: auto; display: none;">
                    <div style="margin-bottom: 16px;">
                        <button id="refresh-mindmap" style="background: #0e639c; color: white; border: none; padding: 6px 12px; border-radius: 3px;">刷新状态</button>
                    </div>
                    <div id="mindmap-status"></div>
                </div>

                <!-- 命名监控标签页 -->
                <div id="tab-naming" class="tab-content" style="height: 100%; padding: 12px; overflow-y: auto; display: none;">
                    <div style="margin-bottom: 16px;">
                        <button id="check-naming" style="background: #0e639c; color: white; border: none; padding: 6px 12px; border-radius: 3px; margin-right: 8px;">检查命名</button>
                        <label style="color: #cccccc;">
                            <input type="checkbox" id="auto-naming-check" checked> 自动监控
                        </label>
                    </div>
                    <div id="naming-status"></div>
                </div>

                <!-- 系统信息标签页 -->
                <div id="tab-system" class="tab-content" style="height: 100%; padding: 12px; overflow-y: auto; display: none;">
                    <div style="margin-bottom: 16px;">
                        <button id="refresh-system" style="background: #0e639c; color: white; border: none; padding: 6px 12px; border-radius: 3px;">刷新信息</button>
                    </div>
                    <div id="system-info"></div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .tab-btn {
                background: #3c3c3c;
                color: #cccccc;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            }
            .tab-btn.active {
                background: #0e639c;
                color: white;
            }
            .tab-btn:hover {
                background: #464647;
            }
            .tab-btn.active:hover {
                background: #1177bb;
            }
            .log-entry {
                margin-bottom: 2px;
                padding: 2px 4px;
                border-radius: 2px;
            }
            .log-info { color: #4fc1ff; }
            .log-warn { color: #ffcc02; background: rgba(255, 204, 2, 0.1); }
            .log-error { color: #f48771; background: rgba(244, 135, 113, 0.1); }
            .log-debug { color: #b5cea8; }
        `;
        document.head.appendChild(style);

        document.body.appendChild(this.panelElement);
    }

    initMonitors() {
        // 控制台监控
        this.initConsoleMonitor();
        
        // 脑图状态监控
        this.initMindmapMonitor();
        
        // 命名问题监控
        this.initNamingMonitor();
        
        // 系统信息监控
        this.initSystemMonitor();
    }

    initConsoleMonitor() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalDebug = console.debug;

        const logBuffer = [];
        const maxLogs = 1000;

        const addLog = (type, args) => {
            const timestamp = new Date().toLocaleTimeString();
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            logBuffer.push({ type, timestamp, message });
            if (logBuffer.length > maxLogs) {
                logBuffer.shift();
            }
            
            this.updateConsoleOutput();
        };

        console.log = (...args) => {
            originalLog.apply(console, args);
            addLog('info', args);
        };

        console.warn = (...args) => {
            originalWarn.apply(console, args);
            addLog('warn', args);
        };

        console.error = (...args) => {
            originalError.apply(console, args);
            addLog('error', args);
        };

        console.debug = (...args) => {
            originalDebug.apply(console, args);
            addLog('debug', args);
        };

        this.logBuffer = logBuffer;
    }

    updateConsoleOutput() {
        if (!this.isVisible || this.activeTab !== 'console') return;

        const output = this.panelElement.querySelector('#console-output');
        const autoScroll = this.panelElement.querySelector('#auto-scroll').checked;
        
        output.innerHTML = this.logBuffer.map(log => `
            <div class="log-entry log-${log.type}">
                <span style="color: #666;">[${log.timestamp}]</span> ${log.message}
            </div>
        `).join('');

        if (autoScroll) {
            output.scrollTop = output.scrollHeight;
        }
    }

    initMindmapMonitor() {
        this.monitors.set('mindmap', {
            interval: null,
            check: () => this.checkMindmapStatus()
        });
    }

    checkMindmapStatus() {
        const status = {
            controller: !!window.MindmapController,
            mind: !!(window.MindmapController && window.MindmapController.mind),
            storage: !!window.MindmapStorage,
            registry: !!(window.Registry && window.Registry.fsm),
            eventBus: !!window.EventBus
        };

        let details = '';
        
        if (status.controller && window.MindmapController) {
            const controller = window.MindmapController;
            details += `
                <h4>控制器状态</h4>
                <ul>
                    <li>数据ID: ${controller.data ? controller.data.id : 'null'}</li>
                    <li>选中节点: ${controller.selectedNode || 'none'}</li>
                    <li>根节点: ${controller.mind ? controller.mind.get_root()?.id : 'null'}</li>
                </ul>
            `;
        }

        if (status.storage && window.MindmapStorage) {
            details += `
                <h4>存储状态</h4>
                <ul>
                    <li>存储服务: 可用</li>
                    <li>智能存储: ${window.smartStorage ? '启用' : '禁用'}</li>
                </ul>
            `;
        }

        if (status.registry && window.Registry) {
            details += `
                <h4>注册表状态</h4>
                <ul>
                    <li>状态机: ${window.Registry.fsm.state}</li>
                    <li>项目数: ${window.Registry.store ? window.Registry.store.projects.size : 0}</li>
                </ul>
            `;
        }

        const statusElement = this.panelElement.querySelector('#mindmap-status');
        statusElement.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3>组件状态</h3>
                ${Object.entries(status).map(([key, value]) => `
                    <div style="margin: 4px 0;">
                        <span style="color: ${value ? '#4fc1ff' : '#f48771'};">●</span>
                        ${key}: ${value ? '正常' : '异常'}
                    </div>
                `).join('')}
            </div>
            ${details}
        `;
    }

    initNamingMonitor() {
        this.monitors.set('naming', {
            interval: null,
            check: () => this.checkNamingConsistency()
        });
    }

    checkNamingConsistency() {
        const issues = [];
        
        // 检查控制器命名一致性
        if (window.MindmapController) {
            const controller = window.MindmapController;
            const dataId = controller.data ? controller.data.id : null;
            const rootId = controller.mind ? controller.mind.get_root()?.id : null;
            
            if (dataId !== rootId) {
                issues.push({
                    type: 'ID不一致',
                    description: `data.id (${dataId}) 与 root.id (${rootId}) 不匹配`,
                    severity: 'high'
                });
            }
        }

        // 检查全局状态
        if (window.__mindFullCache) {
            issues.push({
                type: '全局缓存污染',
                description: '__mindFullCache 仍然存在，可能影响ID解析',
                severity: 'medium'
            });
        }

        // 检查存储键冲突
        const storageKeys = Object.keys(localStorage);
        const mindmapKeys = storageKeys.filter(key => key.includes('mindmap_data'));
        if (mindmapKeys.length > 3) {
            issues.push({
                type: '存储键冗余',
                description: `检测到 ${mindmapKeys.length} 个脑图存储键，可能存在冗余`,
                severity: 'low'
            });
        }

        const statusElement = this.panelElement.querySelector('#naming-status');
        if (issues.length === 0) {
            statusElement.innerHTML = `
                <div style="color: #4fc1ff;">
                    ✅ 命名系统状态正常
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <span style="color: #f48771;">⚠️ 发现 ${issues.length} 个命名问题</span>
                </div>
                ${issues.map(issue => `
                    <div style="margin: 8px 0; padding: 8px; background: rgba(244, 135, 113, 0.1); border-left: 3px solid #f48771;">
                        <div style="font-weight: bold; color: #f48771;">${issue.type}</div>
                        <div style="font-size: 11px; color: #cccccc;">${issue.description}</div>
                        <div style="font-size: 10px; color: #999;">严重程度: ${issue.severity}</div>
                    </div>
                `).join('')}
            `;
        }
    }

    initSystemMonitor() {
        this.monitors.set('system', {
            interval: null,
            check: () => this.checkSystemInfo()
        });
    }

    checkSystemInfo() {
        const info = {
            userAgent: navigator.userAgent,
            url: window.location.href,
            protocol: window.location.protocol,
            localStorage: this.getLocalStorageInfo(),
            performance: this.getPerformanceInfo(),
            memory: this.getMemoryInfo()
        };

        const statusElement = this.panelElement.querySelector('#system-info');
        statusElement.innerHTML = `
            <div>
                <h4>浏览器信息</h4>
                <div style="font-size: 10px; color: #999; word-break: break-all;">${info.userAgent}</div>
            </div>
            
            <div style="margin-top: 12px;">
                <h4>页面信息</h4>
                <ul style="font-size: 11px;">
                    <li>URL: ${info.url}</li>
                    <li>协议: ${info.protocol}</li>
                </ul>
            </div>
            
            <div style="margin-top: 12px;">
                <h4>存储信息</h4>
                <ul style="font-size: 11px;">
                    <li>localStorage 项目数: ${info.localStorage.count}</li>
                    <li>存储大小: ${info.localStorage.size}</li>
                </ul>
            </div>
            
            <div style="margin-top: 12px;">
                <h4>性能信息</h4>
                <ul style="font-size: 11px;">
                    <li>页面加载时间: ${info.performance.loadTime}ms</li>
                    <li>DOM 节点数: ${info.performance.domNodes}</li>
                </ul>
            </div>
            
            ${info.memory ? `
                <div style="margin-top: 12px;">
                    <h4>内存信息</h4>
                    <ul style="font-size: 11px;">
                        <li>已使用: ${info.memory.used}MB</li>
                        <li>总限制: ${info.memory.limit}MB</li>
                    </ul>
                </div>
            ` : ''}
        `;
    }

    getLocalStorageInfo() {
        const keys = Object.keys(localStorage);
        const totalSize = keys.reduce((size, key) => {
            return size + (localStorage.getItem(key) || '').length;
        }, 0);
        
        return {
            count: keys.length,
            size: `${(totalSize / 1024).toFixed(1)}KB`
        };
    }

    getPerformanceInfo() {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domNodes = document.querySelectorAll('*').length;
        
        return {
            loadTime,
            domNodes
        };
    }

    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1),
                limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)
            };
        }
        return null;
    }

    bindEvents() {
        // 标签页切换
        this.panelElement.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 关闭按钮
        this.panelElement.querySelector('#close-debug-panel').addEventListener('click', () => {
            this.hide();
        });

        // 控制台按钮
        this.panelElement.querySelector('#clear-console').addEventListener('click', () => {
            this.logBuffer.length = 0;
            this.updateConsoleOutput();
        });

        this.panelElement.querySelector('#export-logs').addEventListener('click', () => {
            this.exportLogs();
        });

        // 脑图状态按钮
        this.panelElement.querySelector('#refresh-mindmap').addEventListener('click', () => {
            this.checkMindmapStatus();
        });

        // 命名检查按钮
        this.panelElement.querySelector('#check-naming').addEventListener('click', () => {
            this.checkNamingConsistency();
        });

        this.panelElement.querySelector('#auto-naming-check').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startNamingMonitor();
            } else {
                this.stopNamingMonitor();
            }
        });

        // 系统信息按钮
        this.panelElement.querySelector('#refresh-system').addEventListener('click', () => {
            this.checkSystemInfo();
        });

        // 快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    switchTab(tabName) {
        // 更新按钮状态
        this.panelElement.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 更新内容显示
        this.panelElement.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = content.id === `tab-${tabName}` ? 'block' : 'none';
        });

        this.activeTab = tabName;

        // 刷新当前标签页内容
        switch (tabName) {
            case 'console':
                this.updateConsoleOutput();
                break;
            case 'mindmap':
                this.checkMindmapStatus();
                break;
            case 'naming':
                this.checkNamingConsistency();
                break;
            case 'system':
                this.checkSystemInfo();
                break;
        }
    }

    show() {
        this.panelElement.style.display = 'block';
        this.isVisible = true;
        
        // 启动自动监控
        this.startNamingMonitor();
        
        // 刷新当前标签页
        this.switchTab(this.activeTab);
    }

    hide() {
        this.panelElement.style.display = 'none';
        this.isVisible = false;
        
        // 停止所有监控
        this.stopAllMonitors();
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    startNamingMonitor() {
        const monitor = this.monitors.get('naming');
        if (monitor && !monitor.interval) {
            monitor.interval = setInterval(() => {
                if (this.isVisible && this.activeTab === 'naming') {
                    monitor.check();
                }
            }, 5000);
        }
    }

    stopNamingMonitor() {
        const monitor = this.monitors.get('naming');
        if (monitor && monitor.interval) {
            clearInterval(monitor.interval);
            monitor.interval = null;
        }
    }

    stopAllMonitors() {
        this.monitors.forEach(monitor => {
            if (monitor.interval) {
                clearInterval(monitor.interval);
                monitor.interval = null;
            }
        });
    }

    exportLogs() {
        const logs = this.logBuffer.map(log => 
            `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// 全局暴露
if (typeof window !== 'undefined') {
    window.DebugPanel = new DebugPanel();
    
    // 便捷方法
    window.showDebug = () => window.DebugPanel.show();
    window.hideDebug = () => window.DebugPanel.hide();
    window.toggleDebug = () => window.DebugPanel.toggle();
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugPanel;
}

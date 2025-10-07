/**
 * 程序员 - StandardLogPanel.js
 * 
 * 日志系统整改 - 标准日志面板组件
 * 
 * 设计目标：
 * 1. 提供统一的日志UI组件
 * 2. 支持配置化（行数、滚动、折叠）
 * 3. 标准嵌入API
 * 4. 轻量级实现
 * 
 * 使用方式：
 * ```javascript
 * // 方式1：直接创建
 * const panel = new StandardLogPanel(container, { maxLines: 200 });
 * 
 * // 方式2：标准嵌入
 * StandardLogPanel.embed('#log-container', { maxLines: 200 });
 * ```
 * 
 * 架构对齐：
 * - 替代现有LogPanel组件
 * - 与EnhancedUnifiedLogger集成
 * - 满足用户实时日志采集需求
 */

;(function(global) {
    'use strict';

    /**
     * 标准日志面板
     */
    class StandardLogPanel {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? 
                document.querySelector(container) : container;
            
            if (!this.container) {
                throw new Error('StandardLogPanel: 容器元素不存在');
            }

            // 配置选项
            this.options = {
                maxLines: options.maxLines || 200,
                autoScroll: options.autoScroll !== false,
                collapsible: options.collapsible !== false,
                showTimestamp: options.showTimestamp !== false,
                showLevel: options.showLevel !== false,
                colorize: options.colorize !== false,
                height: options.height || '300px'
            };

            // 状态
            this.isCollapsed = false;
            this.isPaused = false;
            this.lineCount = 0;

            // 创建UI
            this._createUI();

            // 连接到日志器
            this._connectToLogger();

            console.log('[StandardLogPanel] ✅ 标准日志面板已初始化');
        }

        /**
         * 创建UI
         */
        _createUI() {
            // 创建面板容器
            const panel = document.createElement('div');
            panel.className = 'standard-log-panel';
            panel.style.cssText = `
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #f9f9f9;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
                overflow: hidden;
            `;

            // 创建头部
            const header = document.createElement('div');
            header.className = 'log-panel-header';
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #e9e9e9;
                border-bottom: 1px solid #ddd;
                cursor: pointer;
                user-select: none;
            `;

            const title = document.createElement('span');
            title.textContent = '📋 系统日志';
            title.style.fontWeight = 'bold';

            const controls = document.createElement('div');
            controls.style.cssText = 'display: flex; gap: 8px;';

            // 暂停/继续按钮
            const pauseBtn = document.createElement('button');
            pauseBtn.textContent = '⏸️ 暂停';
            pauseBtn.style.cssText = `
                padding: 2px 8px;
                border: 1px solid #ccc;
                border-radius: 3px;
                background: white;
                cursor: pointer;
                font-size: 11px;
            `;
            pauseBtn.onclick = (e) => {
                e.stopPropagation();
                this.togglePause();
            };
            this.pauseBtn = pauseBtn;

            // 清空按钮
            const clearBtn = document.createElement('button');
            clearBtn.textContent = '🗑️ 清空';
            clearBtn.style.cssText = pauseBtn.style.cssText;
            clearBtn.onclick = (e) => {
                e.stopPropagation();
                this.clear();
            };

            // 折叠按钮
            const collapseBtn = document.createElement('button');
            collapseBtn.textContent = '▼';
            collapseBtn.style.cssText = pauseBtn.style.cssText;
            collapseBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggle();
            };
            this.collapseBtn = collapseBtn;

            controls.appendChild(pauseBtn);
            controls.appendChild(clearBtn);
            if (this.options.collapsible) {
                controls.appendChild(collapseBtn);
            }

            header.appendChild(title);
            header.appendChild(controls);

            // 创建日志主体
            const body = document.createElement('div');
            body.className = 'log-panel-body';
            body.style.cssText = `
                height: ${this.options.height};
                overflow-y: auto;
                padding: 8px;
                background: white;
                white-space: pre-wrap;
                word-break: break-word;
            `;
            this.body = body;

            // 组装
            panel.appendChild(header);
            panel.appendChild(body);
            this.container.appendChild(panel);
            this.panel = panel;
        }

        /**
         * 连接到日志器
         */
        _connectToLogger() {
            // 监听日志事件
            if (global.AutogenEventBus && typeof global.AutogenEventBus.on === 'function') {
                global.AutogenEventBus.on('log:created', (entry) => {
                    this.append(entry.level, entry.message, entry.data);
                });
            }

            // 如果有EnhancedUnifiedLogger，获取现有日志
            if (global.UnifiedLogger && typeof global.UnifiedLogger.getLogBuffer === 'function') {
                const buffer = global.UnifiedLogger.getLogBuffer();
                buffer.slice(-50).forEach(entry => {
                    this.append(entry.level, entry.message, entry.data, true);
                });
            }
        }

        /**
         * 添加日志
         */
        append(level, message, data, silent = false) {
            if (this.isPaused) {
                return;
            }

            // 创建日志行
            const line = document.createElement('div');
            line.className = `log-line log-${level.toLowerCase()}`;
            line.style.cssText = `
                padding: 2px 0;
                border-bottom: 1px solid #f0f0f0;
            `;

            // 时间戳
            let content = '';
            if (this.options.showTimestamp) {
                const timestamp = new Date().toLocaleTimeString();
                content += `[${timestamp}] `;
            }

            // 级别
            if (this.options.showLevel) {
                const levelPrefix = this._getLevelPrefix(level);
                content += `[${levelPrefix}] `;
            }

            // 消息
            content += message;

            // 数据
            if (data && typeof data === 'object') {
                content += ' ' + JSON.stringify(data);
            } else if (data) {
                content += ' ' + String(data);
            }

            // 着色
            if (this.options.colorize) {
                line.style.color = this._getLevelColor(level);
            }

            line.textContent = content;
            this.body.appendChild(line);
            this.lineCount++;

            // 限制行数
            if (this.lineCount > this.options.maxLines) {
                this.body.removeChild(this.body.firstChild);
                this.lineCount--;
            }

            // 自动滚动
            if (this.options.autoScroll && !this.isCollapsed) {
                this.body.scrollTop = this.body.scrollHeight;
            }

            // 输出到原始console（如果不是静默模式）
            if (!silent) {
                const originalConsole = console[level.toLowerCase()] || console.log;
                originalConsole.call(console, `[${level}]`, message, data || '');
            }
        }

        /**
         * 清空日志
         */
        clear() {
            this.body.innerHTML = '';
            this.lineCount = 0;
            console.log('[StandardLogPanel] 日志已清空');
        }

        /**
         * 切换折叠状态
         */
        toggle() {
            this.isCollapsed = !this.isCollapsed;
            this.body.style.display = this.isCollapsed ? 'none' : 'block';
            this.collapseBtn.textContent = this.isCollapsed ? '▶' : '▼';
        }

        /**
         * 切换暂停状态
         */
        togglePause() {
            this.isPaused = !this.isPaused;
            this.pauseBtn.textContent = this.isPaused ? '▶️ 继续' : '⏸️ 暂停';
            console.log(`[StandardLogPanel] 日志${this.isPaused ? '已暂停' : '已继续'}`);
        }

        /**
         * 获取级别前缀
         */
        _getLevelPrefix(level) {
            const prefixes = {
                DEBUG: '🔍 DEBUG',
                INFO: 'ℹ️ INFO',
                WARN: '⚠️ WARN',
                ERROR: '❌ ERROR'
            };
            return prefixes[level] || level;
        }

        /**
         * 获取级别颜色
         */
        _getLevelColor(level) {
            const colors = {
                DEBUG: '#666666',
                INFO: '#0066CC',
                WARN: '#FFA500',
                ERROR: '#FF4444'
            };
            return colors[level] || '#000000';
        }

        /**
         * 销毁
         */
        destroy() {
            if (this.panel && this.panel.parentNode) {
                this.panel.parentNode.removeChild(this.panel);
            }
            console.log('[StandardLogPanel] 日志面板已销毁');
        }

        /**
         * 静态方法：标准嵌入
         */
        static embed(selector, options = {}) {
            const container = document.querySelector(selector);
            if (!container) {
                console.error(`[StandardLogPanel] 容器不存在: ${selector}`);
                return null;
            }
            return new StandardLogPanel(container, options);
        }

        /**
         * 静态方法：自动嵌入到页面
         */
        static autoEmbed(options = {}) {
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    StandardLogPanel._doAutoEmbed(options);
                });
            } else {
                StandardLogPanel._doAutoEmbed(options);
            }
        }

        static _doAutoEmbed(options) {
            // 查找或创建容器
            let container = document.getElementById('log-panel-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'log-panel-container';
                container.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 500px;
                    z-index: 9999;
                `;
                document.body.appendChild(container);
            }

            return new StandardLogPanel(container, options);
        }
    }

    // 导出到全局
    global.StandardLogPanel = StandardLogPanel;

    // 如果配置了自动嵌入，则自动创建
    if (global.LOG_PANEL_AUTO_EMBED) {
        StandardLogPanel.autoEmbed(global.LOG_PANEL_CONFIG || {});
    }

})(typeof window !== 'undefined' ? window : global);

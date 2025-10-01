/**
 * ColumnWarehouseUI - 工作栏仓库UI控制器
 * 程序员 - 工作栏生态系统UI组件
 * 
 * 职责：
 * - 提供可视化的仓库管理界面
 * - 工作栏上传/上线/下线/删除操作
 * - 版本历史查看和回滚
 * - 审计日志查看
 * 
 * 版本：v1.0.0
 * 创建日期：2025-10-01
 */

;(function(global) {
    'use strict';
    
    class ColumnWarehouseUI {
        constructor() {
            this.warehouseModal = null;
            this._initialized = false;
            
            console.log('[WarehouseUI] 构造函数执行');
        }
        
        /**
         * 初始化UI
         */
        async init() {
            if (this._initialized) {
                return;
            }
            
            this._initialized = true;
            
            // 等待ColumnWarehouse就绪
            await this._waitForWarehouse();
            
            // 创建UI元素
            this._createModal();
            
            // 绑定事件
            this._bindEvents();
            
            // 注册到全局
            global.ColumnWarehouseUI = this;
            
            console.log('[WarehouseUI] ✅ 初始化完成');
        }
        
        /**
         * 显示仓库管理界面
         */
        show() {
            if (!this.warehouseModal) {
                console.error('[WarehouseUI] 模态框未创建');
                return;
            }
            
            // 刷新列表
            this._refreshColumnList();
            
            // 显示模态框
            this.warehouseModal.style.display = 'flex';
        }
        
        /**
         * 隐藏仓库管理界面
         */
        hide() {
            if (this.warehouseModal) {
                this.warehouseModal.style.display = 'none';
            }
        }
        
        /**
         * 创建模态框UI
         * @private
         */
        _createModal() {
            const modal = document.createElement('div');
            modal.id = 'column-warehouse-modal';
            modal.className = 'warehouse-modal';
            
            modal.innerHTML = `
                <div class="warehouse-modal-content">
                    <div class="warehouse-header">
                        <h2>🏪 工作栏仓库</h2>
                        <button class="warehouse-close-btn" id="warehouse-close-btn">&times;</button>
                    </div>
                    
                    <div class="warehouse-body">
                        <!-- 工具栏 -->
                        <div class="warehouse-toolbar">
                            <button class="warehouse-btn warehouse-btn-primary" id="warehouse-upload-btn">
                                📤 上传工作栏
                            </button>
                            <button class="warehouse-btn" id="warehouse-refresh-btn">
                                🔄 刷新列表
                            </button>
                            <button class="warehouse-btn" id="warehouse-audit-btn">
                                📋 审计日志
                            </button>
                        </div>
                        
                        <!-- 统计信息 -->
                        <div class="warehouse-stats">
                            <div class="stat-item">
                                <span class="stat-label">仓库总数：</span>
                                <span class="stat-value" id="warehouse-total-count">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">已上线：</span>
                                <span class="stat-value stat-online" id="warehouse-online-count">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">已下线：</span>
                                <span class="stat-value stat-offline" id="warehouse-offline-count">0</span>
                            </div>
                        </div>
                        
                        <!-- 工作栏列表 -->
                        <div class="warehouse-list" id="warehouse-list">
                            <div class="warehouse-empty">
                                <p>📦 仓库为空</p>
                                <p style="font-size:14px;color:#888;">点击"上传工作栏"开始添加</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.warehouseModal = modal;
        }
        
        /**
         * 绑定事件
         * @private
         */
        _bindEvents() {
            // 关闭按钮
            const closeBtn = document.getElementById('warehouse-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }
            
            // 点击背景关闭
            this.warehouseModal.addEventListener('click', (e) => {
                if (e.target === this.warehouseModal) {
                    this.hide();
                }
            });
            
            // 上传按钮
            const uploadBtn = document.getElementById('warehouse-upload-btn');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', () => this._showUploadDialog());
            }
            
            // 刷新按钮
            const refreshBtn = document.getElementById('warehouse-refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this._refreshColumnList());
            }
            
            // 审计日志按钮
            const auditBtn = document.getElementById('warehouse-audit-btn');
            if (auditBtn) {
                auditBtn.addEventListener('click', () => this._showAuditLog());
            }
        }
        
        /**
         * 刷新工作栏列表
         * @private
         */
        _refreshColumnList() {
            const listContainer = document.getElementById('warehouse-list');
            if (!listContainer) return;
            
            const columns = global.ColumnWarehouse.getAllColumns();
            
            // 更新统计
            document.getElementById('warehouse-total-count').textContent = columns.length;
            document.getElementById('warehouse-online-count').textContent = 
                columns.filter(c => c.status === 'online').length;
            document.getElementById('warehouse-offline-count').textContent = 
                columns.filter(c => c.status === 'offline').length;
            
            if (columns.length === 0) {
                listContainer.innerHTML = `
                    <div class="warehouse-empty">
                        <p>📦 仓库为空</p>
                        <p style="font-size:14px;color:#888;">点击"上传工作栏"开始添加</p>
                    </div>
                `;
                return;
            }
            
            // 渲染工作栏卡片
            listContainer.innerHTML = columns.map(col => this._renderColumnCard(col)).join('');
            
            // 绑定卡片事件
            this._bindCardEvents();
        }
        
        /**
         * 渲染工作栏卡片
         * @private
         */
        _renderColumnCard(column) {
            const statusBadge = column.status === 'online' 
                ? '<span class="status-badge status-online">● 已上线</span>'
                : '<span class="status-badge status-offline">○ 已下线</span>';
            
            const historyCount = column.history ? column.history.length : 0;
            
            return `
                <div class="warehouse-card" data-column-id="${column.id}">
                    <div class="card-header">
                        <div class="card-title">
                            <span class="card-icon">${column.parsedConfig?.icon || '📦'}</span>
                            <span class="card-name">${column.name}</span>
                            ${statusBadge}
                        </div>
                        <div class="card-version">v${column.version}</div>
                    </div>
                    
                    <div class="card-body">
                        <div class="card-meta">
                            <div class="meta-item">
                                <span class="meta-label">ID:</span>
                                <span class="meta-value">${column.id}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">上传时间:</span>
                                <span class="meta-value">${new Date(column.uploadedAt).toLocaleString('zh-CN')}</span>
                            </div>
                            ${historyCount > 0 ? `
                            <div class="meta-item">
                                <span class="meta-label">历史版本:</span>
                                <span class="meta-value">${historyCount} 个</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        ${column.status === 'offline' ? `
                        <button class="card-btn card-btn-primary" data-action="online" data-column-id="${column.id}">
                            🚀 上线
                        </button>
                        ` : `
                        <button class="card-btn card-btn-warning" data-action="offline" data-column-id="${column.id}">
                            ⏸️ 下线
                        </button>
                        `}
                        
                        ${historyCount > 0 ? `
                        <button class="card-btn" data-action="history" data-column-id="${column.id}">
                            📜 历史
                        </button>
                        ` : ''}
                        
                        <button class="card-btn card-btn-danger" data-action="delete" data-column-id="${column.id}">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        }
        
        /**
         * 绑定卡片事件
         * @private
         */
        _bindCardEvents() {
            // 上线按钮
            document.querySelectorAll('.card-btn[data-action="online"]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const columnId = e.target.dataset.columnId;
                    await this._handleOnline(columnId);
                });
            });
            
            // 下线按钮
            document.querySelectorAll('.card-btn[data-action="offline"]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const columnId = e.target.dataset.columnId;
                    await this._handleOffline(columnId);
                });
            });
            
            // 历史按钮
            document.querySelectorAll('.card-btn[data-action="history"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const columnId = e.target.dataset.columnId;
                    this._showHistory(columnId);
                });
            });
            
            // 删除按钮
            document.querySelectorAll('.card-btn[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const columnId = e.target.dataset.columnId;
                    await this._handleDelete(columnId);
                });
            });
        }
        
        /**
         * 处理上线操作
         * @private
         */
        async _handleOnline(columnId) {
            if (!confirm('确定要上线此工作栏吗？')) {
                return;
            }
            
            console.log(`[WarehouseUI] 上线工作栏: ${columnId}`);
            const success = await global.ColumnWarehouse.bringOnline(columnId);
            
            if (success) {
                alert('✅ 上线成功！');
                this._refreshColumnList();
            } else {
                alert('❌ 上线失败，请查看控制台日志');
            }
        }
        
        /**
         * 处理下线操作
         * @private
         */
        async _handleOffline(columnId) {
            if (!confirm('确定要下线此工作栏吗？')) {
                return;
            }
            
            console.log(`[WarehouseUI] 下线工作栏: ${columnId}`);
            const success = await global.ColumnWarehouse.takeOffline(columnId);
            
            if (success) {
                alert('✅ 下线成功！');
                this._refreshColumnList();
            } else {
                alert('❌ 下线失败，请查看控制台日志');
            }
        }
        
        /**
         * 处理删除操作
         * @private
         */
        async _handleDelete(columnId) {
            const column = global.ColumnWarehouse.warehouseColumns.get(columnId);
            
            if (!confirm(`确定要删除工作栏"${column?.name}"吗？\n此操作不可恢复！`)) {
                return;
            }
            
            console.log(`[WarehouseUI] 删除工作栏: ${columnId}`);
            const success = await global.ColumnWarehouse.delete(columnId);
            
            if (success) {
                alert('✅ 删除成功！');
                this._refreshColumnList();
            } else {
                alert('❌ 删除失败，请查看控制台日志');
            }
        }
        
        /**
         * 显示版本历史
         * @private
         */
        _showHistory(columnId) {
            const column = global.ColumnWarehouse.warehouseColumns.get(columnId);
            
            if (!column || !column.history || column.history.length === 0) {
                alert('此工作栏没有历史版本');
                return;
            }
            
            const historyHtml = column.history.map((h, idx) => `
                <div style="padding:12px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px;">
                    <div style="font-weight:500;">版本 ${h.version}</div>
                    <div style="font-size:12px;color:#888;margin-top:4px;">
                        归档时间: ${new Date(h.archivedAt).toLocaleString('zh-CN')}
                    </div>
                    <button onclick="window.ColumnWarehouseUI._handleRollback('${columnId}', '${h.version}')" 
                            style="margin-top:8px;padding:4px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">
                        ⏮️ 回滚到此版本
                    </button>
                </div>
            `).join('');
            
            const historyModal = document.createElement('div');
            historyModal.style.cssText = `
                position:fixed;top:0;left:0;right:0;bottom:0;
                background:rgba(0,0,0,0.5);display:flex;
                align-items:center;justify-content:center;z-index:10001;
            `;
            
            historyModal.innerHTML = `
                <div style="background:white;padding:24px;border-radius:12px;max-width:600px;width:90%;max-height:80vh;overflow:auto;">
                    <h3 style="margin:0 0 16px 0;">📜 ${column.name} - 版本历史</h3>
                    <div style="margin-bottom:16px;">
                        <strong>当前版本:</strong> v${column.version}
                    </div>
                    <div>
                        ${historyHtml}
                    </div>
                    <button onclick="this.closest('div[style*=fixed]').remove()" 
                            style="margin-top:16px;padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer;width:100%;">
                        关闭
                    </button>
                </div>
            `;
            
            document.body.appendChild(historyModal);
        }
        
        /**
         * 处理回滚操作
         * @private
         */
        async _handleRollback(columnId, targetVersion) {
            if (!confirm(`确定要回滚到版本 ${targetVersion} 吗？\n当前版本将被保存到历史记录中。`)) {
                return;
            }
            
            console.log(`[WarehouseUI] 回滚工作栏: ${columnId} → v${targetVersion}`);
            const success = await global.ColumnWarehouse.rollback(columnId, targetVersion);
            
            if (success) {
                alert('✅ 回滚成功！');
                // 关闭历史模态框
                const historyModal = document.querySelector('div[style*="z-index:10001"]');
                if (historyModal) historyModal.remove();
                // 刷新列表
                this._refreshColumnList();
            } else {
                alert('❌ 回滚失败，请查看控制台日志');
            }
        }
        
        /**
         * 显示上传对话框
         * @private
         */
        _showUploadDialog() {
            // 创建文件选择输入
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.js';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    // 读取文件内容
                    const code = await this._readFileAsText(file);
                    
                    // 从文件名提取ID（去掉.js后缀）
                    const filename = file.name.replace(/\.js$/, '');
                    
                    // 提取元数据（从代码中解析）
                    const metadata = this._parseMetadataFromCode(code);
                    
                    // 显示确认对话框
                    const confirmed = confirm(
                        `📤 准备上传工作栏：\n\n` +
                        `文件名: ${file.name}\n` +
                        `ID: ${metadata.id || filename}\n` +
                        `名称: ${metadata.name || filename}\n` +
                        `版本: ${metadata.version || '1.0.0'}\n\n` +
                        `是否继续上传？`
                    );
                    
                    if (!confirmed) return;
                    
                    // 上传到仓库
                    const result = await global.ColumnWarehouse.upload({
                        id: metadata.id || filename,
                        name: metadata.name || filename,
                        version: metadata.version || '1.0.0',
                        code: code,
                        metadata: metadata.meta || {}
                    });
                    
                    if (result) {
                        alert('✅ 工作栏上传成功！');
                        this._refreshColumnList();
                    } else {
                        alert('❌ 上传失败，请查看控制台日志');
                    }
                    
                } catch (error) {
                    console.error('[WarehouseUI] 上传失败:', error);
                    alert(`❌ 上传失败：${error.message}`);
                } finally {
                    // 清理文件输入
                    document.body.removeChild(fileInput);
                }
            });
            
            // 添加到DOM并触发点击
            document.body.appendChild(fileInput);
            fileInput.click();
        }
        
        /**
         * 读取文件为文本
         * @private
         */
        _readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('文件读取失败'));
                reader.readAsText(file, 'UTF-8');
            });
        }
        
        /**
         * 从代码中解析元数据
         * @private
         */
        _parseMetadataFromCode(code) {
            const result = {
                id: null,
                name: null,
                version: null,
                meta: {}
            };
            
            try {
                // 提取 register 调用中的配置
                const registerMatch = code.match(/ColumnRegistry\.register\s*\(\s*{([\s\S]*?)}\s*\)/);
                
                if (registerMatch) {
                    const configStr = registerMatch[1];
                    
                    // 提取 id
                    const idMatch = configStr.match(/id:\s*['"]([^'"]+)['"]/);
                    if (idMatch) result.id = idMatch[1];
                    
                    // 提取 title (作为 name)
                    const titleMatch = configStr.match(/title:\s*['"]([^'"]+)['"]/);
                    if (titleMatch) result.name = titleMatch[1];
                    
                    // 提取 metadata 中的 version
                    const versionMatch = configStr.match(/version:\s*['"]([^'"]+)['"]/);
                    if (versionMatch) result.version = versionMatch[1];
                    
                    // 提取完整 metadata
                    const metadataMatch = configStr.match(/metadata:\s*{([\s\S]*?)}/);
                    if (metadataMatch) {
                        try {
                            // 简单解析（实际生产环境应使用更安全的方法）
                            const metaStr = '{' + metadataMatch[1] + '}';
                            result.meta = {
                                author: (metaStr.match(/author:\s*['"]([^'"]+)['"]/) || [])[1],
                                description: (metaStr.match(/description:\s*['"]([^'"]+)['"]/) || [])[1],
                                keywords: metaStr.match(/keywords:\s*\[(.*?)\]/) ? 
                                    metaStr.match(/keywords:\s*\[(.*?)\]/)[1].split(',').map(k => k.trim().replace(/['"]/g, '')) : []
                            };
                        } catch (e) {
                            console.warn('[WarehouseUI] metadata 解析失败:', e);
                        }
                    }
                }
                
            } catch (error) {
                console.warn('[WarehouseUI] 代码解析失败:', error);
            }
            
            return result;
        }
        
        /**
         * 显示审计日志
         * @private
         */
        _showAuditLog() {
            const logs = global.ColumnWarehouse.getAuditLog();
            
            const logHtml = logs.slice(-20).reverse().map(log => `
                <div style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">
                    <div style="font-weight:500;color:#3b82f6;">${log.action}</div>
                    <div style="color:#888;">${log.timestamp}</div>
                    <div style="color:#666;margin-top:4px;">${JSON.stringify(log.details, null, 2)}</div>
                </div>
            `).join('');
            
            const logModal = document.createElement('div');
            logModal.style.cssText = `
                position:fixed;top:0;left:0;right:0;bottom:0;
                background:rgba(0,0,0,0.5);display:flex;
                align-items:center;justify-content:center;z-index:10001;
            `;
            
            logModal.innerHTML = `
                <div style="background:white;padding:24px;border-radius:12px;max-width:800px;width:90%;max-height:80vh;overflow:auto;">
                    <h3 style="margin:0 0 16px 0;">📋 审计日志（最近20条）</h3>
                    <div style="font-family:monospace;">
                        ${logHtml || '<p style="color:#888;">暂无日志</p>'}
                    </div>
                    <button onclick="this.closest('div[style*=fixed]').remove()" 
                            style="margin-top:16px;padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer;width:100%;">
                        关闭
                    </button>
                </div>
            `;
            
            document.body.appendChild(logModal);
        }
        
        /**
         * 等待ColumnWarehouse就绪
         * @private
         */
        async _waitForWarehouse() {
            return new Promise((resolve) => {
                const check = () => {
                    if (global.ColumnWarehouse && global.ColumnWarehouse._initialized) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }
    }
    
    // 在DOM加载后初始化
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    whenReady(() => {
        const ui = new ColumnWarehouseUI();
        
        // 延迟初始化，等待ColumnWarehouse
        setTimeout(() => {
            ui.init();
        }, 500);
    });
    
})(window || this);

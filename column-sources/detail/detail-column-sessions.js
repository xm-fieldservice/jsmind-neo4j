/**
 * 节点详情工作栏 - 会话管理模块
 * 负责会话解析、渲染、多选、复制等功能
 */
class SessionManager {
    constructor() {
        this.sessions = [];
        this.selectedSessions = new Set();
        this.fsEditor = null;
    }
    
    /**
     * 解析会话列表（按 ## 标题分割）
     */
    parseSessions(content) {
        this.sessions = [];
        if (!content) return this.sessions;
        
        const lines = content.split('\n');
        let currentSession = null;
        let lineNumber = 0;
        
        lines.forEach((line, index) => {
            // 检测二级标题作为会话标题
            const match = line.match(/^##\s+(.+)$/);
            if (match) {
                // 保存上一个会话
                if (currentSession) {
                    currentSession.endLine = index - 1;
                    this.sessions.push(currentSession);
                }
                // 开始新会话
                currentSession = {
                    title: match[1].trim(),
                    startLine: index,
                    endLine: index,
                    raw: line + '\n',
                    content: []
                };
            } else if (currentSession) {
                currentSession.raw += line + '\n';
                if (line.trim()) {
                    currentSession.content.push(line);
                }
                currentSession.endLine = index;
            }
        });
        
        // 保存最后一个会话
        if (currentSession) {
            this.sessions.push(currentSession);
        }
        
        console.log('[SessionManager] 解析到', this.sessions.length, '个会话');
        return this.sessions;
    }
    
    /**
     * 渲染会话列表
     */
    renderSessionList(containerSelector = '#mm-session-items') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn('[SessionManager] 容器未找到:', containerSelector);
            return;
        }
        
        container.innerHTML = '';
        
        if (this.sessions.length === 0) {
            container.innerHTML = '<div class="mm-session-empty">📝 暂无会话<br/><small style="color:#bbb;">使用 ## 标题 创建会话</small></div>';
            return;
        }
        
        this.sessions.forEach((session, index) => {
            const item = this.createSessionItem(session, index);
            container.appendChild(item);
        });
    }
    
    /**
     * 创建会话项元素
     */
    createSessionItem(session, index) {
        const item = document.createElement('div');
        item.className = 'mm-session-item';
        item.dataset.index = index;
        
        // 选中状态
        if (this.selectedSessions.has(index)) {
            item.classList.add('selected');
        }
        
        // 复选框
        const checkLabel = document.createElement('label');
        checkLabel.className = 'mm-session-check';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mm-session-check-cb';
        checkbox.checked = this.selectedSessions.has(index);
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        checkbox.addEventListener('change', (e) => {
            this.toggleSessionSelection(index, e.target.checked);
        });
        checkLabel.appendChild(checkbox);
        
        // 标题
        const title = document.createElement('span');
        title.className = 'mm-session-title';
        title.textContent = session.title || `会话${index + 1}`;
        title.title = '单击定位，双击重命名';
        
        item.appendChild(checkLabel);
        item.appendChild(title);
        
        // 点击定位
        item.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            this.gotoSession(index);
        });
        
        // 双击重命名
        item.addEventListener('dblclick', () => {
            this.renameSession(index);
        });
        
        return item;
    }
    
    /**
     * 切换会话选中状态
     */
    toggleSessionSelection(index, checked) {
        if (checked) {
            this.selectedSessions.add(index);
        } else {
            this.selectedSessions.delete(index);
        }
        
        // 更新UI
        const item = document.querySelector(`.mm-session-item[data-index="${index}"]`);
        if (item) {
            item.classList.toggle('selected', checked);
        }
        
        // 同步全选按钮状态
        this.updateSelectAllCheckbox();
        
        console.log('[SessionManager] 选中会话数:', this.selectedSessions.size);
    }
    
    /**
     * 全选/全不选
     */
    selectAll(checked) {
        this.selectedSessions.clear();
        
        if (checked) {
            this.sessions.forEach((_, index) => {
                this.selectedSessions.add(index);
            });
        }
        
        // 更新所有复选框和样式
        document.querySelectorAll('.mm-session-item').forEach((item, index) => {
            const checkbox = item.querySelector('.mm-session-check-cb');
            if (checkbox) {
                checkbox.checked = checked;
            }
            item.classList.toggle('selected', checked);
        });
        
        console.log('[SessionManager] 全选:', checked, '选中数:', this.selectedSessions.size);
    }
    
    /**
     * 更新全选按钮状态
     */
    updateSelectAllCheckbox() {
        const checkbox = document.getElementById('mm-sel-all-cb');
        if (!checkbox) return;
        
        const total = this.sessions.length;
        const selected = this.selectedSessions.size;
        
        checkbox.indeterminate = selected > 0 && selected < total;
        checkbox.checked = total > 0 && selected === total;
    }
    
    /**
     * 定位到会话
     */
    gotoSession(index) {
        const session = this.sessions[index];
        if (!session || !this.fsEditor) return;
        
        // 计算行高
        const computedStyle = window.getComputedStyle(this.fsEditor);
        const lineHeight = parseInt(computedStyle.lineHeight) || 20;
        
        // 计算滚动位置
        const scrollTop = session.startLine * lineHeight;
        
        // 滚动到位置
        this.fsEditor.scrollTop = Math.max(0, scrollTop - 50); // 留点余量
        this.fsEditor.focus();
        
        // 选中会话标题行
        const lines = this.fsEditor.value.split('\n');
        let charPos = 0;
        for (let i = 0; i < session.startLine; i++) {
            charPos += lines[i].length + 1; // +1 for newline
        }
        
        this.fsEditor.setSelectionRange(charPos, charPos + lines[session.startLine].length);
        
        console.log('[SessionManager] 定位到会话', index, ':', session.title);
    }
    
    /**
     * 重命名会话
     */
    renameSession(index) {
        const session = this.sessions[index];
        if (!session || !this.fsEditor) return;
        
        const currentTitle = session.title || `会话${index + 1}`;
        const newTitle = window.prompt('重命名会话标题', currentTitle);
        
        if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) {
            return;
        }
        
        // 替换标题
        const lines = this.fsEditor.value.split('\n');
        lines[session.startLine] = `## ${newTitle.trim()}`;
        this.fsEditor.value = lines.join('\n');
        
        // 重新解析和渲染
        this.parseSessions(this.fsEditor.value);
        this.renderSessionList();
        
        console.log('[SessionManager] 会话重命名:', currentTitle, '->', newTitle);
    }
    
    /**
     * 新增会话
     */
    addSession() {
        if (!this.fsEditor) return;
        
        const pos = this.fsEditor.selectionStart;
        const before = this.fsEditor.value.substring(0, pos);
        const after = this.fsEditor.value.substring(pos);
        
        const newSessionText = '\n\n## 新会话\n\n';
        this.fsEditor.value = before + newSessionText + after;
        
        // 更新光标位置（定位到新会话内容区）
        const newPos = pos + newSessionText.length;
        this.fsEditor.setSelectionRange(newPos, newPos);
        this.fsEditor.focus();
        
        // 重新解析和渲染
        this.parseSessions(this.fsEditor.value);
        this.renderSessionList();
        
        console.log('[SessionManager] 新增会话');
    }
    
    /**
     * 复制所选会话
     */
    async copySelectedSessions() {
        if (this.selectedSessions.size === 0) {
            if (window.detailColumn) {
                window.detailColumn.showToast('请先选择要复制的会话', 'warning');
            }
            return;
        }
        
        const selected = Array.from(this.selectedSessions).sort((a, b) => a - b);
        const blocks = [];
        
        selected.forEach(index => {
            const session = this.sessions[index];
            if (session) {
                blocks.push(session.raw.trim());
            }
        });
        
        const text = blocks.join('\n\n---\n\n');
        
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // 回退方法
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            
            if (window.detailColumn) {
                window.detailColumn.showToast(`已复制 ${selected.length} 个会话`);
            }
            
            console.log('[SessionManager] 已复制', selected.length, '个会话');
        } catch (err) {
            console.error('[SessionManager] 复制失败:', err);
            if (window.detailColumn) {
                window.detailColumn.showToast('复制失败', 'error');
            }
        }
    }
    
    /**
     * 设置编辑器引用
     */
    setEditor(editor) {
        this.fsEditor = editor;
    }
    
    /**
     * 清空选择
     */
    clearSelection() {
        this.selectedSessions.clear();
        this.updateSelectAllCheckbox();
    }
}

// 创建全局实例
window.sessionManager = new SessionManager();

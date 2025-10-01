/**
 * 节点详情工作栏 - 核心逻辑模块
 * 负责基础功能：选项卡切换、预览、标签、附件、查询、数据加载
 */
class DetailColumnCore {
    constructor() {
        this.currentNode = null;
        this.testDataUrl = 'test-data.json'; // 测试数据底座
        this.init();
    }
    
    init() {
        this.bindPasteIcon();
        this.bindTagInteraction();
        this.bindAttachments();
        this.bindSaveAction();
        this.bindContentSync();
        this.bindImagePaste();
        
        // 图片存储
        this.pastedImages = new Map(); // 存储粘贴的图片
        
        // ⭐ 监听节点选择事件（模拟真实业务流程）
        this.listenNodeSelection();
        
        console.log('[DetailColumnCore] 核心模块初始化完成');
    }
    
    /**
     * 监听节点选择事件
     * 模拟真实场景：其他页面（如脑图、列表）点击节点后触发此事件
     */
    listenNodeSelection() {
        console.log('[DetailColumn] 开始注册事件监听器...');
        
        // 方式1：监听自定义事件（window级别）
        const eventHandler = async (event) => {
            console.log(`[DetailColumn] ✓ 接收到 node:selected 事件`, event);
            const nodeId = event.detail?.nodeId;
            if (nodeId) {
                console.log(`[DetailColumn] 节点ID: ${nodeId}`);
                await this.handleNodeSelection(nodeId);
            } else {
                console.warn(`[DetailColumn] ⚠️ 事件中缺少 nodeId`, event.detail);
            }
        };
        
        window.addEventListener('node:selected', eventHandler);
        console.log('[DetailColumn] ✓ 已注册 window.addEventListener("node:selected")');
        
        // 方式2：监听AutogenEventBus事件（如果可用）
        if (window.AutogenEventBus) {
            window.AutogenEventBus.on('node:selected', async (data) => {
                console.log(`[DetailColumn] ✓ 通过EventBus接收到事件`, data);
                const nodeId = data?.nodeId;
                if (nodeId) {
                    console.log(`[DetailColumn] EventBus节点ID: ${nodeId}`);
                    await this.handleNodeSelection(nodeId);
                }
            });
            console.log('[DetailColumn] ✓ 已注册 AutogenEventBus.on("node:selected")');
        } else {
            console.log('[DetailColumn] ℹ️ AutogenEventBus 不可用');
        }
        
        console.log('[DetailColumn] ✅ 所有节点选择监听器注册完成');
        
        // 测试：手动触发一次事件确认监听器工作正常
        console.log('[DetailColumn] 💡 测试监听器：可在控制台运行以下代码测试:');
        console.log('window.dispatchEvent(new CustomEvent("node:selected", {detail: {nodeId: "test_node_001"}}))');
    }
    
    /**
     * 处理节点选择
     * @param {string} nodeId - 节点ID
     */
    async handleNodeSelection(nodeId) {
        try {
            console.log(`[DetailColumn] 开始处理节点选择: ${nodeId}`);
            
            // 从数据底座加载节点数据
            await this.loadNodeFromTestData(nodeId);
            
            console.log(`[DetailColumn] 节点处理完成: ${nodeId}`);
            
        } catch (error) {
            console.error('[DetailColumn] 处理节点选择失败:', error);
            alert(`❌ 加载节点失败：\n${error.message}`);
        }
    }
    
    /**
     * 从测试数据底座加载节点数据
     * @param {string} nodeId - 节点ID
     */
    async loadNodeFromTestData(nodeId) {
        try {
            console.log(`[DetailColumnCore] 加载节点数据: ${nodeId}`);
            
            // 加载测试数据
            const response = await fetch(this.testDataUrl);
            if (!response.ok) {
                throw new Error(`加载失败: ${response.status}`);
            }
            
            const testData = await response.json();
            
            // 查找指定ID的节点
            const node = testData.nodes.find(n => n.id === nodeId);
            if (!node) {
                throw new Error(`节点不存在: ${nodeId}`);
            }
            
            // 加载到详情页
            this.loadNodeData(node);
            
            console.log(`[DetailColumnCore] 节点加载成功:`, node);
            
            // 通知测试台（如果存在）
            if (window.TestHarnessRecordOutput) {
                window.TestHarnessRecordOutput('currentNode', node);
            }
            
            return node;
            
        } catch (error) {
            console.error('[DetailColumnCore] 加载节点失败:', error);
            alert(`❌ 加载节点失败：\n${error.message}`);
            throw error;
        }
    }
    
    /**
     * 加载节点数据到UI
     * @param {Object} node - 节点数据对象
     */
    loadNodeData(node) {
        this.currentNode = node;
        
        // 加载标题
        const titleInput = document.getElementById('detail-title-input');
        if (titleInput) {
            titleInput.value = node.topic || '';
        }
        
        // 显示节点ID
        const nodeIdEl = document.getElementById('detail-node-id');
        if (nodeIdEl) {
            nodeIdEl.textContent = `ID: ${node.id}`;
        }
        
        // 加载内容
        const contentEditor = document.getElementById('detail-content-editor');
        if (contentEditor) {
            contentEditor.value = node.content || '';
        }
        
        // 加载标签（高亮显示）
        if (node.tags && node.tags.length > 0) {
            this.loadTags(node.tags);
        }
        
        // 加载图片
        if (node.images && node.images.length > 0) {
            this.loadImages(node.images);
        }
        
        // 加载附件
        if (node.attachments && node.attachments.length > 0) {
            this.loadAttachments(node.attachments);
        }
        
        console.log('[DetailColumnCore] UI数据已加载');
    }
    
    /**
     * 加载标签到UI（高亮显示）
     */
    loadTags(tags) {
        const tagChips = document.querySelectorAll('.tag-chip');
        
        // 先清除所有选中状态
        tagChips.forEach(chip => chip.classList.remove('selected'));
        
        // 高亮匹配的标签
        tags.forEach(tag => {
            tagChips.forEach(chip => {
                if (chip.dataset.tag === tag) {
                    chip.classList.add('selected');
                }
            });
        });
        
        console.log('[DetailColumnCore] 标签已加载:', tags);
    }
    
    /**
     * 加载图片到附件列表
     */
    loadImages(images) {
        const attachmentsList = document.getElementById('attachments-list');
        if (!attachmentsList) return;
        
        images.forEach((imageUrl, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="${imageUrl}" alt="图片${index + 1}" style="max-width: 100px; max-height: 100px; cursor: pointer;" onclick="window.open('${imageUrl}', '_blank')">
                <span>图片${index + 1}</span>
                <button class="btn-remove" onclick="this.parentElement.remove()">删除</button>
            `;
            attachmentsList.appendChild(li);
        });
        
        console.log('[DetailColumnCore] 图片已加载:', images.length);
    }
    
    /**
     * 加载附件到附件列表
     */
    loadAttachments(attachments) {
        const attachmentsList = document.getElementById('attachments-list');
        if (!attachmentsList) return;
        
        attachments.forEach(attachment => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>📎 ${attachment.name}</span>
                <span style="color: #999; font-size: 12px;">${attachment.size}</span>
                <button class="btn-remove" onclick="this.parentElement.remove()">删除</button>
            `;
            attachmentsList.appendChild(li);
        });
        
        console.log('[DetailColumnCore] 附件已加载:', attachments.length);
    }
    
    /**
     * 粘贴图标功能
     */
    bindPasteIcon() {
        const btn = document.getElementById('paste-icon-btn');
        
        btn.addEventListener('click', async () => {
            try {
                // 读取剪贴板
                const text = await navigator.clipboard.readText();
                
                // 检测是否为emoji或icon
                if (this.isEmojiOrIcon(text)) {
                    const titleInput = document.getElementById('detail-title-input');
                    const currentValue = titleInput.value || '';
                    
                    // 如果标题已有图标，替换；否则添加到前面
                    if (this.hasLeadingIcon(currentValue)) {
                        titleInput.value = text + ' ' + currentValue.substring(currentValue.indexOf(' ') + 1);
                    } else {
                        titleInput.value = text + ' ' + currentValue;
                    }
                    
                    console.log('[Icon] 图标已粘贴:', text);
                    // 不显示toast提示
                }
            } catch (err) {
                console.error('[Icon] 粘贴失败:', err);
                // 静默失败，不显示提示
            }
        });
    }
    
    /**
     * 标签交互（支持多选）
     */
    bindTagInteraction() {
        const chips = document.querySelectorAll('.tag-chip');
        
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                // 切换选中状态
                chip.classList.toggle('active');
                
                // 更新内容
                this.updateContentWithTags();
            });
        });
    }
    
    /**
     * 监听内容变化，同步标签状态
     */
    bindContentSync() {
        const contentEditor = document.getElementById('detail-content-editor');
        
        // 初始化时同步一次
        this.syncTagsFromContent();
        
        // 监听内容变化
        contentEditor.addEventListener('input', () => {
            // 防抖处理
            clearTimeout(this.syncTimer);
            this.syncTimer = setTimeout(() => {
                this.syncTagsFromContent();
            }, 500);
        });
    }
    
    
    /**
     * 从内容解析标签并同步到标签框
     */
    syncTagsFromContent() {
        const contentEditor = document.getElementById('detail-content-editor');
        const content = contentEditor.value;
        const lines = content.split('\n');
        
        // 解析内容中的标签
        const tagsInContent = new Set();
        
        for (const line of lines) {
            // 匹配格式: 标签: [组名] 标签1, 标签2
            const match = line.match(/^标签:\s*\[([^\]]+)\]\s*(.+)$/);
            if (match) {
                const tags = match[2].split(',').map(t => t.trim());
                tags.forEach(tag => tagsInContent.add(tag));
            }
        }
        
        // 同步到标签框
        const chips = document.querySelectorAll('.tag-chip');
        chips.forEach(chip => {
            const tag = chip.dataset.tag;
            if (tagsInContent.has(tag)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }
    
    /**
     * 将选中的标签添加到内容开头
     */
    updateContentWithTags() {
        const contentEditor = document.getElementById('detail-content-editor');
        const activeChips = document.querySelectorAll('.tag-chip.active');
        
        // 获取当前内容
        let content = contentEditor.value;
        
        // 移除旧的标签行（如果存在）
        const lines = content.split('\n');
        let startIndex = 0;
        
        // 跳过开头的标签行
        while (startIndex < lines.length && lines[startIndex].startsWith('标签:')) {
            startIndex++;
        }
        
        // 如果有空行也跳过
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
            startIndex++;
        }
        
        // 获取内容主体
        const mainContent = lines.slice(startIndex).join('\n');
        
        // 构建新的标签行
        if (activeChips.length > 0) {
            const tagsByGroup = {};
            
            activeChips.forEach(chip => {
                const group = chip.dataset.group;
                const tag = chip.dataset.tag;
                
                if (!tagsByGroup[group]) {
                    tagsByGroup[group] = [];
                }
                tagsByGroup[group].push(tag);
            });
            
            // 生成标签文本
            const tagLines = [];
            for (const [group, tags] of Object.entries(tagsByGroup)) {
                tagLines.push(`标签: [${group}] ${tags.join(', ')}`);
            }
            
            // 组合新内容
            contentEditor.value = tagLines.join('\n') + '\n\n' + mainContent;
        } else {
            // 没有标签，只保留主内容
            contentEditor.value = mainContent;
        }
    }
    
    /**
     * 图片粘贴功能
     */
    bindImagePaste() {
        const contentEditor = document.getElementById('detail-content-editor');
        
        if (!contentEditor) {
            console.warn('[ImagePaste] 编辑器未找到');
            return;
        }
        
        // 普通编辑器粘贴
        contentEditor.addEventListener('paste', (e) => {
            console.log('[ImagePaste] 粘贴事件触发');
            this.handleImagePaste(e, contentEditor);
        });
        
        console.log('[ImagePaste] 事件已绑定到编辑器');
    }
    
    /**
     * 处理图片粘贴
     */
    handleImagePaste(e, editor) {
        console.log('[ImagePaste] handleImagePaste调用');
        
        const clipboardData = e.clipboardData || e.originalEvent?.clipboardData;
        
        if (!clipboardData) {
            console.warn('[ImagePaste] clipboardData不存在');
            return;
        }
        
        const items = clipboardData.items;
        console.log('[ImagePaste] 剪贴板项目数:', items?.length);
        
        if (!items) {
            console.warn('[ImagePaste] items不存在');
            return;
        }
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log('[ImagePaste] 项目类型:', item.type);
            
            if (item.type.indexOf('image') !== -1) {
                console.log('[ImagePaste] 检测到图片');
                e.preventDefault(); // 阻止默认粘贴行为
                
                const file = item.getAsFile();
                console.log('[ImagePaste] 文件对象:', file);
                
                if (file) {
                    this.insertImageToEditor(file, editor);
                } else {
                    console.error('[ImagePaste] 无法获取文件对象');
                }
                return;
            }
        }
        
        console.log('[ImagePaste] 未检测到图片');
    }
    
    /**
     * 将图片插入到编辑器
     */
    insertImageToEditor(file, editor) {
        // 生成唯一ID
        const imageId = 'img_' + Date.now();
        
        // 创建blob URL
        const blobUrl = URL.createObjectURL(file);
        
        // 存储图片引用
        this.pastedImages.set(imageId, {
            file: file,
            blobUrl: blobUrl,
            name: file.name || `截图_${Date.now()}.png`,
            imageId: imageId
        });
        
        // 插入Markdown图片语法（使用简短引用）
        const cursorPos = editor.selectionStart;
        const beforeText = editor.value.substring(0, cursorPos);
        const afterText = editor.value.substring(cursorPos);
        
        const imageMarkdown = `![图片](${imageId})\n`;
        editor.value = beforeText + imageMarkdown + afterText;
        
        // 移动光标到插入内容后面
        const newPos = cursorPos + imageMarkdown.length;
        editor.setSelectionRange(newPos, newPos);
        
        // 添加到附件列表（作为图片附件）
        this.addImageToAttachmentList(imageId, file, blobUrl);
        
        console.log('[Image] 图片已插入:', imageId);
    }
    
    /**
     * 将粘贴的图片添加到附件列表
     */
    addImageToAttachmentList(imageId, file, blobUrl) {
        const list = document.getElementById('attachments-list');
        const li = document.createElement('li');
        li.className = 'attachment-item';
        li.dataset.imageId = imageId;
        
        const size = this.formatFileSize(file.size);
        
        li.innerHTML = `
            <div>
                <span class="attachment-name">🖼️ ${file.name || `截图_${Date.now()}.png`}</span>
                <div style="font-size:11px;color:#999;margin-top:2px;">${size} · 图片</div>
            </div>
            <div class="attachment-actions">
                <button class="btn btn-secondary btn-view-image" style="padding:4px 8px;font-size:12px;" data-blob-url="${blobUrl}" data-file-name="${file.name}">查看</button>
                <button class="btn btn-secondary btn-remove-image" style="padding:4px 8px;font-size:12px;" data-image-id="${imageId}">删除</button>
            </div>
        `;
        
        // 绑定查看按钮
        const viewBtn = li.querySelector('.btn-view-image');
        viewBtn.addEventListener('click', () => {
            this.viewImage(blobUrl, file.name);
        });
        
        // 绑定删除按钮
        const removeBtn = li.querySelector('.btn-remove-image');
        removeBtn.addEventListener('click', () => {
            this.removeImage(imageId, li);
        });
        
        list.appendChild(li);
        console.log('[Image] 图片已添加到附件列表');
    }
    
    /**
     * 查看图片
     */
    viewImage(blobUrl, fileName) {
        // 创建图片查看器弹窗
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;
        
        const img = document.createElement('img');
        img.src = blobUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        
        const fileName_div = document.createElement('div');
        fileName_div.textContent = fileName || '图片';
        fileName_div.style.cssText = `
            color: white;
            margin-top: 16px;
            font-size: 14px;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ 关闭';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.appendChild(img);
        overlay.appendChild(fileName_div);
        overlay.appendChild(closeBtn);
        
        // 点击背景关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        document.body.appendChild(overlay);
    }
    
    /**
     * 删除图片
     */
    removeImage(imageId, listItem) {
        if (!confirm('确定要删除这张图片吗？')) {
            return;
        }
        
        // 从内存中删除
        this.pastedImages.delete(imageId);
        
        // 从列表中删除
        listItem.remove();
        
        // 从编辑器内容中删除引用
        const contentEditor = document.getElementById('detail-content-editor');
        const content = contentEditor.value;
        const regex = new RegExp(`!\\[图片\\]\\(${imageId}\\)\\n?`, 'g');
        contentEditor.value = content.replace(regex, '');
        
        console.log('[Image] 图片已删除:', imageId);
    }
    
    /**
     * 附件管理
     */
    bindAttachments() {
        const btn = document.getElementById('add-attachment');
        const fileInput = document.getElementById('file-input-attachment');
        
        btn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                files.forEach(file => {
                    this.addAttachment(file);
                });
                this.showToast(`已添加 ${files.length} 个附件`);
            }
        });
    }
    
    /**
     * 查询功能（已移除）
     */
    
    /**
     * 保存到本地文件
     */
    bindSaveAction() {
        const btn = document.getElementById('save-content');
        btn.addEventListener('click', () => {
            this.saveToLocalFile();
        });
    }
    
    /**
     * 保存内容到本地文件（使用文件选择器）
     * 图片转换为base64嵌入
     */
    async saveToLocalFile() {
        const titleInput = document.getElementById('detail-title-input');
        const contentEditor = document.getElementById('detail-content-editor');
        
        const title = titleInput.value || '未命名';
        let content = contentEditor.value;
        
        if (!content || content.trim() === '') {
            this.showToast('内容为空，无法保存', 'warning');
            return;
        }
        
        try {
            // 将图片引用转换为base64嵌入
            content = await this.convertImagesToBase64(content);
            
            // 检查是否支持 File System Access API
            if ('showSaveFilePicker' in window) {
                // 使用现代文件选择器API
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${title}.md`,
                    types: [{
                        description: 'Markdown文件',
                        accept: { 'text/markdown': ['.md'] }
                    }]
                });
                
                // 创建可写流
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                
                console.log('[Save] 内容已保存（含图片）');
                this.showToast('内容已保存');
            } else {
                // 回退到下载方式
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title}.md`;
                
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                
                console.log('[Save] 内容已下载（含图片）');
                this.showToast(`已保存为 ${title}.md`);
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('[Save] 用户取消保存');
                this.showToast('已取消保存', 'warning');
            } else {
                console.error('[Save] 保存失败:', err);
                this.showToast('保存失败: ' + err.message, 'error');
            }
        }
    }
    
    /**
     * 将图片引用转换为base64嵌入
     */
    async convertImagesToBase64(content) {
        // 查找所有图片引用
        const imageRefs = content.match(/!\[([^\]]*)\]\((img_\d+)\)/g);
        
        if (!imageRefs || imageRefs.length === 0) {
            return content; // 没有图片，直接返回
        }
        
        console.log('[Save] 发现', imageRefs.length, '张图片，正在转换为base64...');
        
        let processedContent = content;
        
        for (const ref of imageRefs) {
            const match = ref.match(/!\[([^\]]*)\]\((img_\d+)\)/);
            if (match) {
                const alt = match[1];
                const imageId = match[2];
                
                const imageData = this.pastedImages.get(imageId);
                if (imageData && imageData.file) {
                    // 将文件转换为base64
                    const base64 = await this.fileToBase64(imageData.file);
                    
                    // 替换为base64嵌入
                    const base64Markdown = `![${alt}](${base64})`;
                    processedContent = processedContent.replace(ref, base64Markdown);
                    
                    console.log('[Save] 图片已转换:', imageId);
                }
            }
        }
        
        return processedContent;
    }
    
    /**
     * 将File对象转换为base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * 工具方法
     */
    isEmojiOrIcon(text) {
        // 简单检测：单个字符或emoji
        return text.length <= 5 && /[\u{1F000}-\u{1F9FF}]|[\p{Emoji}]/u.test(text);
    }
    
    hasLeadingIcon(text) {
        const firstChar = text.charAt(0);
        return this.isEmojiOrIcon(firstChar);
    }
    
    getSelectedTags(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return [];
        
        const activeTags = panel.querySelectorAll('.tag-chip.active');
        return Array.from(activeTags).map(chip => chip.textContent.trim());
    }
    
    renderMarkdown(markdown) {
        if (!markdown) return '<p style="color:#9ca3af;">无内容</p>';
        
        // 先替换图片引用为实际URL
        let processedMarkdown = markdown;
        
        // 替换图片引用：![图片](img_xxx) -> ![图片](blob:xxx)
        processedMarkdown = processedMarkdown.replace(/!\[([^\]]*)\]\((img_\d+)\)/g, (match, alt, imageId) => {
            const imageData = this.pastedImages.get(imageId);
            if (imageData) {
                return `![${alt}](${imageData.blobUrl})`;
            }
            return match;
        });
        
        // 使用marked.js渲染，如果可用
        if (window.marked) {
            return marked.parse(processedMarkdown);
        }
        
        // 简单的Markdown渲染（回退）
        return processedMarkdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:4px;margin:8px 0;" />')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>');
    }
    
    addAttachment(file) {
        const list = document.getElementById('attachments-list');
        const li = document.createElement('li');
        li.className = 'attachment-item';
        
        const icon = this.getFileIcon(file.type);
        const size = this.formatFileSize(file.size);
        
        // 创建文件URL
        const fileUrl = URL.createObjectURL(file);
        
        li.innerHTML = `
            <div>
                <span class="attachment-name">${icon} ${file.name}</span>
                <div style="font-size:11px;color:#999;margin-top:2px;">${size}</div>
            </div>
            <div class="attachment-actions">
                <button class="btn btn-secondary btn-open-attachment" style="padding:4px 8px;font-size:12px;" data-file-url="${fileUrl}" data-file-name="${file.name}" data-file-type="${file.type}">打开</button>
                <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;" onclick="this.closest('li').remove()">删除</button>
            </div>
        `;
        
        // 绑定打开事件
        const openBtn = li.querySelector('.btn-open-attachment');
        openBtn.addEventListener('click', () => {
            this.openAttachment(fileUrl, file.name, file.type);
        });
        
        list.appendChild(li);
    }
    
    /**
     * 打开附件
     */
    openAttachment(fileUrl, fileName, fileType) {
        console.log('[Attachment] 打开附件:', fileName, fileType);
        
        // 根据文件类型决定打开方式
        if (fileType.startsWith('image/')) {
            // 图片：在新窗口打开
            window.open(fileUrl, '_blank');
        } else if (fileType === 'application/pdf') {
            // PDF：在新窗口打开
            window.open(fileUrl, '_blank');
        } else if (fileType.startsWith('video/')) {
            // 视频：在新窗口打开
            window.open(fileUrl, '_blank');
        } else if (fileType.startsWith('text/') || fileType.includes('json')) {
            // 文本文件：在新窗口打开
            window.open(fileUrl, '_blank');
        } else {
            // 其他文件：下载
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            this.showToast('开始下载...');
        }
    }
    
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎬';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('word')) return '📘';
        if (mimeType.includes('excel')) return '📊';
        return '📄';
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast' + (type !== 'success' ? ` ${type}` : '');
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * 加载节点详情
     */
    loadNode(nodeData) {
        console.log('[DetailColumnCore] 加载节点:', nodeData);
        
        const titleInput = document.getElementById('detail-title-input');
        const nodeId = document.getElementById('detail-node-id');
        const contentEditor = document.getElementById('detail-content-editor');
        
        titleInput.value = nodeData.title || '';
        nodeId.textContent = `ID: ${nodeData.id || 'unknown'}`;
        contentEditor.value = nodeData.content || '';
        
        this.currentNode = nodeData;
        this.showToast('节点已加载');
    }
    
    /**
     * 获取当前编辑的数据
     */
    getCurrentData() {
        return {
            title: document.getElementById('detail-title-input').value,
            content: document.getElementById('detail-content-editor').value,
            tags: this.getSelectedTags('tag-panel')
        };
    }
}

// 暴露全局API
window.DetailColumnAPI = {
    loadNode: (nodeData) => {
        if (window.detailColumn) {
            window.detailColumn.loadNode(nodeData);
        }
    },
    
    getCurrentData: () => {
        if (window.detailColumn) {
            return window.detailColumn.getCurrentData();
        }
        return null;
    }
};

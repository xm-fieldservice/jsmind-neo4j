/**
 * 项目管理系统 - 四栏结构原型
 * 基础交互脚本
 */

// 全局变量
let jsMind = null;
let selectedNode = null;
let contextMenuTarget = null;
let isDragging = false;
let copiedNode = null;

// DOM元素引用
const contextMenu = document.getElementById('context-menu');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');
const modalTitle = document.querySelector('.modal-header h3');
const modalBody = document.querySelector('.modal-body');
const modalCancel = document.querySelector('.cancel-btn');
const modalConfirm = document.querySelector('.confirm-btn');
const contentPreview = document.getElementById('content-preview');
const contentTextarea = document.getElementById('detail-content');
const togglePreviewBtn = document.querySelector('.toggle-preview');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    initJsMind();
    initEventListeners();
    activateFirstProject();
});

/**
 * 初始化jsMind脑图
 */
function initJsMind() {
    // 创建示例数据
    const mindData = {
        meta: {
            name: "示例脑图",
            author: "项目管理系统",
            version: "1.0"
        },
        format: "node_array",
        data: [
            { id: "root", isroot: true, topic: "项目管理" },
            { id: "req", parentid: "root", topic: "需求分析", direction: "right" },
            { id: "design", parentid: "root", topic: "系统设计", direction: "right" },
            { id: "dev", parentid: "root", topic: "开发实现", direction: "right" },
            { id: "test", parentid: "root", topic: "测试部署", direction: "right" },
            { id: "req1", parentid: "req", topic: "用户需求" },
            { id: "req2", parentid: "req", topic: "功能需求" },
            { id: "design1", parentid: "design", topic: "架构设计" },
            { id: "design2", parentid: "design", topic: "数据库设计" },
            { id: "design3", parentid: "design", topic: "界面设计" },
            { id: "dev1", parentid: "dev", topic: "前端开发" },
            { id: "dev2", parentid: "dev", topic: "后端开发" },
            { id: "test1", parentid: "test", topic: "单元测试" },
            { id: "test2", parentid: "test", topic: "集成测试" },
            { id: "test3", parentid: "test", topic: "部署上线" }
        ]
    };

    // 配置选项
    const options = {
        container: 'jsmind-container',
        theme: 'primary',
        editable: true,
        mode: 'full',
        view: {
            hmargin: 100,
            vmargin: 50,
            line_width: 2,
            line_color: '#666'
        }
    };

    // 初始化jsMind
    try {
        jsMind = new jsMind(options);
        jsMind.show(mindData);
        
        // 选择默认节点
        setTimeout(() => {
            jsMind.select_node('design');
            updateNodeDetail('design');
        }, 500);
    } catch (e) {
        console.error("jsMind 初始化失败:", e);
        showToast("jsMind 加载失败，请确认库文件已正确引入", "error");
    }
}

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 导航按钮点击事件
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 项目列表点击事件
    document.querySelectorAll('.project-list li').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.project-list li').forEach(li => li.classList.remove('active'));
            this.classList.add('active');
            const projectTitle = this.querySelector('.project-title').textContent;
            showToast(`已选择项目: ${projectTitle}`);
        });
    });

    // 脑图工具栏按钮点击事件
    document.querySelectorAll('.mindmap-toolbar button').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleMindmapAction(action);
        });
    });

    // 选项卡切换事件
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // 内容预览切换
    togglePreviewBtn.addEventListener('click', function() {
        const isPreview = contentPreview.classList.contains('active');
        if (isPreview) {
            contentPreview.classList.remove('active');
            contentTextarea.style.display = 'block';
            this.textContent = '预览';
        } else {
            const markdown = contentTextarea.value;
            contentPreview.innerHTML = marked.parse(markdown);
            contentPreview.classList.add('active');
            contentTextarea.style.display = 'none';
            this.textContent = '编辑';
        }
    });

    // 脑图节点选择事件（假设jsMind已正确加载）
    if (typeof jsMind !== 'undefined' && jsMind) {
        jsMind.add_event_listener((type, data) => {
            if (type === 'select_node') {
                updateNodeDetail(data.node.id);
            }
        });
    }

    // 右键菜单相关事件
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', function(e) {
        if (e.target.closest('#context-menu') === null) {
            hideContextMenu();
        }
    });
    document.querySelectorAll('#context-menu li').forEach(item => {
        item.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action) {
                handleMindmapAction(action);
                hideContextMenu();
            }
        });
    });

    // 关系图筛选事件
    document.getElementById('relation-direction').addEventListener('change', function() {
        showToast(`已筛选关系方向: ${this.value}`);
    });

    // 模态框按钮事件
    modalCancel.addEventListener('click', hideModal);
    document.querySelector('.close-btn').addEventListener('click', hideModal);
    modalConfirm.addEventListener('click', function() {
        // 根据当前模态框的用途执行相应操作
        hideModal();
        showToast('操作已确认');
    });

    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
        // 如果正在编辑文本，不触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'Delete') {
            handleMindmapAction('remove');
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleMindmapAction('add-child');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleMindmapAction('add-sibling');
        } else if (e.key === 'c' && e.ctrlKey) {
            handleMindmapAction('copy');
        } else if (e.key === 'v' && e.ctrlKey) {
            handleMindmapAction('paste');
        } else if (e.key === 'x' && e.ctrlKey) {
            handleMindmapAction('cut');
        } else if (e.key === 'F2') {
            handleMindmapAction('edit');
        }
    });
}

/**
 * 激活第一个项目
 */
function activateFirstProject() {
    const firstProject = document.querySelector('.project-list li');
    if (firstProject) {
        firstProject.classList.add('active');
    }
}

/**
 * 处理脑图操作
 * @param {string} action - 操作类型
 */
function handleMindmapAction(action) {
    if (!jsMind) {
        showToast('jsMind 未初始化', 'error');
        return;
    }

    const selectedId = jsMind.get_selected_node()?.id;
    if (!selectedId && ['add-sibling', 'add-child', 'edit', 'remove'].includes(action)) {
        showToast('请先选择一个节点', 'warning');
        return;
    }

    switch (action) {
        case 'add-child':
            showAddNodeDialog('child', selectedId);
            break;
        case 'add-sibling':
            const parentNode = jsMind.get_node(selectedId)?.parent;
            if (!parentNode || parentNode.isroot) {
                showToast('根节点无法添加同级节点', 'warning');
                return;
            }
            showAddNodeDialog('sibling', selectedId);
            break;
        case 'remove':
            if (jsMind.get_node(selectedId)?.isroot) {
                showToast('无法删除根节点', 'warning');
                return;
            }
            showConfirmDialog('删除节点', `确定要删除节点"${jsMind.get_node(selectedId)?.topic}"吗？`, () => {
                jsMind.remove_node(selectedId);
                showToast('节点已删除');
            });
            break;
        case 'edit':
            const currentTopic = jsMind.get_node(selectedId)?.topic;
            showEditNodeDialog(selectedId, currentTopic);
            break;
        case 'copy':
            copiedNode = {
                id: selectedId,
                topic: jsMind.get_node(selectedId)?.topic
            };
            showToast('节点已复制到剪贴板');
            break;
        case 'cut':
            copiedNode = {
                id: selectedId,
                topic: jsMind.get_node(selectedId)?.topic,
                cut: true
            };
            showToast('节点已剪切到剪贴板');
            break;
        case 'paste':
            if (!copiedNode) {
                showToast('剪贴板为空', 'warning');
                return;
            }
            const newNodeId = 'node_' + Date.now();
            jsMind.add_node(jsMind.get_selected_node(), newNodeId, copiedNode.topic);
            if (copiedNode.cut) {
                jsMind.remove_node(copiedNode.id);
                copiedNode = null;
            }
            showToast('节点已粘贴');
            break;
        case 'zoom-in':
            jsMind.view.zoomIn();
            break;
        case 'zoom-out':
            jsMind.view.zoomOut();
            break;
        case 'fit':
            jsMind.view.setZoom('fit');
            break;
        default:
            showToast(`未实现的操作: ${action}`, 'warning');
    }
}

/**
 * 更新节点详情面板
 * @param {string} nodeId - 节点ID
 */
function updateNodeDetail(nodeId) {
    if (!jsMind) return;
    
    const node = jsMind.get_node(nodeId);
    if (!node) return;
    
    document.getElementById('detail-title').value = node.topic;
    document.querySelector('.node-id').textContent = `ID: ${nodeId}`;
    
    // 更新状态栏
    document.querySelector('.status-info span:first-child').textContent = `已选择: ${node.topic} (${nodeId})`;
}

/**
 * 显示添加节点对话框
 * @param {string} type - 'child' 或 'sibling'
 * @param {string} referenceId - 参考节点ID
 */
function showAddNodeDialog(type, referenceId) {
    const title = type === 'child' ? '添加子节点' : '添加同级节点';
    const referenceNode = jsMind.get_node(referenceId);
    const defaultName = type === 'child' ? `${referenceNode.topic}的子节点` : `新${referenceNode.topic}`;
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="node-name">节点名称</label>
            <input type="text" id="node-name" value="${defaultName}" class="full-width">
        </div>
    `;
    
    modalConfirm.onclick = () => {
        const nodeName = document.getElementById('node-name').value.trim();
        if (!nodeName) {
            showToast('节点名称不能为空', 'warning');
            return;
        }
        
        const newNodeId = 'node_' + Date.now();
        if (type === 'child') {
            jsMind.add_node(referenceNode, newNodeId, nodeName);
        } else {
            jsMind.add_node(referenceNode.parent, newNodeId, nodeName);
        }
        
        hideModal();
        showToast(`${title}成功`);
    };
    
    showModal();
}

/**
 * 显示编辑节点对话框
 * @param {string} nodeId - 节点ID
 * @param {string} currentTopic - 当前节点标题
 */
function showEditNodeDialog(nodeId, currentTopic) {
    modalTitle.textContent = '编辑节点';
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="node-name">节点名称</label>
            <input type="text" id="node-name" value="${currentTopic}" class="full-width">
        </div>
    `;
    
    modalConfirm.onclick = () => {
        const nodeName = document.getElementById('node-name').value.trim();
        if (!nodeName) {
            showToast('节点名称不能为空', 'warning');
            return;
        }
        
        jsMind.update_node(nodeId, nodeName);
        hideModal();
        showToast('节点已更新');
        updateNodeDetail(nodeId);
    };
    
    showModal();
}

/**
 * 显示确认对话框
 * @param {string} title - 对话框标题
 * @param {string} message - 对话框消息
 * @param {Function} onConfirm - 确认回调
 */
function showConfirmDialog(title, message, onConfirm) {
    modalTitle.textContent = title;
    modalBody.innerHTML = `<p>${message}</p>`;
    modalConfirm.onclick = () => {
        hideModal();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    };
    showModal();
}

/**
 * 切换选项卡
 * @param {string} tabId - 选项卡ID
 */
function switchTab(tabId) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
}

/**
 * 显示右键菜单
 * @param {Event} e - 事件对象
 */
function handleContextMenu(e) {
    // 只在脑图区域内显示右键菜单
    if (!e.target.closest('#jsmind-container')) {
        return;
    }
    
    e.preventDefault();
    
    // 获取选中的节点
    const nodeId = jsMind.get_selected_node()?.id;
    if (!nodeId) {
        showToast('请先选择一个节点', 'warning');
        return;
    }
    
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.display = 'block';
    
    // 禁用根节点不能执行的操作
    const isRoot = jsMind.get_node(nodeId)?.isroot;
    document.querySelector('#context-menu li[data-action="add-sibling"]').classList.toggle('disabled', isRoot);
    document.querySelector('#context-menu li[data-action="remove"]').classList.toggle('disabled', isRoot);
}

/**
 * 隐藏右键菜单
 */
function hideContextMenu() {
    contextMenu.style.display = 'none';
}

/**
 * 显示模态对话框
 */
function showModal() {
    modal.classList.add('show');
}

/**
 * 隐藏模态对话框
 */
function hideModal() {
    modal.classList.remove('show');
}

/**
 * 显示提示消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, warning, error)
 */
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

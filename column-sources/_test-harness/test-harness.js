/**
 * 工作栏测试台 - 主逻辑
 */

// 全局状态
const TestHarness = {
    columnId: null,
    columnTitle: null,
    columnDir: null,
    generator: null,
    inputDataCache: {},
    outputDataCache: {},
    testNodes: [],
    selectedNodeId: null,
    
    /**
     * 初始化测试台
     */
    init(columnId, columnTitle, columnDir) {
        this.columnId = columnId;
        this.columnTitle = columnTitle;
        this.columnDir = columnDir;
        this.generator = new InterfaceGenerator();
        
        // 更新页面标题
        document.getElementById('column-name').textContent = `${columnTitle} (${columnId})`;
        
        // 加载测试节点列表
        this.loadTestNodes();
        
        // 加载工作栏原料页面
        this.loadColumnSource();
        
        console.log(`[测试台] 已初始化: ${columnId}`);
    },
    
    /**
     * 加载测试节点列表
     */
    async loadTestNodes() {
        try {
            // 尝试从HTTP加载
            const response = await fetch(`../${this.columnId}/test-data.json`);
            if (!response.ok) {
                throw new Error(`HTTP加载失败: ${response.status}`);
            }
            
            const testData = await response.json();
            this.testNodes = testData.nodes || [];
            
            // 渲染节点列表
            this.renderNodeList();
            
            console.log(`[测试台] 已加载 ${this.testNodes.length} 个测试节点`);
            
        } catch (error) {
            console.warn('[测试台] HTTP加载失败，尝试使用嵌入式数据:', error);
            
            // 降级方案：使用嵌入式测试数据
            this.loadEmbeddedTestNodes();
        }
    },
    
    /**
     * 加载嵌入式测试节点（降级方案）
     */
    loadEmbeddedTestNodes() {
        // 嵌入式测试数据（从test-data.json复制）
        this.testNodes = [
            {
                id: "test_node_001",
                topic: "项目管理系统重构",
                tags: ["重要", "进行中", "项目"]
            },
            {
                id: "test_node_002",
                topic: "工作栏生态系统设计",
                tags: ["紧急", "进行中", "架构"]
            },
            {
                id: "test_node_003",
                topic: "详情页工作栏开发",
                tags: ["一般", "已完成", "开发"]
            },
            {
                id: "test_node_004",
                topic: "接口定义强制验证机制",
                tags: ["重要", "进行中", "架构"]
            },
            {
                id: "test_node_005",
                topic: "测试驱动开发实践",
                tags: ["一般", "待处理", "测试"]
            }
        ];
        
        // 渲染节点列表
        this.renderNodeList();
        
        console.log(`[测试台] 使用嵌入式数据，已加载 ${this.testNodes.length} 个测试节点`);
        
        // 显示提示
        const nodeListEl = document.getElementById('node-list');
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'padding: 8px; background: #fff3cd; border: 1px solid #ffc107; margin-bottom: 10px; font-size: 12px; border-radius: 4px;';
        warningDiv.innerHTML = '⚠️ 使用嵌入式数据。建议通过 <strong>http://localhost:8000</strong> 访问以获取完整数据。';
        nodeListEl.insertBefore(warningDiv, nodeListEl.firstChild);
    },
    
    /**
     * 渲染节点列表
     */
    renderNodeList() {
        const nodeListEl = document.getElementById('node-list');
        
        if (this.testNodes.length === 0) {
            nodeListEl.innerHTML = '<div class="node-list-loading">无测试节点</div>';
            return;
        }
        
        nodeListEl.innerHTML = '';
        
        this.testNodes.forEach((node, index) => {
            const nodeItem = document.createElement('div');
            nodeItem.className = 'node-item';
            nodeItem.dataset.nodeId = node.id;
            
            // 标签HTML
            const tagsHtml = node.tags && node.tags.length > 0
                ? `<div class="node-item-tags">
                    ${node.tags.map(tag => `<span class="node-item-tag">${tag}</span>`).join('')}
                   </div>`
                : '';
            
            nodeItem.innerHTML = `
                <div class="node-item-id">${node.id}</div>
                <div class="node-item-title">${node.topic}</div>
                ${tagsHtml}
            `;
            
            // 点击选中并立即发送
            nodeItem.addEventListener('click', async () => {
                this.selectNode(node.id);
                
                // ⭐ 立即触发事件（模拟点击节点）
                await this.sendNodeSelectionEvent(node.id);
            });
            
            nodeListEl.appendChild(nodeItem);
        });
        
        console.log('[测试台] 节点列表已渲染');
    },
    
    /**
     * 选中节点
     */
    selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        
        // 更新UI
        document.querySelectorAll('.node-item').forEach(item => {
            if (item.dataset.nodeId === nodeId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        console.log(`[测试台] 已选中节点: ${nodeId}`);
    },
    
    /**
     * 发送节点选择事件
     * @param {string} nodeId - 节点ID
     */
    async sendNodeSelectionEvent(nodeId) {
        // 记录到生成器
        this.generator.recordInput('nodeId', nodeId);
        this.inputDataCache['nodeId'] = nodeId;
        
        console.log(`[测试台] 触发节点选择事件: ${nodeId}`);
        logEvent('node.clicked', `点击节点: ${nodeId}`, 'info');
        
        // 调试：检查窗口关系
        console.log(`[测试台] 窗口检查:`, {
            hasOpener: !!window.opener,
            hasParent: window.parent !== window,
            openerOrigin: window.opener ? 'exists' : 'null',
            parentOrigin: window.parent !== window ? 'exists' : 'same'
        });
        
        // ⭐ 触发window级别的自定义事件
        try {
            const event = new CustomEvent('node:selected', {
                detail: { nodeId: nodeId },
                bubbles: true
            });
            
            // 如果有父窗口，向父窗口发送事件
            if (window.opener) {
                console.log(`[测试台] 准备向 window.opener 发送事件...`);
                window.opener.dispatchEvent(event);
                console.log(`[测试台] ✓ 已向 window.opener 发送事件`);
                logEvent('event.sent', `已发送到父窗口 (opener)`, 'success');
                
                // 调试：检查父窗口是否有监听器
                if (window.opener.detailColumn) {
                    console.log(`[测试台] ✓ 父窗口存在 detailColumn 对象`);
                } else {
                    console.warn(`[测试台] ⚠️ 父窗口不存在 detailColumn 对象`);
                }
                
            } else if (window.parent && window.parent !== window) {
                console.log(`[测试台] 准备向 window.parent 发送事件...`);
                window.parent.dispatchEvent(event);
                console.log(`[测试台] ✓ 已向 window.parent 发送事件`);
                logEvent('event.sent', `已发送到父窗口 (parent)`, 'success');
            } else {
                // 降级：在当前窗口发送（测试预览区域）
                console.log(`[测试台] 无父窗口，在当前窗口发送事件...`);
                window.dispatchEvent(event);
                console.log(`[测试台] ✓ 已在当前窗口发送事件`);
                logEvent('event.sent', `已发送到当前窗口`, 'warning');
                logEvent('hint', `💡 请确保从详情页点击"测试"按钮打开测试台`, 'info');
            }
            
        } catch (error) {
            console.error('[测试台] 发送事件失败:', error);
            logEvent('event.error', `发送失败: ${error.message}`, 'error');
        }
        
        // 通过AutogenEventBus发送（如果可用）
        try {
            const targetWindow = window.opener || window.parent;
            if (targetWindow && targetWindow.AutogenEventBus) {
                await targetWindow.AutogenEventBus.emit('node:selected', { nodeId: nodeId });
                console.log(`[测试台] ✓ 已通过EventBus发送`);
            }
        } catch (error) {
            // 静默失败
        }
    },
    
    /**
     * 加载工作栏原料页面
     */
    loadColumnSource() {
        const previewContainer = document.getElementById('column-preview');
        const statusEl = document.getElementById('preview-status');
        
        // 加载工作栏的 HTML
        fetch(`../${this.columnId}/${this.columnId}-column-layout.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                previewContainer.innerHTML = html;
                statusEl.textContent = '✅ 已加载';
                statusEl.className = 'status-ready';
                
                // 加载工作栏的样式
                this.loadColumnStyles();
                
                // 加载工作栏的脚本
                this.loadColumnScripts();
            })
            .catch(error => {
                console.error('[测试台] 加载工作栏失败:', error);
                statusEl.textContent = '⚠️ 降级模式';
                statusEl.className = 'status-warning';
                
                // 显示降级提示
                previewContainer.innerHTML = `
                    <div class="preview-placeholder">
                        <h3>⚠️ 无法加载工作栏预览</h3>
                        <p>原因：${error.message}</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        <p><strong>解决方案：</strong></p>
                        <ol style="text-align: left; display: inline-block;">
                            <li>确保通过 <code>http://localhost:8000</code> 访问</li>
                            <li>不要使用 <code>file://</code> 协议打开</li>
                            <li>在降级模式下，仍可测试节点发送功能</li>
                        </ol>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 14px;">💡 节点数据会发送到父窗口的工作栏中</p>
                    </div>
                `;
            });
    },
    
    /**
     * 加载工作栏样式
     */
    loadColumnStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `../${this.columnId}/${this.columnId}-column-styles.css`;
        document.head.appendChild(link);
        console.log('[测试台] 样式已加载');
    },
    
    /**
     * 加载工作栏脚本
     */
    loadColumnScripts() {
        const scripts = [
            `../${this.columnId}/${this.columnId}-column-core.js`,
            // 可能的其他模块
            `../${this.columnId}/${this.columnId}-column-sessions.js`,
            `../${this.columnId}/${this.columnId}-column-fullscreen.js`
        ];
        
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onerror = () => console.log(`[测试台] ${src} 不存在，跳过`);
            script.onload = () => console.log(`[测试台] ${src} 已加载`);
            document.body.appendChild(script);
        });
    }
};

/**
 * 发送输入数据到工作栏
 */
async function sendInputData() {
    const inputTextarea = document.getElementById('input-data');
    const inputText = inputTextarea.value.trim();
    
    if (!inputText) {
        alert('请输入测试数据');
        return;
    }
    
    try {
        // 解析 JSON
        const inputData = JSON.parse(inputText);
        
        // 记录到生成器
        for (const [key, value] of Object.entries(inputData)) {
            TestHarness.generator.recordInput(key, value);
            TestHarness.inputDataCache[key] = value;
        }
        
        console.log('[测试台] 发送输入数据:', inputData);
        
        // 记录事件
        logEvent('input.sent', '输入数据已发送', 'info');
        
        // ⭐ 调用工作栏的数据加载方法
        if (inputData.nodeId && window.parent && window.parent.detailColumn) {
            try {
                await window.parent.detailColumn.loadNodeFromTestData(inputData.nodeId);
                logEvent('data.loaded', `节点 ${inputData.nodeId} 已加载`, 'success');
                alert(`✅ 数据已加载到工作栏！\n节点ID: ${inputData.nodeId}`);
            } catch (error) {
                logEvent('data.load.error', `加载失败: ${error.message}`, 'error');
                alert(`❌ 加载失败：\n${error.message}`);
            }
        } else {
            alert('✅ 数据已发送！\n（如需加载真实数据，请提供 nodeId 字段）');
        }
        
    } catch (error) {
        alert(`❌ 输入数据格式错误：\n${error.message}`);
        console.error('[测试台] 解析失败:', error);
    }
}

/**
 * 发送选中的节点（手动触发）
 * ⭐ 点击节点时已自动发送，此按钮作为备用
 */
async function sendSelectedNode() {
    if (!TestHarness.selectedNodeId) {
        alert('❌ 请先选择一个测试节点');
        return;
    }
    
    await TestHarness.sendNodeSelectionEvent(TestHarness.selectedNodeId);
    
    // 显示提示
    setTimeout(() => {
        logEvent('manual.send', `✅ 已手动重新发送节点`, 'info');
    }, 100);
}

/**
 * 依次发送所有节点
 */
async function sendAllNodes() {
    if (TestHarness.testNodes.length === 0) {
        alert('❌ 无可发送的测试节点');
        return;
    }
    
    if (!confirm(`确定要依次发送全部 ${TestHarness.testNodes.length} 个节点吗？\n\n每个节点间隔1秒...`)) {
        return;
    }
    
    logEvent('batch.start', `开始批量发送 ${TestHarness.testNodes.length} 个节点`, 'info');
    
    for (let i = 0; i < TestHarness.testNodes.length; i++) {
        const node = TestHarness.testNodes[i];
        
        console.log(`[测试台] 发送节点 ${i + 1}/${TestHarness.testNodes.length}: ${node.id}`);
        
        // 选中并发送
        TestHarness.selectNode(node.id);
        await TestHarness.sendNodeSelectionEvent(node.id);
        
        // 等待1秒再发送下一个
        if (i < TestHarness.testNodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    logEvent('batch.complete', `✅ 已完成全部 ${TestHarness.testNodes.length} 个节点`, 'success');
    alert(`✅ 已完成！\n依次发送了 ${TestHarness.testNodes.length} 个节点。`);
}

/**
 * 切换手动输入
 */
function toggleManualInput() {
    const manualContainer = document.getElementById('manual-input-container');
    const isVisible = manualContainer.style.display !== 'none';
    
    manualContainer.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // 如果有选中的节点，自动填充
        if (TestHarness.selectedNodeId) {
            document.getElementById('input-data').value = JSON.stringify({
                nodeId: TestHarness.selectedNodeId
            }, null, 2);
        }
    }
}

/**
 * 清空输入
 */
function clearInput() {
    document.getElementById('input-data').value = '';
}

/**
 * 监听工作栏输出（需要工作栏主动调用）
 */
window.TestHarnessRecordOutput = function(outputName, outputValue) {
    TestHarness.generator.recordOutput(outputName, outputValue);
    TestHarness.outputDataCache[outputName] = outputValue;
    
    // 更新输出显示
    const outputDisplay = document.getElementById('output-data');
    outputDisplay.textContent = JSON.stringify(TestHarness.outputDataCache, null, 2);
    
    // 记录事件
    logEvent('output.received', `接收到输出: ${outputName}`, 'success');
    
    console.log('[测试台] 记录输出:', outputName, outputValue);
};

/**
 * 监听工作栏事件（需要工作栏主动调用）
 */
window.TestHarnessRecordEvent = function(eventName, eventPayload) {
    TestHarness.generator.recordEvent(eventName, eventPayload);
    
    // 记录事件日志
    logEvent(eventName, JSON.stringify(eventPayload), 'success');
    
    console.log('[测试台] 记录事件:', eventName, eventPayload);
};

/**
 * 记录事件到日志
 */
function logEvent(eventName, message, type = 'info') {
    const eventLog = document.getElementById('event-log');
    
    // 移除等待提示
    const waiting = eventLog.querySelector('.event-waiting');
    if (waiting) waiting.remove();
    
    // 添加事件项
    const eventItem = document.createElement('div');
    eventItem.className = `event-item event-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    eventItem.innerHTML = `
        <strong>${eventName}</strong>
        <span class="event-timestamp">${timestamp}</span>
        <div style="font-size: 12px; color: #666; margin-top: 3px;">${message}</div>
    `;
    
    eventLog.insertBefore(eventItem, eventLog.firstChild);
    
    // 限制事件数量
    const items = eventLog.querySelectorAll('.event-item');
    if (items.length > 20) {
        items[items.length - 1].remove();
    }
}

/**
 * 清空输出
 */
function clearOutputs() {
    document.getElementById('output-data').textContent = '等待工作栏输出...';
    document.getElementById('event-log').innerHTML = '<div class="event-item event-waiting">等待事件触发...</div>';
    TestHarness.outputDataCache = {};
}

/**
 * 验收通过 - 生成接口
 */
function acceptTest() {
    if (Object.keys(TestHarness.inputDataCache).length === 0) {
        alert('❌ 请先发送测试数据');
        return;
    }
    
    // 生成接口定义草稿
    const draft = TestHarness.generator.generateInterfaceDraft(
        TestHarness.columnId,
        TestHarness.columnTitle
    );
    
    console.log('[测试台] 生成接口草稿:', draft);
    
    // 显示接口编辑器
    showInterfaceEditor(draft);
    
    // 显示成功消息
    const resultDiv = document.getElementById('test-result');
    resultDiv.className = 'test-result success';
    resultDiv.innerHTML = `
        <strong>✅ 测试验收通过！</strong>
        <p>接口定义草稿已生成，请补充描述信息后保存。</p>
        <p><small>输入参数: ${draft.inputs.length} 个 | 输出参数: ${draft.outputs.length} 个 | 事件: ${draft.events.length} 个</small></p>
    `;
}

/**
 * 测试失败
 */
function rejectTest() {
    const resultDiv = document.getElementById('test-result');
    resultDiv.className = 'test-result error';
    resultDiv.innerHTML = `
        <strong>❌ 测试失败</strong>
        <p>请检查工作栏行为，修复问题后重新测试。</p>
    `;
    
    console.log('[测试台] 测试被标记为失败');
}

/**
 * 显示接口编辑器
 */
function showInterfaceEditor(draft) {
    const modal = document.getElementById('interface-editor-modal');
    const modalBody = document.getElementById('interface-editor-body');
    
    // 生成编辑表单
    let html = '';
    
    // 输入参数
    if (draft.inputs.length > 0) {
        html += '<div class="interface-section"><h3>📥 输入参数</h3>';
        draft.inputs.forEach((input, index) => {
            html += generateFieldEditor('input', input, index);
        });
        html += '</div>';
    }
    
    // 输出参数
    if (draft.outputs.length > 0) {
        html += '<div class="interface-section"><h3>📤 输出参数</h3>';
        draft.outputs.forEach((output, index) => {
            html += generateFieldEditor('output', output, index);
        });
        html += '</div>';
    }
    
    // 事件
    if (draft.events.length > 0) {
        html += '<div class="interface-section"><h3>📡 事件定义</h3>';
        draft.events.forEach((event, index) => {
            html += generateEventEditor(event, index);
        });
        html += '</div>';
    }
    
    modalBody.innerHTML = html;
    modal.style.display = 'flex';
    
    // 保存草稿到全局
    window.interfaceDraft = draft;
}

/**
 * 生成字段编辑器
 */
function generateFieldEditor(type, field, index) {
    return `
        <div class="interface-field">
            <div class="interface-field-header">
                <span class="interface-field-name">${field.name}</span>
                <span class="interface-field-type">${field.type}</span>
                <span class="interface-field-auto">✅ 自动推断</span>
            </div>
            <div class="interface-field-row">
                <label>描述 (必填):</label>
                <input type="text" 
                       data-type="${type}" 
                       data-index="${index}" 
                       data-field="description" 
                       placeholder="请输入字段描述">
            </div>
            ${type === 'input' ? `
            <div class="interface-field-row">
                <label>
                    <input type="checkbox" 
                           data-type="${type}" 
                           data-index="${index}" 
                           data-field="required" 
                           ${field.required ? 'checked' : ''}>
                    必填参数
                </label>
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * 生成事件编辑器
 */
function generateEventEditor(event, index) {
    return `
        <div class="interface-field">
            <div class="interface-field-header">
                <span class="interface-field-name">${event.name}</span>
                <span class="interface-field-auto">✅ 已捕获</span>
            </div>
            <div class="interface-field-row">
                <label>描述 (必填):</label>
                <input type="text" 
                       data-type="event" 
                       data-index="${index}" 
                       data-field="description" 
                       placeholder="请输入事件描述">
            </div>
        </div>
    `;
}

/**
 * 关闭接口编辑器
 */
function closeInterfaceEditor() {
    document.getElementById('interface-editor-modal').style.display = 'none';
}

/**
 * 保存接口定义
 */
function saveInterface() {
    const draft = window.interfaceDraft;
    if (!draft) return;
    
    // 收集用户填写的描述信息
    const inputs = document.querySelectorAll('[data-type="input"]');
    inputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        const field = input.dataset.field;
        if (field === 'description') {
            draft.inputs[index].description = input.value;
        } else if (field === 'required') {
            draft.inputs[index].required = input.checked;
        }
    });
    
    const outputs = document.querySelectorAll('[data-type="output"]');
    outputs.forEach(output => {
        const index = parseInt(output.dataset.index);
        const field = output.dataset.field;
        if (field === 'description') {
            draft.outputs[index].description = output.value;
        }
    });
    
    const events = document.querySelectorAll('[data-type="event"]');
    events.forEach(event => {
        const index = parseInt(event.dataset.index);
        const field = event.dataset.field;
        if (field === 'description') {
            draft.events[index].description = event.value;
        }
    });
    
    // 验证描述是否填写
    const missingDescriptions = [];
    draft.inputs.forEach(input => {
        if (!input.description) missingDescriptions.push(`输入参数: ${input.name}`);
    });
    draft.outputs.forEach(output => {
        if (!output.description) missingDescriptions.push(`输出参数: ${output.name}`);
    });
    draft.events.forEach(event => {
        if (!event.description) missingDescriptions.push(`事件: ${event.name}`);
    });
    
    if (missingDescriptions.length > 0) {
        alert(`❌ 请填写所有字段的描述信息：\n\n${missingDescriptions.join('\n')}`);
        return;
    }
    
    // 生成接口文件代码
    const code = TestHarness.generator.generateInterfaceCode(draft);
    
    // 下载文件
    downloadFile(`${draft.id}-interface-definition.js`, code);
    
    alert(`✅ 接口定义已生成！\n\n文件名: ${draft.id}-interface-definition.js\n\n请将此文件保存到工作栏目录中。`);
    
    closeInterfaceEditor();
}

/**
 * 下载文件
 */
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 关闭测试台
 */
function closeTestHarness() {
    if (confirm('确定要关闭测试台吗？未保存的测试数据将丢失。')) {
        window.close();
    }
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
    // 从 URL 参数获取工作栏信息
    const params = new URLSearchParams(window.location.search);
    const columnId = params.get('column') || 'detail';
    const columnTitle = params.get('title') || '详情页工作栏';
    const columnDir = params.get('dir') || `../${columnId}`;
    
    TestHarness.init(columnId, columnTitle, columnDir);
});

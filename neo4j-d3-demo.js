/**
 * Neo4j + D3.js 演示系统主脚本
 * 程序员
 */

// 全局变量
let graphViz = null;
let currentData = { nodes: [], links: [] };
let semanticTranslator = null;
let currentGeneratedCypher = null;
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('[演示系统] 初始化中...');
    initVisualization();
    initAITranslator();
    initLogCollector();
    bindEvents();
    checkConnection();
    loadDemoData();
    loadQueryHistory();
});

// 初始化可视化
function initVisualization() {
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    graphViz = new D3RelationGraph('graph-container', {
        width,
        height,
        nodeRadius: 25,
        linkDistance: 120,
        charge: -400
    });
    
    console.log('[演示系统] D3可视化已初始化');
}

// 初始化AI翻译器
function initAITranslator() {
    try {
        semanticTranslator = new SemanticTranslator({
            cacheEnabled: true
        });
        console.log('[演示系统] AI翻译器已初始化');
        
        // 检查API密钥
        checkAPIKey();
    } catch (error) {
        console.error('[演示系统] AI翻译器初始化失败:', error);
    }
}

// 检查API密钥
function checkAPIKey() {
    const apiKey = localStorage.getItem('deepseek_api_key');
    if (!apiKey) {
        console.warn('[演示系统] DeepSeek API密钥未配置');
        // 可以在这里添加提示UI
    }
}

// 初始化日志采集器
function initLogCollector() {
    if (window.logCollector) {
        // 添加日志监听器，实时更新UI
        window.logCollector.addListener((log) => {
            updateLogPreview(log);
        });
        console.log('[演示系统] 日志采集器已初始化');
    }
}

// 更新日志预览
function updateLogPreview(log) {
    const preview = document.getElementById('logPreview');
    if (!preview) return;
    
    const levelColors = {
        'log': '#10b981',
        'info': '#3b82f6',
        'warn': '#f59e0b',
        'error': '#ef4444'
    };
    
    const color = levelColors[log.level] || '#10b981';
    const logLine = document.createElement('div');
    logLine.style.color = color;
    logLine.textContent = `[${log.time}] ${log.level.toUpperCase()}: ${log.message}`;
    
    preview.appendChild(logLine);
    
    // 自动滚动到底部
    preview.scrollTop = preview.scrollHeight;
    
    // 只保留最后50条
    while (preview.children.length > 50) {
        preview.removeChild(preview.firstChild);
    }
}

// 加载查询历史
function loadQueryHistory() {
    if (!semanticTranslator) return;
    
    const select = document.getElementById('queryHistorySelect');
    const history = semanticTranslator.getHistory();
    
    // 清空现有选项
    select.innerHTML = '<option value="">📜 选择历史查询...</option>';
    
    // 添加历史记录（倒序，最新的在前）
    history.slice().reverse().forEach((item, index) => {
        const option = document.createElement('option');
        option.value = item.query;
        option.textContent = `${item.query.substring(0, 30)}${item.query.length > 30 ? '...' : ''} (${item.date})`;
        select.appendChild(option);
    });
    
    console.log('[演示系统] 已加载', history.length, '条查询历史');
}

// 绑定事件
function bindEvents() {
    // 文件上传区域
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // 文件选择变化
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            showFileInfo(e.target.files[0]);
        }
    });
    
    // 移除文件
    document.getElementById('removeFileBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        clearFileSelection();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            showFileInfo(files[0]);
        }
    });
    
    // 按钮事件
    document.getElementById('uploadBtn').addEventListener('click', handleFileUpload);
    document.getElementById('analyzeBtn').addEventListener('click', handleTextAnalysis);
    document.getElementById('aiQueryBtn').addEventListener('click', handleAIQuery);
    document.getElementById('executeCypherBtn').addEventListener('click', executeGeneratedCypher);
    document.getElementById('copyCypherBtn').addEventListener('click', copyCypher);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearQueryHistory);
    document.getElementById('queryHistorySelect').addEventListener('change', selectHistoryQuery);
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    document.getElementById('copyLogsBtn').addEventListener('click', copyLogs);
    document.getElementById('exportLogsBtn').addEventListener('click', exportLogs);
    document.getElementById('queryBtn').addEventListener('click', handleQuery);
    document.getElementById('fitBtn').addEventListener('click', resetZoom);
    document.getElementById('zoomInBtn').addEventListener('click', () => zoom(1.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoom(0.8));
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('clearBtn').addEventListener('click', clearGraph);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (graphViz && graphViz.simulation) {
            graphViz.simulation.alpha(1).restart();
        }
    });
    
    // 窗口大小变化
    window.addEventListener('resize', () => {
        const container = document.getElementById('graph-container');
        if (graphViz) {
            graphViz.resize(container.clientWidth, container.clientHeight);
        }
    });
}

// 检查Neo4j连接
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            updateStatus(true, 'Neo4j 已连接');
        } else {
            updateStatus(false, 'Neo4j 连接失败');
        }
    } catch (error) {
        console.warn('[演示系统] 无法连接到后端API，使用演示数据');
        updateStatus(false, '使用演示数据');
    }
}

// 更新状态指示器
function updateStatus(connected, text) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    dot.className = `status-dot ${connected ? 'connected' : 'error'}`;
    statusText.textContent = text;
}

// 显示文件信息
function showFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.style.display = 'block';
    
    console.log('[演示系统] 已选择文件:', file.name, formatFileSize(file.size));
}

// 清除文件选择
function clearFileSelection() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    
    fileInput.value = '';
    fileInfo.style.display = 'none';
    
    console.log('[演示系统] 已清除文件选择');
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 加载演示数据
function loadDemoData() {
    const demoData = {
        nodes: [
            { id: 'project1', label: '项目管理系统', type: 'project', description: '核心项目' },
            { id: 'task1', label: '需求分析', type: 'task', description: '项目第一阶段' },
            { id: 'task2', label: '架构设计', type: 'task', description: '系统架构设计' },
            { id: 'task3', label: '开发实现', type: 'task', description: '功能开发' },
            { id: 'person1', label: '张三', type: 'person', description: '项目经理' },
            { id: 'person2', label: '李四', type: 'person', description: '架构师' },
            { id: 'person3', label: '王五', type: 'person', description: '开发工程师' },
            { id: 'resource1', label: '开发服务器', type: 'resource', description: '云服务器' },
            { id: 'milestone1', label: 'MVP版本', type: 'milestone', description: '第一个里程碑' }
        ],
        links: [
            { source: 'project1', target: 'task1', type: 'contains', label: '包含', value: 2 },
            { source: 'project1', target: 'task2', type: 'contains', label: '包含', value: 2 },
            { source: 'project1', target: 'task3', type: 'contains', label: '包含', value: 2 },
            { source: 'task1', target: 'task2', type: 'precedes', label: '先于', value: 1 },
            { source: 'task2', target: 'task3', type: 'precedes', label: '先于', value: 1 },
            { source: 'person1', target: 'project1', type: 'manages', label: '管理', value: 3 },
            { source: 'person2', target: 'task2', type: 'responsible', label: '负责', value: 2 },
            { source: 'person3', target: 'task3', type: 'responsible', label: '负责', value: 2 },
            { source: 'task3', target: 'resource1', type: 'uses', label: '使用', value: 1 },
            { source: 'task3', target: 'milestone1', type: 'leads_to', label: '通向', value: 2 }
        ]
    };
    
    currentData = demoData;
    graphViz.loadData(demoData);
    updateStats(demoData);
    console.log('[演示系统] 演示数据已加载');
}

// 处理文件上传
async function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请选择文件');
        return;
    }
    
    const btn = document.getElementById('uploadBtn');
    const originalHTML = btn.innerHTML;
    
    try {
        // 显示上传状态
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>处理中...</span>';
        
        console.log('[演示系统] 开始处理文件:', file.name);
        
        const text = await file.text();
        let data;
        
        // 根据文件类型解析
        if (file.name.endsWith('.json') || file.name.endsWith('.mindmap.json')) {
            data = JSON.parse(text);
            await syncMindmapData(data);
        } else {
            // Markdown或文本文件
            await analyzeText(text);
        }
        
        alert('✅ 文件上传并处理成功！');
        clearFileSelection();
        
    } catch (error) {
        console.error('[演示系统] 文件处理失败:', error);
        alert('❌ 文件处理失败: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// 同步脑图数据到Neo4j
async function syncMindmapData(mindmapData) {
    try {
        const response = await fetch(`${API_BASE}/api/sync-mindmap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mindmapData)
        });
        
        if (!response.ok) {
            throw new Error('同步失败');
        }
        
        const result = await response.json();
        console.log('[演示系统] 同步结果:', result);
        
        // 重新加载图谱
        await handleQuery();
    } catch (error) {
        console.error('[演示系统] 同步失败:', error);
        throw error;
    }
}

// 处理文本分析
async function handleTextAnalysis() {
    const text = document.getElementById('textInput').value.trim();
    
    if (!text) {
        alert('请输入文本内容');
        return;
    }
    
    try {
        await analyzeText(text);
        alert('✅ 文本分析完成！');
    } catch (error) {
        console.error('[演示系统] 文本分析失败:', error);
        alert('❌ 文本分析失败: ' + error.message);
    }
}

// 分析文本（简化版实体和关系提取）
async function analyzeText(text) {
    // 简单的实体识别（实际应该使用NLP工具）
    const entities = extractEntities(text);
    const relationships = extractRelationships(text, entities);
    
    // 构建图数据
    const nodes = entities.map((entity, index) => ({
        id: `entity_${index}`,
        label: entity,
        type: guessEntityType(entity),
        description: `从文本中提取: ${entity}`
    }));
    
    const links = relationships.map(rel => ({
        source: `entity_${rel.source}`,
        target: `entity_${rel.target}`,
        type: rel.type,
        label: rel.label,
        value: 1
    }));
    
    const graphData = { nodes, links };
    currentData = graphData;
    graphViz.loadData(graphData);
    updateStats(graphData);
    
    console.log('[演示系统] 文本分析完成', { entities, relationships });
}

// 简单实体提取（基于规则）
function extractEntities(text) {
    const entities = [];
    
    // 提取中文人名（简化规则）
    const personPattern = /([张王李赵刘陈杨黄周吴徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓][一-龥]{1,2})/g;
    const persons = text.match(personPattern) || [];
    entities.push(...persons);
    
    // 提取项目/产品名（包含"项目"、"产品"、"系统"等关键词）
    const projectPattern = /([一-龥]+(?:项目|产品|系统|平台|应用))/g;
    const projects = text.match(projectPattern) || [];
    entities.push(...projects);
    
    // 提取任务/工作（包含"开发"、"设计"、"管理"等关键词）
    const taskPattern = /([一-龥]+(?:开发|设计|管理|实现|测试|部署))/g;
    const tasks = text.match(taskPattern) || [];
    entities.push(...tasks);
    
    // 去重
    return [...new Set(entities)];
}

// 简单关系提取
function extractRelationships(text, entities) {
    const relationships = [];
    
    // 检测"负责"关系
    for (let i = 0; i < entities.length; i++) {
        for (let j = 0; j < entities.length; j++) {
            if (i !== j) {
                const pattern = new RegExp(`${entities[i]}.*?负责.*?${entities[j]}`);
                if (pattern.test(text)) {
                    relationships.push({
                        source: i,
                        target: j,
                        type: 'responsible',
                        label: '负责'
                    });
                }
            }
        }
    }
    
    // 检测"汇报"关系
    for (let i = 0; i < entities.length; i++) {
        for (let j = 0; j < entities.length; j++) {
            if (i !== j) {
                const pattern = new RegExp(`${entities[i]}.*?(?:汇报|向).*?${entities[j]}`);
                if (pattern.test(text)) {
                    relationships.push({
                        source: i,
                        target: j,
                        type: 'reports_to',
                        label: '汇报给'
                    });
                }
            }
        }
    }
    
    // 检测"依赖"关系
    for (let i = 0; i < entities.length; i++) {
        for (let j = 0; j < entities.length; j++) {
            if (i !== j) {
                const pattern = new RegExp(`${entities[i]}.*?依赖.*?${entities[j]}`);
                if (pattern.test(text)) {
                    relationships.push({
                        source: i,
                        target: j,
                        type: 'depends_on',
                        label: '依赖于'
                    });
                }
            }
        }
    }
    
    return relationships;
}

// 猜测实体类型
function guessEntityType(entity) {
    if (/[张王李赵刘陈杨黄周吴徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓]/.test(entity[0])) {
        return 'person';
    }
    if (entity.includes('项目') || entity.includes('产品') || entity.includes('系统')) {
        return 'project';
    }
    if (entity.includes('开发') || entity.includes('设计') || entity.includes('测试')) {
        return 'task';
    }
    return 'default';
}

// 处理图谱查询
async function handleQuery() {
    const nodeId = document.getElementById('nodeId').value.trim();
    const depth = parseInt(document.getElementById('depth').value);
    const limit = parseInt(document.getElementById('limit').value);
    
    try {
        const params = new URLSearchParams();
        if (nodeId) params.append('node_id', nodeId);
        params.append('depth', depth);
        params.append('limit', limit);
        
        const response = await fetch(`${API_BASE}/api/neo4j/graph-data?${params}`);
        if (!response.ok) {
            throw new Error('查询失败');
        }
        
        const data = await response.json();
        currentData = data;
        graphViz.loadData(data);
        updateStats(data);
        
        console.log('[演示系统] 图谱查询成功', data);
        alert(`✅ 查询成功！加载了 ${data.nodes.length} 个节点和 ${data.links.length} 个关系`);
    } catch (error) {
        console.error('[演示系统] 查询失败:', error);
        alert('❌ 查询失败: ' + error.message);
    }
}

// 更新统计信息
function updateStats(data) {
    document.getElementById('nodeCount').textContent = data.nodes.length;
    document.getElementById('linkCount').textContent = data.links.length;
}

// 缩放控制
function zoom(factor) {
    if (!graphViz || !graphViz.svg) return;
    
    const svg = graphViz.svg;
    const currentTransform = d3.zoomTransform(svg.node());
    const newScale = currentTransform.k * factor;
    
    svg.transition().duration(300).call(
        d3.zoom().transform,
        d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newScale)
    );
}

// 重置缩放
function resetZoom() {
    if (!graphViz || !graphViz.svg) return;
    
    const svg = graphViz.svg;
    svg.transition().duration(300).call(
        d3.zoom().transform,
        d3.zoomIdentity
    );
}

// 导出数据
function exportData() {
    const dataStr = JSON.stringify(currentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-graph-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('[演示系统] 数据已导出');
}

// 清空图谱
function clearGraph() {
    if (confirm('确定要清空图谱吗？')) {
        graphViz.clear();
        currentData = { nodes: [], links: [] };
        updateStats(currentData);
        console.log('[演示系统] 图谱已清空');
    }
}

// 切换暂停/继续
function togglePause() {
    if (!graphViz || !graphViz.simulation) return;
    
    const btn = document.getElementById('pauseBtn');
    if (graphViz.simulation.alpha() > 0) {
        graphViz.simulation.stop();
        btn.textContent = '▶️ 继续';
    } else {
        graphViz.simulation.restart();
        btn.textContent = '⏸️ 暂停';
    }
}

// AI查询处理
async function handleAIQuery() {
    const input = document.getElementById('aiQueryInput').value.trim();
    
    if (!input) {
        alert('请输入查询内容');
        return;
    }
    
    // 检查API密钥
    if (!semanticTranslator || !semanticTranslator.config.apiKey) {
        const apiKey = prompt('请输入DeepSeek API密钥：\n\n获取地址：https://platform.deepseek.com/');
        if (apiKey) {
            semanticTranslator.setApiKey(apiKey);
        } else {
            return;
        }
    }
    
    const btn = document.getElementById('aiQueryBtn');
    const originalHTML = btn.innerHTML;
    
    try {
        // 显示加载状态
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>AI思考中...</span>';
        
        // 调用AI翻译
        const result = await semanticTranslator.translate(input);
        
        if (!result.isValid) {
            throw new Error('生成的Cypher语法无效');
        }
        
        // 显示生成的Cypher
        document.getElementById('cypherCode').textContent = result.cypher;
        document.getElementById('generatedCypherPanel').style.display = 'block';
        
        // 保存当前Cypher
        currentGeneratedCypher = result.cypher;
        
        console.log('[AI查询] 翻译成功:', result);
        
        // 显示统计信息
        const stats = semanticTranslator.getStats();
        console.log('[AI查询] 统计信息:', stats);
        
        // 刷新历史列表
        loadQueryHistory();
        
    } catch (error) {
        console.error('[AI查询] 失败:', error);
        alert('❌ AI查询失败: ' + error.message);
        document.getElementById('generatedCypherPanel').style.display = 'none';
    } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// 执行生成的Cypher
async function executeGeneratedCypher() {
    if (!currentGeneratedCypher) {
        alert('没有可执行的查询');
        return;
    }
    
    const btn = document.getElementById('executeCypherBtn');
    const originalHTML = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>执行中...</span>';
        
        console.log('[执行Cypher] 准备执行:', currentGeneratedCypher);
        
        // 调用后端执行Cypher
        const response = await fetch(`${API_BASE}/api/neo4j/execute-cypher`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cypher: currentGeneratedCypher
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log('[执行Cypher] 查询结果:', data);
        
        // 更新图谱
        currentData = data;
        graphViz.loadData(data);
        updateStats(data);
        
        alert(`✅ 查询成功！加载了 ${data.nodes.length} 个节点和 ${data.links.length} 个关系`);
        
    } catch (error) {
        console.error('[执行Cypher] 失败:', error);
        
        // 更友好的错误提示
        let errorMsg = '❌ 执行失败\n\n';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg += '原因：无法连接到后端服务\n\n';
            errorMsg += '解决方案：\n';
            errorMsg += '1. 确保后端服务已启动\n';
            errorMsg += '2. 检查端口配置（默认8000）\n';
            errorMsg += '3. 或者使用"复制"按钮，手动执行Cypher';
        } else {
            errorMsg += '原因：' + error.message + '\n\n';
            errorMsg += '提示：可以复制Cypher到Neo4j Browser手动执行';
        }
        
        alert(errorMsg);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// 复制Cypher
function copyCypher() {
    if (!currentGeneratedCypher) return;
    
    navigator.clipboard.writeText(currentGeneratedCypher).then(() => {
        const btn = document.getElementById('copyCypherBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>✅</span> <span>已复制</span>';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

// 清空查询历史
function clearQueryHistory() {
    if (confirm('确定要清空所有查询历史吗？')) {
        if (semanticTranslator) {
            semanticTranslator.clearHistory();
            loadQueryHistory();
            console.log('[演示系统] 查询历史已清空');
        }
    }
}

// 选择历史查询
function selectHistoryQuery(event) {
    const query = event.target.value;
    if (query) {
        document.getElementById('aiQueryInput').value = query;
        console.log('[演示系统] 已选择历史查询:', query);
    }
}

// 清空日志（与主程序一致）
function clearLogs() {
    const preview = document.getElementById('logPreview');
    if (preview) {
        preview.textContent = '';
        console.log('[演示系统] 日志已清空');
    }
    
    // 同时清空LogCollector
    if (window.logCollector) {
        window.logCollector.clearLogs();
    }
}

// 复制日志到剪贴板（与主程序一致）
function copyLogs() {
    const preview = document.getElementById('logPreview');
    if (!preview) return;
    
    const logText = preview.textContent || '';
    
    try {
        navigator.clipboard.writeText(logText).then(() => {
            alert('日志已复制到剪贴板');
            console.log('[演示系统] 日志已复制');
        }).catch(err => {
            console.error('[演示系统] 复制失败:', err);
            alert('复制失败，请手动复制');
        });
    } catch (error) {
        console.error('[演示系统] 复制失败:', error);
        alert('复制失败，请手动复制');
    }
}

// 导出日志为JSON文件
function exportLogs() {
    if (window.logCollector) {
        window.logCollector.exportLogs();
        console.log('[演示系统] 日志已导出');
    } else {
        alert('日志采集器未初始化');
    }
}

console.log('[演示系统] 脚本已加载');

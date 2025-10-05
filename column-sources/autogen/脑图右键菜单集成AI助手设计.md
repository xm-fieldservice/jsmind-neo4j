# agent-脑图右键菜单集成AI助手设计文档

## 概述
在现有脑图右键菜单基础上集成"🤖 AI助手"功能，通过点击菜单项调用Autogen Agent处理节点内容。

## 现有右键菜单结构分析

### 当前菜单项
```javascript
// 现有菜单结构
- 拷贝节点标题到剪贴板 (copy-title)
- 拷贝节点和内容到剪贴板 (copy-content)
- --- 分隔线 ---
- 拷贝节点树标题（带格式） (copy-tree-titles)
- 拷贝节点树MD格式 (copy-tree-markdown)
- --- 分隔线 ---
- 粘贴到内容框尾部 (paste-content)
```

### 集成方案
在现有菜单结构中添加AI助手选项：

```javascript
// 新菜单结构
- 拷贝节点标题到剪贴板 (copy-title)
- 拷贝节点和内容到剪贴板 (copy-content)
- --- 分隔线 ---
- 拷贝节点树标题（带格式） (copy-tree-titles)
- 拷贝节点树MD格式 (copy-tree-markdown)
- --- 分隔线 ---
- 🤖 AI助手 (ai-assistant) // 新增
- 粘贴到内容框尾部 (paste-content)
```

## 技术实现方案

### 1. 菜单HTML修改
在 [`context-menu-manager.js`](column-sources/mindmap/context-menu-manager.js:38) 的 `createMenuDOM` 方法中添加AI助手菜单项：

```javascript
// 在现有菜单HTML中添加
<div class="context-menu-divider"></div>
<div class="context-menu-item" data-action="ai-assistant">
    <span class="context-menu-item-icon">🤖</span>
    <span>AI助手</span>
</div>
```

### 2. 事件处理函数
在 [`context-menu-manager.js`](column-sources/mindmap/context-menu-manager.js:104) 的 `switch` 语句中添加AI助手处理：

```javascript
case 'ai-assistant':
    await this.handleAIAssistant();
    break;
```

### 3. AI助手核心功能实现

#### 3.1 数据收集
```javascript
async handleAIAssistant() {
    if (!this.currentNode) return;
    
    // 收集节点数据
    const nodeData = {
        node_id: this.currentNode.id,
        node_topic: this.currentNode.topic,
        node_content: this.currentNode.data?.content || '',
        node_type: this.currentNode.data?.type || 'default',
        parent_id: this.currentNode.parent?.id || null,
        children_count: this.currentNode.children?.length || 0,
        // 可选：收集子树信息用于上下文理解
        subtree_info: this.collectSubtreeInfo(this.currentNode)
    };
    
    // 调用Agent API
    await this.callAIAgent(nodeData);
}
```

#### 3.2 Agent通信模块
```javascript
async callAIAgent(nodeData) {
    try {
        // 显示加载状态
        this.showLoadingState();
        
        // 准备请求数据
        const requestData = {
            node_data: nodeData,
            user_intent: 'analyze_and_enhance', // 默认意图，后续可扩展
            mindmap_context: this.getMindmapContext(),
            timestamp: new Date().toISOString()
        };
        
        // 调用后端Agent API
        const response = await fetch('/api/agent/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`Agent API错误: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 处理Agent返回结果
        await this.processAgentResult(result);
        
    } catch (error) {
        console.error('[AI助手] 调用失败:', error);
        this.showErrorMessage('AI助手调用失败: ' + error.message);
    } finally {
        this.hideLoadingState();
    }
}
```

#### 3.3 结果处理逻辑
```javascript
async processAgentResult(result) {
    const { action, data, message } = result;
    
    switch (action) {
        case 'update_node':
            // 更新节点内容
            await this.updateNodeContent(data);
            break;
            
        case 'create_children':
            // 创建子节点
            await this.createChildNodes(data);
            break;
            
        case 'suggest_improvements':
            // 显示改进建议
            this.showImprovementSuggestions(data);
            break;
            
        case 'generate_content':
            // 生成新内容
            await this.generateNewContent(data);
            break;
            
        case 'show_analysis':
            // 显示分析结果
            this.showAnalysisResult(data);
            break;
            
        default:
            console.warn('[AI助手] 未知操作类型:', action);
            this.showInfoMessage(message || '操作完成');
    }
    
    // 触发事件通知
    if (window.AutogenEventBus) {
        window.AutogenEventBus.emit('mindmap.ai.assistant.completed', {
            nodeId: this.currentNode.id,
            action: action,
            success: true
        });
    }
}
```

### 4. 用户界面增强

#### 4.1 加载状态指示
```javascript
showLoadingState() {
    // 显示加载动画或禁用菜单
    const menuItem = this.menu.querySelector('[data-action="ai-assistant"]');
    if (menuItem) {
        menuItem.innerHTML = '<span class="context-menu-item-icon">⏳</span><span>处理中...</span>';
        menuItem.style.pointerEvents = 'none';
    }
}

hideLoadingState() {
    // 恢复原始状态
    const menuItem = this.menu.querySelector('[data-action="ai-assistant"]');
    if (menuItem) {
        menuItem.innerHTML = '<span class="context-menu-item-icon">🤖</span><span>AI助手</span>';
        menuItem.style.pointerEvents = 'auto';
    }
}
```

#### 4.2 结果展示界面
- 使用模态框显示详细分析结果
- 侧边栏展示操作历史
- 实时预览Agent建议的更改

### 5. 错误处理机制

```javascript
showErrorMessage(message) {
    console.error('[AI助手] 错误:', message);
    
    // 使用现有的错误处理机制
    if (window.ErrorHandler) {
        window.ErrorHandler.handle(new Error(message), {
            component: 'AIAssistant',
            action: 'call_agent'
        });
    }
    
    // 用户友好的错误提示
    alert(`AI助手遇到问题: ${message}`);
}

showInfoMessage(message) {
    console.log('[AI助手] 信息:', message);
    
    // 使用LogPanel或toast通知
    if (window.LogPanel) {
        window.LogPanel.log(`🤖 ${message}`);
    }
}
```

## 集成点分析

### 与现有系统的集成
1. **事件系统集成**: 通过 [`AutogenEventBus`](src/core/messaging/AutogenEventBus.js) 发送操作完成事件
2. **错误处理集成**: 使用现有的 [`ErrorHandler`](column-sources/mindmap/context-menu-manager.js:123) 机制
3. **日志系统集成**: 通过 [`LogPanel`](column-sources/mindmap/context-menu-manager.js:383) 记录操作日志

### 数据流设计
```
右键菜单点击 → 收集节点数据 → 调用Agent API → 解析返回结果 → 应用更改 → 触发事件
```

## 后续扩展考虑

### 1. 意图选择
未来可以添加意图选择对话框，让用户指定：
- 分析节点内容
- 扩展想法
- 生成子节点
- 优化结构
- 翻译内容

### 2. 历史记录
集成操作历史记录功能，便于回溯和重复使用成功的操作模式。

### 3. 批量处理
支持批量选择多个节点进行AI处理。

## 风险评估

1. **网络延迟**: Agent API调用可能较慢，需要良好的加载状态反馈
2. **错误恢复**: API调用失败时需要优雅降级
3. **数据安全**: 确保节点数据在传输过程中的安全性
4. **用户体验**: 避免因AI处理导致界面卡顿

## 实施优先级

1. ✅ 基础菜单项集成
2. ✅ 简单API调用框架
3. 🔄 结果解析和应用逻辑
4. ⏳ 高级功能（意图选择、历史记录等）
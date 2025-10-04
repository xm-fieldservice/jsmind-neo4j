# Phase 4.1 - 代码规范化标准

## 🎯 核心规范原则

### 1. 存储访问规范

#### 禁止直接使用localStorage
```javascript
// ❌ 禁止
localStorage.setItem('key', data);
localStorage.getItem('key');
localStorage.removeItem('key');

// ✅ 必须使用统一存储接口
// 方式1：使用AutogenUnifiedStorage
await AutogenUnifiedStorage.store('mindmap', 'current', data);
const result = await AutogenUnifiedStorage.retrieve('mindmap', 'current');
await AutogenUnifiedStorage.remove('mindmap', 'current');

// 方式2：使用MindmapStorage（脑图专用）
const mindmapStorage = new MindmapStorage();
await mindmapStorage.saveMindmapData(data);
const data = await mindmapStorage.loadMindmapData('current');
```

#### 存储键名规范
```javascript
// ❌ 禁止随意键名
localStorage.setItem('my_data', data);

// ✅ 必须使用命名空间和类型前缀
// 格式：autogen:{type}:{identifier}
const storageKey = AutogenUnifiedStorage.createStorageKey('mindmap', 'current');
```

### 2. 事件系统规范

#### 统一事件发射模式
```javascript
// ❌ 禁止直接使用window.dispatchEvent
window.dispatchEvent(new CustomEvent('myEvent', { detail: data }));

// ✅ 必须使用统一事件发射器
// 方式1：使用EventEmitter工具类
EventEmitter.emit('mindmap.node.selected', { nodeId, topic });

// 方式2：直接使用AutogenEventBus
AutogenEventBus.emit('mindmap.node.created', { nodeId, parentId });

// 方式3：使用兼容性模式（仅在特殊情况下）
if (typeof AutogenEventBus !== 'undefined' && AutogenEventBus.emit) {
    AutogenEventBus.emit(eventName, data);
} else if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
}
```

#### 事件命名规范
```javascript
// ✅ 标准事件命名格式：{domain}.{entity}.{action}
'mindmap.node.selected'
'mindmap.node.created' 
'mindmap.node.updated'
'mindmap.node.deleted'
'mindmap.data.saved'
'mindmap.data.loaded'

'system.initialized'
'system.error.occurred'

'storage.data.migrated'
'storage.cleanup.completed'
```

### 3. 错误处理规范

#### 统一错误处理模式
```javascript
// ❌ 禁止静默失败或简单console.error
try {
    riskyOperation();
} catch (e) {
    console.error(e);
}

// ✅ 必须使用统一错误处理器
try {
    await riskyOperation();
} catch (error) {
    // 方式1：使用ErrorHandler（推荐）
    if (window.ErrorHandler && typeof window.ErrorHandler.handle === 'function') {
        window.ErrorHandler.handle(error, {
            component: 'MyComponent',
            action: 'riskyOperation',
            context: { additionalInfo }
        }, { 
            silent: false, // 是否静默处理
            recoverable: true // 是否可恢复
        });
    }
    
    // 方式2：降级到标准日志
    console.error(`[${component}] ${action}失败:`, error);
    
    // 方式3：抛出标准化错误
    throw new StandardizedError({
        code: 'OPERATION_FAILED',
        message: `操作失败: ${error.message}`,
        originalError: error,
        context: { component, action }
    });
}
```

### 4. 异步操作规范

#### Promise使用规范
```javascript
// ❌ 禁止回调地狱和未处理的Promise
operation1(() => {
    operation2(() => {
        operation3(() => {
            // 嵌套过深
        });
    });
});

// ✅ 必须使用async/await和错误处理
async function executeOperations() {
    try {
        const result1 = await operation1();
        const result2 = await operation2(result1);
        const finalResult = await operation3(result2);
        return finalResult;
    } catch (error) {
        // 统一错误处理
        handleError(error, 'executeOperations');
        throw error; // 或返回默认值
    }
}
```

#### 批量操作规范
```javascript
// ✅ 使用批量操作接口
// 存储批量操作
const operations = [
    { type: 'mindmap', key: 'node1', data: node1Data },
    { type: 'mindmap', key: 'node2', data: node2Data }
];
await AutogenUnifiedStorage.batchStore(operations);

// 事件批量发射（需要自定义）
const events = [
    { name: 'mindmap.node.updated', data: { nodeId: 'node1' } },
    { name: 'mindmap.node.updated', data: { nodeId: 'node2' } }
];
events.forEach(event => EventEmitter.emit(event.name, event.data));
```

## 📁 文件组织规范

### 1. 目录结构标准
```
src/
├── core/           # 核心架构组件
│   ├── storage/    # 存储相关
│   ├── messaging/  # 消息通信
│   └── utils/      # 工具函数
├── business/       # 业务逻辑层
├── presentation/   # 表现层
├── data/          # 数据层
├── services/      # 服务层
└── tests/         # 测试文件
```

### 2. 文件命名规范
```javascript
// ✅ 类文件使用PascalCase
MindmapController.js
AutogenUnifiedStorage.js
EventEmitter.js

// ✅ 工具函数使用camelCase
dataUtils.js
stringHelpers.js
validation.js

// ✅ 测试文件使用特定后缀
MindmapController.test.js
AutogenUnifiedStorage.integration.test.js
```

### 3. 模块导出规范
```javascript
// ✅ 类导出
class MyClass {
    // ...
}
export default MyClass;
// 或
module.exports = MyClass;

// ✅ 工具函数导出
export function helper1() { /* ... */ }
export function helper2() { /* ... */ }
export default { helper1, helper2 };

// ✅ 配置导出
export const CONFIG = {
    key: 'value',
    // ...
};
```

## 🔧 代码质量规范

### 1. 注释规范
```javascript
/**
 * 节点管理器 - 负责脑图节点的增删改查操作
 * 
 * @class MindmapNodeManager
 * @param {Object} jm - jsMind实例
 * @param {Object} options - 配置选项
 */
class MindmapNodeManager {
    /**
     * 创建新节点
     * 
     * @param {string} parentId - 父节点ID
     * @param {string} topic - 节点标题
     * @param {Object} options - 节点选项
     * @returns {Promise<Object>} 新创建的节点
     * @throws {Error} 当父节点不存在时抛出错误
     */
    async createNode(parentId, topic, options = {}) {
        // 实现...
    }
}
```

### 2. 日志规范
```javascript
// ✅ 使用结构化日志
console.log(`[${component}] ${action}:`, { 
    nodeId, 
    topic, 
    timestamp: Date.now() 
});

// ✅ 错误日志包含上下文
console.error(`[${component}] ${action}失败:`, error, {
    context: { nodeId, parentId },
    stack: error.stack
});

// ✅ 调试日志可控制
if (process.env.NODE_ENV === 'development') {
    console.debug('[Debug] 详细操作信息:', details);
}
```

### 3. 性能规范
```javascript
// ✅ 使用防抖和节流
const debouncedSave = debounce(() => this.autoSave(), 1000);
const throttledEmit = throttle(() => this.emitUpdate(), 500);

// ✅ 批量操作减少DOM操作
function batchUpdateNodes(nodes) {
    // 使用DocumentFragment或requestAnimationFrame
    const fragment = document.createDocumentFragment();
    nodes.forEach(node => fragment.appendChild(createNodeElement(node)));
    container.appendChild(fragment);
}

// ✅ 内存管理
class ResourceManager {
    constructor() {
        this.cache = new WeakMap(); // 使用WeakMap避免内存泄漏
    }
    
    cleanup() {
        // 显式清理资源
        this.cache = null;
    }
}
```

## 🚀 实施检查清单

### 存储访问检查
- [ ] 无直接localStorage调用
- [ ] 使用AutogenUnifiedStorage或MindmapStorage
- [ ] 存储键名符合命名规范
- [ ] 错误处理完整

### 事件系统检查  
- [ ] 无直接window.dispatchEvent调用
- [ ] 使用EventEmitter或AutogenEventBus
- [ ] 事件命名符合规范
- [ ] 事件数据格式统一

### 错误处理检查
- [ ] 所有异步操作有try/catch
- [ ] 使用统一错误处理器
- [ ] 错误信息包含足够上下文
- [ ] 可恢复错误有降级方案

### 代码质量检查
- [ ] 文件组织符合目录结构
- [ ] 命名符合规范
- [ ] 注释完整清晰
- [ ] 日志使用结构化格式

## 📊 合规性评估

### 自动检查工具建议
```json
{
  "eslintRules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.object.name='localStorage']",
        "message": "禁止直接使用localStorage，请使用AutogenUnifiedStorage"
      },
      {
        "selector": "CallExpression[callee.property.name='dispatchEvent'][callee.object.name='window']",
        "message": "禁止直接使用window.dispatchEvent，请使用EventEmitter"
      }
    ]
  }
}
```

### 代码审查要点
1. **存储访问**：检查所有localStorage使用是否已迁移
2. **事件系统**：检查事件发射是否标准化
3. **错误处理**：检查错误处理是否完整
4. **性能影响**：评估清理对性能的影响
5. **向后兼容**：确保现有功能不受影响

---

**实施建议**：建议在Code模式下创建相应的工具类和迁移脚本，逐步应用这些规范到现有代码库中。
/**
 * 详情页工作栏 - 接口定义文档
 * 
 * ⚠️ 警告：此文件为强制性文件，必须完整填写！
 * - 封装脚本会验证此文件
 * - 上传脚本会验证接口完整性
 * - 验证失败将拒绝封装/上传
 * 
 * 编写规范：
 * 1. 必须导出 COLUMN_INTERFACE 对象
 * 2. inputs/outputs/events 至少定义一项
 * 3. 每个参数必须包含 name, type, description
 * 4. required 字段明确标注
 */

const COLUMN_INTERFACE = {
    // ========== 基本信息 ==========
    id: 'detail',
    title: '详情页工作栏',
    version: '1.0.0',
    author: '程序员',
    description: '节点详情编辑工作栏，支持标题、内容、标签、图片、附件管理',
    
    // ========== 输入参数 ==========
    inputs: [
        {
            name: 'nodeId',
            type: 'string',
            required: true,
            description: '要加载的节点ID',
            example: 'node_123',
            validation: {
                pattern: '^node_\\d+$',
                message: '节点ID必须是 node_ 开头加数字'
            }
        },
        {
            name: 'nodeData',
            type: 'Object',
            required: false,
            description: '节点完整数据对象（可选，如果提供则直接加载，否则通过nodeId查询）',
            example: {
                id: 'node_123',
                title: '示例标题',
                content: '示例内容',
                tags: ['tag1', 'tag2']
            },
            schema: {
                id: 'string',
                title: 'string',
                content: 'string',
                tags: 'Array<string>',
                images: 'Array<string>',
                attachments: 'Array<Object>'
            }
        },
        {
            name: 'editMode',
            type: 'string',
            required: false,
            description: '编辑模式：view(只读) | edit(编辑) | fullscreen(全屏编辑)',
            default: 'edit',
            enum: ['view', 'edit', 'fullscreen']
        }
    ],
    
    // ========== 输出参数 ==========
    outputs: [
        {
            name: 'currentNode',
            type: 'Object',
            description: '当前编辑的节点完整数据',
            schema: {
                id: 'string',
                title: 'string',
                content: 'string',
                tags: 'Array<string>',
                images: 'Array<string>',
                attachments: 'Array<Object>',
                updatedAt: 'timestamp'
            },
            updateFrequency: 'onChange',  // 更新频率：onChange | onBlur | manual
            notes: '每次字段变化时立即输出，供其他工作栏使用'
        },
        {
            name: 'selectedTags',
            type: 'Array<string>',
            description: '当前选中的标签列表',
            updateFrequency: 'onChange'
        },
        {
            name: 'hasUnsavedChanges',
            type: 'boolean',
            description: '是否有未保存的修改',
            updateFrequency: 'onChange'
        }
    ],
    
    // ========== 触发事件 ==========
    events: [
        {
            name: 'node.updated',
            description: '节点数据已更新（保存后触发）',
            payload: {
                nodeId: 'string',
                data: 'Object',
                changedFields: 'Array<string>',
                timestamp: 'number'
            },
            example: {
                nodeId: 'node_123',
                data: { title: '新标题', content: '新内容' },
                changedFields: ['title', 'content'],
                timestamp: 1633024800000
            }
        },
        {
            name: 'node.saved',
            description: '节点已保存到本地文件',
            payload: {
                nodeId: 'string',
                filePath: 'string',
                timestamp: 'number'
            }
        },
        {
            name: 'tag.added',
            description: '添加了新标签',
            payload: {
                nodeId: 'string',
                tag: 'string'
            }
        },
        {
            name: 'tag.removed',
            description: '移除了标签',
            payload: {
                nodeId: 'string',
                tag: 'string'
            }
        },
        {
            name: 'image.added',
            description: '添加了图片',
            payload: {
                nodeId: 'string',
                imageUrl: 'string',
                source: 'paste | upload'
            }
        },
        {
            name: 'fullscreen.entered',
            description: '进入全屏编辑模式',
            payload: {
                nodeId: 'string'
            }
        },
        {
            name: 'fullscreen.exited',
            description: '退出全屏编辑模式',
            payload: {
                nodeId: 'string'
            }
        }
    ],
    
    // ========== 依赖项 ==========
    dependencies: {
        required: [
            'AutogenUnifiedStorage >= 1.0.0',
            'AutogenEventBus >= 1.0.0',
            'ColumnRegistry >= 1.0.0'
        ],
        optional: [
            'TagManager >= 1.0.0',  // 标签管理（如果系统提供）
            'FileManager >= 1.0.0'  // 文件管理（如果系统提供）
        ]
    },
    
    // ========== 数据连接建议 ==========
    suggestedConnections: [
        {
            from: 'mindmap',
            mapping: {
                'mindmap.selectedNode -> detail.nodeId': '脑图选中节点时自动加载详情'
            }
        },
        {
            from: 'list',
            mapping: {
                'list.selectedItem -> detail.nodeId': '列表选中项时自动加载详情'
            }
        },
        {
            to: 'list',
            mapping: {
                'detail.currentNode -> list.highlightNode': '详情页编辑时在列表中高亮'
            }
        }
    ],
    
    // ========== 使用示例 ==========
    usageExamples: [
        {
            scenario: '从脑图加载节点详情',
            code: `
// 脑图工作栏输出选中节点
window.ColumnRegistry.setOutput('mindmap', 'selectedNode', {
    id: 'node_123',
    title: '示例节点'
});

// 详情页自动接收并加载
// onDataReceived('nodeId', 'node_123')
            `
        },
        {
            scenario: '监听节点更新事件',
            code: `
window.AutogenEventBus.on('node.updated', (event) => {
    console.log('节点已更新:', event);
    // 更新其他工作栏显示
});
            `
        }
    ],
    
    // ========== 验证规则 ==========
    validation: {
        onRegister: {
            rules: [
                'inputs 至少定义1个参数',
                'outputs 至少定义1个参数',
                'events 至少定义1个事件',
                '所有 required: true 的输入必须有验证规则'
            ]
        },
        onPackage: {
            rules: [
                'dataInterface 必须与此文件一致',
                'renderFn 必须实现 onDataReceived 回调',
                'renderFn 必须调用 setOutput 输出数据'
            ]
        }
    }
};

// ========== 强制性检查 ==========
(function validateInterface() {
    const errors = [];
    
    // 检查必填字段
    if (!COLUMN_INTERFACE.id) errors.push('缺少 id 字段');
    if (!COLUMN_INTERFACE.title) errors.push('缺少 title 字段');
    if (!COLUMN_INTERFACE.version) errors.push('缺少 version 字段');
    
    // 检查接口定义
    if (!COLUMN_INTERFACE.inputs || COLUMN_INTERFACE.inputs.length === 0) {
        errors.push('inputs 必须至少定义1个输入参数');
    }
    if (!COLUMN_INTERFACE.outputs || COLUMN_INTERFACE.outputs.length === 0) {
        errors.push('outputs 必须至少定义1个输出参数');
    }
    if (!COLUMN_INTERFACE.events || COLUMN_INTERFACE.events.length === 0) {
        errors.push('events 必须至少定义1个事件');
    }
    
    // 检查参数完整性
    ['inputs', 'outputs'].forEach(type => {
        if (COLUMN_INTERFACE[type]) {
            COLUMN_INTERFACE[type].forEach((param, idx) => {
                if (!param.name) errors.push(`${type}[${idx}] 缺少 name`);
                if (!param.type) errors.push(`${type}[${idx}] 缺少 type`);
                if (!param.description) errors.push(`${type}[${idx}] 缺少 description`);
            });
        }
    });
    
    // 输出验证结果
    if (errors.length > 0) {
        console.error('❌ 接口定义验证失败:');
        errors.forEach(err => console.error('  -', err));
        throw new Error('接口定义不完整，请修复后再封装！');
    } else {
        console.log('✅ 接口定义验证通过');
    }
})();

// 导出接口定义
if (typeof module !== 'undefined' && module.exports) {
    module.exports = COLUMN_INTERFACE;
}
if (typeof window !== 'undefined') {
    window.DETAIL_COLUMN_INTERFACE = COLUMN_INTERFACE;
}

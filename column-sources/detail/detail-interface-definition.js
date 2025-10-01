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
            example: 'test_node_001',
            validation: {
                minLength: 1,
                message: '节点ID不能为空'
            }
        },
        {
            name: 'nodeData',
            type: 'Object',
            required: false,
            description: '节点完整数据对象（可选，如果提供则直接加载，否则通过nodeId从数据底座查询）',
            example: {
                id: 'test_node_001',
                topic: '示例标题',
                content: '示例内容',
                tags: ['重要', '进行中', '项目'],
                images: [],
                attachments: [],
                created_at: '2025-10-01T10:00:00',
                updated_at: '2025-10-01T15:00:00'
            },
            schema: {
                id: 'string - 节点ID',
                topic: 'string - 节点标题',
                content: 'string - Markdown格式内容',
                tags: 'Array<string> - 标签数组（简单字符串）',
                images: 'Array<string> - 图片URL数组',
                attachments: 'Array<Object> - 附件对象数组',
                created_at: 'string - 创建时间（ISO格式）',
                updated_at: 'string - 更新时间（ISO格式）'
            }
        },
        {
            name: 'tagGroups',
            type: 'Array<Object>',
            required: false,
            description: '标签组配置（来自数据底座）。用于动态生成标签面板。一级为分组名，二级为该分组下的标签列表',
            example: [
                {
                    name: '优先级',
                    tags: ['重要', '紧急', '一般']
                },
                {
                    name: '状态',
                    tags: ['进行中', '已完成', '待处理', '已取消']
                },
                {
                    name: '类型',
                    tags: ['项目', '任务', '目标', '想法', '架构', '开发', '测试']
                }
            ],
            schema: {
                name: 'string - 分组名称',
                tags: 'Array<string> - 该分组下的标签列表'
            },
            notes: '如果不提供，则使用工作栏内置的默认标签组'
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
            description: '当前编辑的节点完整数据（与数据底座格式一致）',
            example: {
                id: 'test_node_001',
                topic: '项目管理系统重构',
                content: '# 项目管理系统重构\n\n## 背景\n...',
                tags: ['重要', '进行中', '项目'],
                images: ['data:image/svg+xml,...'],
                attachments: [
                    {
                        name: '架构设计文档.md',
                        type: 'markdown',
                        size: '15.2 KB',
                        url: '#'
                    }
                ],
                created_at: '2025-09-15T10:30:00',
                updated_at: '2025-10-01T15:20:00'
            },
            schema: {
                id: 'string - 节点ID',
                topic: 'string - 节点标题',
                content: 'string - Markdown格式内容',
                tags: 'Array<string> - 标签数组',
                images: 'Array<string> - 图片URL数组（Base64或URL）',
                attachments: 'Array<Object> - 附件对象数组',
                created_at: 'string - 创建时间（ISO格式）',
                updated_at: 'string - 更新时间（ISO格式）'
            },
            updateFrequency: 'onChange',  // 更新频率：onChange | onBlur | manual
            notes: '每次字段变化时立即输出，供其他工作栏使用。格式与数据底座完全一致，可直接保存回数据底座'
        },
        {
            name: 'selectedTags',
            type: 'Array<string>',
            description: '当前选中的标签列表（简单字符串数组）',
            example: ['重要', '进行中', '项目'],
            updateFrequency: 'onChange',
            notes: '与 currentNode.tags 保持同步'
        },
        {
            name: 'hasUnsavedChanges',
            type: 'boolean',
            description: '是否有未保存的修改',
            example: true,
            updateFrequency: 'onChange',
            notes: '用于提示用户保存'
        }
    ],
    
    // ========== 数据持久化 ==========
    persistence: {
        autoSave: true,  // 是否自动保存到数据底座
        saveInterval: 3000,  // 自动保存间隔（毫秒）
        saveStrategy: 'upsert',  // 保存策略：upsert(覆盖或新增) | update(仅更新) | insert(仅新增)
        
        // 保存逻辑
        saveLogic: {
            description: '详情页编辑后的数据同步逻辑',
            steps: [
                '1. 获取当前编辑的节点数据（currentNode）',
                '2. 根据 nodeId 查询数据底座',
                '3. 如果找到数据 → 旧节点 → 覆盖（UPDATE）',
                '4. 如果未找到 → 新节点 → 追加（INSERT）',
                '5. 保存成功后触发 node.saved 事件'
            ],
            
            // 判断逻辑
            checkNodeExists: {
                method: 'GET',
                endpoint: '/api/nodes/{nodeId}',
                description: '查询节点是否存在',
                response: {
                    exists: true,
                    found: 'boolean - 是否找到节点',
                    data: 'Object | null - 节点数据（如果存在）'
                }
            },
            
            // 更新（覆盖）逻辑
            updateNode: {
                method: 'PUT',
                endpoint: '/api/nodes/{nodeId}',
                description: '覆盖现有节点数据',
                payload: 'currentNode - 完整节点数据',
                response: {
                    success: 'boolean',
                    data: 'Object - 更新后的节点数据',
                    message: 'string'
                }
            },
            
            // 新增（追加）逻辑
            insertNode: {
                method: 'POST',
                endpoint: '/api/nodes',
                description: '新增节点到数据底座',
                payload: 'currentNode - 完整节点数据',
                response: {
                    success: 'boolean',
                    data: 'Object - 新增的节点数据',
                    message: 'string'
                }
            }
        },
        
        // 数据底座接口
        dataBaseInterface: {
            check: 'async function(nodeId: string): Promise<boolean>',
            load: 'async function(nodeId: string): Promise<Object | null>',
            save: 'async function(nodeData: Object, isNew: boolean): Promise<boolean>',
            delete: 'async function(nodeId: string): Promise<boolean>'
        }
    },
    
    // ========== 触发事件 ==========
    events: [
        {
            name: 'node.saved',
            description: '节点已保存到数据底座（覆盖或新增）',
            payload: {
                nodeId: 'string',
                data: 'Object',
                isNew: 'boolean - 是否为新节点',
                operation: 'string - update | insert',
                timestamp: 'number'
            },
            example: {
                nodeId: 'test_node_001',
                data: { topic: '新标题', content: '新内容' },
                isNew: false,
                operation: 'update',
                timestamp: 1696147200000
            }
        },
        {
            name: 'node.updated',
            description: '节点数据已更新（编辑时实时触发）',
            payload: {
                nodeId: 'string',
                data: 'Object',
                changedFields: 'Array<string>',
                timestamp: 'number'
            },
            example: {
                nodeId: 'test_node_001',
                data: { title: '新标题', content: '新内容' },
                changedFields: ['title', 'content'],
                timestamp: 1633024800000
            }
        },
        {
            name: 'node.savedToFile',
            description: '节点已保存到本地文件（用户手动保存）',
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

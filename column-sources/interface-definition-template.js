/**
 * 工作栏接口定义模板
 * 
 * ⚠️ 使用说明：
 * 1. 复制此文件到你的工作栏目录
 * 2. 重命名为 [your-column]-interface-definition.js
 * 3. 填写所有必填字段（标记为 ⭐ 的部分）
 * 4. 删除所有注释和模板说明
 * 5. 运行验证脚本确保完整性
 * 
 * 📋 验证命令：
 * node tools/validate-interface.js column-sources/[your-column]/
 */

const COLUMN_INTERFACE = {
    // ========== 基本信息 ========== ⭐ 必填
    id: '',                    // ⭐ 工作栏唯一ID（kebab-case）
    title: '',                 // ⭐ 工作栏显示标题
    version: '1.0.0',          // ⭐ 版本号（semver格式）
    author: '',                // ⭐ 作者名称
    description: '',           // ⭐ 工作栏功能描述
    
    // ========== 输入参数 ========== ⭐ 至少1个
    inputs: [
        {
            name: '',          // ⭐ 参数名（camelCase）
            type: '',          // ⭐ 数据类型：string | number | boolean | Array | Object
            required: true,    // ⭐ 是否必填
            description: '',   // ⭐ 参数说明
            example: null,     // 示例值
            default: null,     // 默认值（optional参数）
            validation: {      // 验证规则（可选）
                pattern: '',   // 正则表达式
                message: ''    // 验证失败提示
            },
            schema: {}         // 对象/数组的结构定义（可选）
        }
        // ... 添加更多输入参数
    ],
    
    // ========== 输出参数 ========== ⭐ 至少1个
    outputs: [
        {
            name: '',          // ⭐ 输出名（camelCase）
            type: '',          // ⭐ 数据类型
            description: '',   // ⭐ 输出说明
            schema: {},        // 对象结构定义（可选）
            updateFrequency: 'onChange',  // 更新频率：onChange | onBlur | manual
            notes: ''          // 补充说明
        }
        // ... 添加更多输出参数
    ],
    
    // ========== 触发事件 ========== ⭐ 至少1个
    events: [
        {
            name: '',          // ⭐ 事件名（dot.notation）
            description: '',   // ⭐ 事件说明
            payload: {},       // ⭐ 事件数据结构
            example: {}        // 事件数据示例
        }
        // ... 添加更多事件
    ],
    
    // ========== 依赖项 ==========
    dependencies: {
        required: [
            // 必需的系统组件
            // 'AutogenUnifiedStorage >= 1.0.0'
        ],
        optional: [
            // 可选的系统组件
        ]
    },
    
    // ========== 数据连接建议 ==========
    suggestedConnections: [
        {
            from: '',          // 来源工作栏ID
            mapping: {
                // 'source.output -> this.input': '连接说明'
            }
        },
        {
            to: '',            // 目标工作栏ID
            mapping: {
                // 'this.output -> target.input': '连接说明'
            }
        }
    ],
    
    // ========== 使用示例 ==========
    usageExamples: [
        {
            scenario: '',      // 使用场景说明
            code: `
// 示例代码
            `
        }
    ],
    
    // ========== 验证规则 ==========
    validation: {
        onRegister: {
            rules: [
                // 注册时的验证规则
            ]
        },
        onPackage: {
            rules: [
                // 封装时的验证规则
            ]
        }
    }
};

// ========== 自动验证 ==========
(function validateInterface() {
    const errors = [];
    
    // 基本信息验证
    if (!COLUMN_INTERFACE.id) errors.push('缺少 id 字段');
    if (!COLUMN_INTERFACE.title) errors.push('缺少 title 字段');
    if (!COLUMN_INTERFACE.version) errors.push('缺少 version 字段');
    if (!COLUMN_INTERFACE.author) errors.push('缺少 author 字段');
    if (!COLUMN_INTERFACE.description) errors.push('缺少 description 字段');
    
    // 接口定义验证
    if (!COLUMN_INTERFACE.inputs || COLUMN_INTERFACE.inputs.length === 0) {
        errors.push('inputs 必须至少定义1个输入参数');
    }
    if (!COLUMN_INTERFACE.outputs || COLUMN_INTERFACE.outputs.length === 0) {
        errors.push('outputs 必须至少定义1个输出参数');
    }
    if (!COLUMN_INTERFACE.events || COLUMN_INTERFACE.events.length === 0) {
        errors.push('events 必须至少定义1个事件');
    }
    
    // 参数完整性验证
    ['inputs', 'outputs'].forEach(type => {
        if (COLUMN_INTERFACE[type]) {
            COLUMN_INTERFACE[type].forEach((param, idx) => {
                if (!param.name) errors.push(`${type}[${idx}] 缺少 name`);
                if (!param.type) errors.push(`${type}[${idx}] 缺少 type`);
                if (!param.description) errors.push(`${type}[${idx}] 缺少 description`);
            });
        }
    });
    
    // 事件完整性验证
    if (COLUMN_INTERFACE.events) {
        COLUMN_INTERFACE.events.forEach((event, idx) => {
            if (!event.name) errors.push(`events[${idx}] 缺少 name`);
            if (!event.description) errors.push(`events[${idx}] 缺少 description`);
            if (!event.payload) errors.push(`events[${idx}] 缺少 payload`);
        });
    }
    
    // 输出验证结果
    if (errors.length > 0) {
        console.error('❌ 接口定义验证失败:');
        errors.forEach(err => console.error('  -', err));
        throw new Error('接口定义不完整，请修复后再封装！');
    } else {
        console.log('✅ 接口定义验证通过');
    }
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = COLUMN_INTERFACE;
}

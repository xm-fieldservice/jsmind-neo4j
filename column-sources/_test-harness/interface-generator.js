/**
 * 工作栏接口定义自动生成器
 * 
 * 功能：
 * 1. 分析输入数据结构
 * 2. 分析输出数据结构
 * 3. 捕获事件触发
 * 4. 生成接口定义草稿
 */

class InterfaceGenerator {
    constructor() {
        this.inputData = {};
        this.outputData = {};
        this.capturedEvents = [];
    }
    
    /**
     * 分析数据类型
     */
    analyzeType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) {
            if (value.length === 0) return 'Array';
            const itemType = this.analyzeType(value[0]);
            return `Array<${itemType}>`;
        }
        if (typeof value === 'object') return 'Object';
        return typeof value;
    }
    
    /**
     * 分析对象结构
     */
    analyzeSchema(obj) {
        if (typeof obj !== 'object' || obj === null) return null;
        if (Array.isArray(obj)) return null;
        
        const schema = {};
        for (const [key, value] of Object.entries(obj)) {
            schema[key] = this.analyzeType(value);
        }
        return schema;
    }
    
    /**
     * 记录输入数据
     */
    recordInput(inputName, inputValue) {
        this.inputData[inputName] = {
            value: inputValue,
            type: this.analyzeType(inputValue),
            schema: this.analyzeSchema(inputValue)
        };
        console.log(`[InterfaceGenerator] 记录输入: ${inputName}`, this.inputData[inputName]);
    }
    
    /**
     * 记录输出数据
     */
    recordOutput(outputName, outputValue) {
        this.outputData[outputName] = {
            value: outputValue,
            type: this.analyzeType(outputValue),
            schema: this.analyzeSchema(outputValue)
        };
        console.log(`[InterfaceGenerator] 记录输出: ${outputName}`, this.outputData[outputName]);
    }
    
    /**
     * 记录事件
     */
    recordEvent(eventName, eventPayload) {
        this.capturedEvents.push({
            name: eventName,
            payload: eventPayload,
            schema: this.analyzeSchema(eventPayload),
            timestamp: Date.now()
        });
        console.log(`[InterfaceGenerator] 记录事件: ${eventName}`, eventPayload);
    }
    
    /**
     * 生成接口定义草稿
     */
    generateInterfaceDraft(columnId, columnTitle) {
        const draft = {
            id: columnId,
            title: columnTitle,
            version: '1.0.0',
            author: '程序员',
            description: '',  // 需要用户填写
            
            inputs: [],
            outputs: [],
            events: []
        };
        
        // 生成输入参数定义
        for (const [name, data] of Object.entries(this.inputData)) {
            draft.inputs.push({
                name: name,
                type: data.type,
                required: true,  // 默认必填，可修改
                description: '',  // ⭐ 需要用户补充
                example: data.value,
                schema: data.schema
            });
        }
        
        // 生成输出参数定义
        for (const [name, data] of Object.entries(this.outputData)) {
            draft.outputs.push({
                name: name,
                type: data.type,
                description: '',  // ⭐ 需要用户补充
                schema: data.schema
            });
        }
        
        // 生成事件定义（去重）
        const uniqueEvents = {};
        this.capturedEvents.forEach(event => {
            if (!uniqueEvents[event.name]) {
                uniqueEvents[event.name] = event;
            }
        });
        
        for (const [name, event] of Object.entries(uniqueEvents)) {
            draft.events.push({
                name: name,
                description: '',  // ⭐ 需要用户补充
                payload: event.schema || {}
            });
        }
        
        console.log('[InterfaceGenerator] 生成接口草稿:', draft);
        return draft;
    }
    
    /**
     * 生成接口定义代码
     */
    generateInterfaceCode(draft) {
        const code = `/**
 * ${draft.title} - 接口定义
 * 
 * ⚠️ 此文件由测试工具自动生成
 * 生成时间: ${new Date().toISOString()}
 * 
 * ✅ 数据类型已自动推断
 * ⚠️ 请补充完善描述信息
 */

const COLUMN_INTERFACE = ${JSON.stringify(draft, null, 4)};

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
                if (!param.name) errors.push(\`\${type}[\${idx}] 缺少 name\`);
                if (!param.type) errors.push(\`\${type}[\${idx}] 缺少 type\`);
                if (!param.description) errors.push(\`\${type}[\${idx}] 缺少 description\`);
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
    window.${draft.id.toUpperCase()}_COLUMN_INTERFACE = COLUMN_INTERFACE;
}
`;
        
        return code;
    }
}

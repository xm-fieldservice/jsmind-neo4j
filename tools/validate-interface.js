/**
 * 工作栏接口定义验证工具
 * 
 * 功能：
 * 1. 检查接口定义文件是否存在
 * 2. 验证接口定义完整性
 * 3. 生成验证报告
 * 4. 封装前强制验证
 * 
 * 使用方式：
 * node tools/validate-interface.js column-sources/detail/
 * node tools/validate-interface.js --all  (验证所有工作栏)
 */

const fs = require('fs');
const path = require('path');

class InterfaceValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passedChecks = 0;
        this.totalChecks = 0;
    }
    
    /**
     * 验证工作栏目录
     */
    async validateColumnDirectory(columnDir) {
        console.log(`\n========== 验证工作栏: ${path.basename(columnDir)} ==========\n`);
        
        this.errors = [];
        this.warnings = [];
        this.passedChecks = 0;
        this.totalChecks = 0;
        
        // 1. 检查接口定义文件是否存在
        const interfaceFile = this.findInterfaceFile(columnDir);
        if (!interfaceFile) {
            this.errors.push('❌ 未找到接口定义文件 (*-interface-definition.js)');
            this.printReport();
            return false;
        }
        
        console.log(`✅ 找到接口定义文件: ${path.basename(interfaceFile)}\n`);
        
        // 2. 加载接口定义
        let interfaceDef;
        try {
            delete require.cache[require.resolve(interfaceFile)];
            interfaceDef = require(interfaceFile);
        } catch (error) {
            this.errors.push(`❌ 接口定义文件加载失败: ${error.message}`);
            this.printReport();
            return false;
        }
        
        // 3. 验证基本信息
        this.validateBasicInfo(interfaceDef);
        
        // 4. 验证输入参数
        this.validateInputs(interfaceDef.inputs);
        
        // 5. 验证输出参数
        this.validateOutputs(interfaceDef.outputs);
        
        // 6. 验证事件定义
        this.validateEvents(interfaceDef.events);
        
        // 7. 验证依赖项
        this.validateDependencies(interfaceDef.dependencies);
        
        // 8. 打印报告
        this.printReport();
        
        return this.errors.length === 0;
    }
    
    /**
     * 查找接口定义文件
     */
    findInterfaceFile(columnDir) {
        const files = fs.readdirSync(columnDir);
        const interfaceFile = files.find(f => f.endsWith('-interface-definition.js'));
        return interfaceFile ? path.join(columnDir, interfaceFile) : null;
    }
    
    /**
     * 验证基本信息
     */
    validateBasicInfo(def) {
        console.log('📋 验证基本信息...');
        
        const requiredFields = ['id', 'title', 'version', 'author', 'description'];
        requiredFields.forEach(field => {
            this.totalChecks++;
            if (def[field]) {
                console.log(`  ✅ ${field}: ${def[field]}`);
                this.passedChecks++;
            } else {
                this.errors.push(`❌ 缺少必填字段: ${field}`);
            }
        });
        
        // 验证版本号格式
        this.totalChecks++;
        if (def.version && /^\d+\.\d+\.\d+$/.test(def.version)) {
            this.passedChecks++;
        } else {
            this.errors.push(`❌ version 格式错误，应为 semver 格式（如 1.0.0）`);
        }
        
        // 验证ID格式
        this.totalChecks++;
        if (def.id && /^[a-z][a-z0-9-]*$/.test(def.id)) {
            this.passedChecks++;
        } else {
            this.errors.push(`❌ id 格式错误，应使用 kebab-case 格式`);
        }
        
        console.log('');
    }
    
    /**
     * 验证输入参数
     */
    validateInputs(inputs) {
        console.log('📥 验证输入参数...');
        
        this.totalChecks++;
        if (!inputs || inputs.length === 0) {
            this.errors.push(`❌ inputs 必须至少定义1个输入参数`);
            return;
        }
        this.passedChecks++;
        console.log(`  ✅ 定义了 ${inputs.length} 个输入参数`);
        
        inputs.forEach((input, idx) => {
            const requiredFields = ['name', 'type', 'description'];
            requiredFields.forEach(field => {
                this.totalChecks++;
                if (input[field]) {
                    this.passedChecks++;
                } else {
                    this.errors.push(`❌ inputs[${idx}] 缺少字段: ${field}`);
                }
            });
            
            // 检查 required 字段
            this.totalChecks++;
            if (typeof input.required === 'boolean') {
                this.passedChecks++;
            } else {
                this.warnings.push(`⚠️  inputs[${idx}] 建议明确标注 required 字段`);
            }
            
            // 检查必填参数的验证规则
            if (input.required && !input.validation) {
                this.warnings.push(`⚠️  inputs[${idx}] (${input.name}) 是必填参数，建议添加 validation 规则`);
            }
            
            console.log(`  - ${input.name}: ${input.type}${input.required ? ' (必填)' : ''}`);
        });
        
        console.log('');
    }
    
    /**
     * 验证输出参数
     */
    validateOutputs(outputs) {
        console.log('📤 验证输出参数...');
        
        this.totalChecks++;
        if (!outputs || outputs.length === 0) {
            this.errors.push(`❌ outputs 必须至少定义1个输出参数`);
            return;
        }
        this.passedChecks++;
        console.log(`  ✅ 定义了 ${outputs.length} 个输出参数`);
        
        outputs.forEach((output, idx) => {
            const requiredFields = ['name', 'type', 'description'];
            requiredFields.forEach(field => {
                this.totalChecks++;
                if (output[field]) {
                    this.passedChecks++;
                } else {
                    this.errors.push(`❌ outputs[${idx}] 缺少字段: ${field}`);
                }
            });
            
            console.log(`  - ${output.name}: ${output.type}`);
        });
        
        console.log('');
    }
    
    /**
     * 验证事件定义
     */
    validateEvents(events) {
        console.log('📡 验证事件定义...');
        
        this.totalChecks++;
        if (!events || events.length === 0) {
            this.errors.push(`❌ events 必须至少定义1个事件`);
            return;
        }
        this.passedChecks++;
        console.log(`  ✅ 定义了 ${events.length} 个事件`);
        
        events.forEach((event, idx) => {
            const requiredFields = ['name', 'description', 'payload'];
            requiredFields.forEach(field => {
                this.totalChecks++;
                if (event[field]) {
                    this.passedChecks++;
                } else {
                    this.errors.push(`❌ events[${idx}] 缺少字段: ${field}`);
                }
            });
            
            console.log(`  - ${event.name}: ${event.description}`);
        });
        
        console.log('');
    }
    
    /**
     * 验证依赖项
     */
    validateDependencies(deps) {
        console.log('🔗 验证依赖项...');
        
        if (!deps) {
            this.warnings.push('⚠️  建议定义 dependencies（即使为空数组）');
            console.log('  ⚠️  未定义依赖项\n');
            return;
        }
        
        if (deps.required && deps.required.length > 0) {
            console.log(`  ✅ 必需依赖: ${deps.required.length} 个`);
            deps.required.forEach(dep => console.log(`    - ${dep}`));
        }
        
        if (deps.optional && deps.optional.length > 0) {
            console.log(`  ✅ 可选依赖: ${deps.optional.length} 个`);
            deps.optional.forEach(dep => console.log(`    - ${dep}`));
        }
        
        console.log('');
    }
    
    /**
     * 打印验证报告
     */
    printReport() {
        console.log('\n========== 验证报告 ==========\n');
        
        const score = Math.round((this.passedChecks / this.totalChecks) * 100);
        console.log(`验证通过: ${this.passedChecks}/${this.totalChecks} (${score}%)`);
        
        if (this.errors.length > 0) {
            console.log(`\n❌ 错误 (${this.errors.length}):`);
            this.errors.forEach(err => console.log(`  ${err}`));
        }
        
        if (this.warnings.length > 0) {
            console.log(`\n⚠️  警告 (${this.warnings.length}):`);
            this.warnings.forEach(warn => console.log(`  ${warn}`));
        }
        
        if (this.errors.length === 0) {
            console.log('\n✅ 验证通过！可以进行封装。');
        } else {
            console.log('\n❌ 验证失败！请修复错误后再封装。');
        }
        
        console.log('\n==============================\n');
    }
}

// ========== 主程序 ==========
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
工作栏接口验证工具

使用方式:
  node tools/validate-interface.js <column-dir>     验证指定工作栏
  node tools/validate-interface.js --all            验证所有工作栏
  node tools/validate-interface.js --help           显示帮助

示例:
  node tools/validate-interface.js column-sources/detail/
  node tools/validate-interface.js --all
        `);
        return;
    }
    
    const validator = new InterfaceValidator();
    
    if (args[0] === '--all') {
        // 验证所有工作栏
        const columnSourcesDir = path.join(__dirname, '../column-sources');
        const dirs = fs.readdirSync(columnSourcesDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => path.join(columnSourcesDir, d.name));
        
        let totalPassed = 0;
        let totalFailed = 0;
        
        for (const dir of dirs) {
            const passed = await validator.validateColumnDirectory(dir);
            if (passed) {
                totalPassed++;
            } else {
                totalFailed++;
            }
        }
        
        console.log(`\n========== 总体结果 ==========`);
        console.log(`✅ 通过: ${totalPassed}`);
        console.log(`❌ 失败: ${totalFailed}`);
        console.log(`==============================\n`);
        
        process.exit(totalFailed > 0 ? 1 : 0);
        
    } else {
        // 验证指定工作栏
        const columnDir = path.resolve(args[0]);
        
        if (!fs.existsSync(columnDir)) {
            console.error(`❌ 目录不存在: ${columnDir}`);
            process.exit(1);
        }
        
        const passed = await validator.validateColumnDirectory(columnDir);
        process.exit(passed ? 0 : 1);
    }
}

// 运行
if (require.main === module) {
    main().catch(err => {
        console.error('验证失败:', err);
        process.exit(1);
    });
}

module.exports = InterfaceValidator;

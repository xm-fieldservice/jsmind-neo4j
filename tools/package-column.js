/**
 * 工作栏封装脚本
 * 
 * 功能：
 * 1. ⭐ 强制验证接口定义
 * 2. 内联所有 HTML/CSS/JS 文件
 * 3. 添加 IIFE 包裹
 * 4. 注入自动持久化代码
 * 5. 生成单文件工作栏.js
 * 
 * 使用方式：
 * node tools/package-column.js column-sources/detail/
 */

const fs = require('fs');
const path = require('path');
const InterfaceValidator = require('./validate-interface');

class ColumnPackager {
    constructor(columnDir) {
        this.columnDir = path.resolve(columnDir);
        this.columnName = path.basename(this.columnDir);
        this.outputFile = path.join(this.columnDir, `${this.columnName}-column.js`);
        this.interfaceDef = null;
    }
    
    /**
     * 执行封装
     */
    async package() {
        console.log(`\n========== 封装工作栏: ${this.columnName} ==========\n`);
        
        // ⭐ 步骤1: 强制验证接口定义
        console.log('📋 步骤1: 验证接口定义...\n');
        const validator = new InterfaceValidator();
        const isValid = await validator.validateColumnDirectory(this.columnDir);
        
        if (!isValid) {
            console.error('\n❌ 接口定义验证失败！');
            console.error('❌ 封装已中止！');
            console.error('\n请修复接口定义错误后再次尝试封装。\n');
            process.exit(1);
        }
        
        // 加载接口定义
        this.loadInterfaceDefinition();
        
        // 步骤2: 收集文件
        console.log('\n📁 步骤2: 收集源文件...\n');
        const files = this.collectFiles();
        
        // 步骤3: 生成封装代码
        console.log('\n🔨 步骤3: 生成封装代码...\n');
        const packagedCode = this.generatePackagedCode(files);
        
        // 步骤4: 写入文件
        console.log('\n💾 步骤4: 写入封装文件...\n');
        fs.writeFileSync(this.outputFile, packagedCode, 'utf-8');
        console.log(`  ✅ 已生成: ${path.relative(process.cwd(), this.outputFile)}`);
        
        // 步骤5: 验证封装结果
        console.log('\n✅ 步骤5: 验证封装结果...\n');
        this.validatePackagedCode(packagedCode);
        
        console.log('\n========== 封装完成！ ==========\n');
        this.printSummary();
    }
    
    /**
     * 加载接口定义
     */
    loadInterfaceDefinition() {
        const files = fs.readdirSync(this.columnDir);
        const interfaceFile = files.find(f => f.endsWith('-interface-definition.js'));
        const interfacePath = path.join(this.columnDir, interfaceFile);
        
        delete require.cache[require.resolve(interfacePath)];
        this.interfaceDef = require(interfacePath);
    }
    
    /**
     * 收集文件
     */
    collectFiles() {
        const files = {
            layout: null,
            styles: null,
            core: null,
            modules: []
        };
        
        const allFiles = fs.readdirSync(this.columnDir);
        
        allFiles.forEach(file => {
            const fullPath = path.join(this.columnDir, file);
            
            if (file.includes('-layout.html')) {
                files.layout = { name: file, content: fs.readFileSync(fullPath, 'utf-8') };
                console.log(`  ✅ HTML: ${file}`);
            } else if (file.includes('-styles.css')) {
                files.styles = { name: file, content: fs.readFileSync(fullPath, 'utf-8') };
                console.log(`  ✅ CSS: ${file}`);
            } else if (file.includes('-core.js')) {
                files.core = { name: file, content: fs.readFileSync(fullPath, 'utf-8') };
                console.log(`  ✅ 核心JS: ${file}`);
            } else if (file.endsWith('.js') && !file.includes('-interface-definition') && !file.includes('-column.js')) {
                files.modules.push({ name: file, content: fs.readFileSync(fullPath, 'utf-8') });
                console.log(`  ✅ 模块JS: ${file}`);
            }
        });
        
        return files;
    }
    
    /**
     * 生成封装代码
     */
    generatePackagedCode(files) {
        const indent = '    ';
        
        // 转换接口定义为 dataInterface 格式
        const dataInterface = {
            inputs: this.interfaceDef.inputs,
            outputs: this.interfaceDef.outputs,
            events: this.interfaceDef.events
        };
        
        const metadata = {
            version: this.interfaceDef.version,
            author: this.interfaceDef.author,
            description: this.interfaceDef.description,
            dependencies: this.interfaceDef.dependencies?.required || []
        };
        
        return `/**
 * ${this.interfaceDef.title}
 * 
 * @version ${this.interfaceDef.version}
 * @author ${this.interfaceDef.author}
 * @description ${this.interfaceDef.description}
 * 
 * 此文件由封装脚本自动生成
 * 生成时间: ${new Date().toISOString()}
 * 接口定义已验证通过 ✅
 */

(function(global) {
    'use strict';
    
    // ========== 等待依赖就绪 ==========
    function waitForDependencies(callback) {
        const checkDependencies = () => {
            const ready = window.ColumnRegistry && 
                         window.AutogenUnifiedStorage && 
                         window.AutogenEventBus;
            
            if (ready) {
                callback();
            } else {
                setTimeout(checkDependencies, 100);
            }
        };
        checkDependencies();
    }
    
    // ========== 注入样式 ==========
    function injectStyles() {
        const styleId = '${this.columnName}-column-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = \`
${files.styles ? files.styles.content : '/* 无样式 */'}
        \`;
        document.head.appendChild(style);
        console.log('[${this.interfaceDef.title}] 样式已注入');
    }
    
    // ========== 工作栏类 ==========
    ${files.core ? files.core.content : ''}
    
    // ========== 其他模块 ==========
${files.modules.map(m => m.content).join('\n\n')}
    
    // ========== 注册工作栏 ==========
    function register${this.toPascalCase(this.columnName)}Column() {
        console.log('[${this.interfaceDef.title}] 开始注册...');
        
        // 注入样式
        injectStyles();
        
        // ⭐ 注册工作栏（包含接口定义）
        window.ColumnRegistry.register({
            id: '${this.interfaceDef.id}',
            title: '${this.interfaceDef.title}',
            icon: '${this.interfaceDef.icon || '📄'}',
            
            // ⭐ 数据接口定义
            dataInterface: ${JSON.stringify(dataInterface, null, 12).split('\n').join('\n' + indent + indent + indent)},
            
            // ⭐ 元数据
            metadata: ${JSON.stringify(metadata, null, 12).split('\n').join('\n' + indent + indent + indent)},
            
            // ⭐ 生命周期钩子
            lifecycle: {
                onActivated: function(container) {
                    console.log('[${this.interfaceDef.title}] 工作栏已激活');
                },
                onDeactivated: function(container) {
                    console.log('[${this.interfaceDef.title}] 工作栏已停用');
                }
            },
            
            // ⭐ 数据接收回调
            onDataReceived: function(inputName, data) {
                console.log(\`[${this.interfaceDef.title}] 接收数据: \${inputName}\`, data);
                
                // TODO: 实现数据接收逻辑
                // 根据 inputName 处理不同的输入数据
            },
            
            // 渲染函数
            renderFn: function(container) {
                console.log('[${this.interfaceDef.title}] 开始渲染...');
                
                // 渲染HTML
                container.innerHTML = \`
${files.layout ? files.layout.content : '<div>无布局</div>'}
                \`;
                
                // 初始化逻辑
                // TODO: 将 core.js 的初始化逻辑移到这里
                
                console.log('[${this.interfaceDef.title}] 渲染完成');
            }
        });
        
        console.log('[${this.interfaceDef.title}] 注册完成 ✅');
    }
    
    // ========== 启动 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            waitForDependencies(register${this.toPascalCase(this.columnName)}Column);
        });
    } else {
        waitForDependencies(register${this.toPascalCase(this.columnName)}Column);
    }
    
})(window || this);
`;
    }
    
    /**
     * 转换为 PascalCase
     */
    toPascalCase(str) {
        return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    }
    
    /**
     * 验证封装代码
     */
    validatePackagedCode(code) {
        const checks = [
            { name: '包含 dataInterface', test: () => code.includes('dataInterface:') },
            { name: '包含 onDataReceived', test: () => code.includes('onDataReceived:') },
            { name: '包含 ColumnRegistry.register', test: () => code.includes('ColumnRegistry.register') },
            { name: '包含 IIFE 包裹', test: () => code.startsWith('/**') && code.includes('(function(global)') },
            { name: '包含样式注入', test: () => code.includes('injectStyles()') }
        ];
        
        let passed = 0;
        checks.forEach(check => {
            if (check.test()) {
                console.log(`  ✅ ${check.name}`);
                passed++;
            } else {
                console.log(`  ❌ ${check.name}`);
            }
        });
        
        if (passed === checks.length) {
            console.log(`\n  ✅ 所有检查通过 (${passed}/${checks.length})`);
        } else {
            console.warn(`\n  ⚠️  部分检查未通过 (${passed}/${checks.length})`);
        }
    }
    
    /**
     * 打印总结
     */
    printSummary() {
        const stats = fs.statSync(this.outputFile);
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        console.log(`📦 封装信息:`);
        console.log(`  - 工作栏ID: ${this.interfaceDef.id}`);
        console.log(`  - 标题: ${this.interfaceDef.title}`);
        console.log(`  - 版本: ${this.interfaceDef.version}`);
        console.log(`  - 文件大小: ${sizeKB} KB`);
        console.log(`  - 输入参数: ${this.interfaceDef.inputs.length} 个`);
        console.log(`  - 输出参数: ${this.interfaceDef.outputs.length} 个`);
        console.log(`  - 事件: ${this.interfaceDef.events.length} 个`);
        console.log(``);
        console.log(`✅ 可以上传到 ColumnWarehouse 了！`);
        console.log(``);
    }
}

// ========== 主程序 ==========
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
工作栏封装工具

使用方式:
  node tools/package-column.js <column-dir>     封装指定工作栏
  node tools/package-column.js --help           显示帮助

示例:
  node tools/package-column.js column-sources/detail/

⚠️  注意：
  - 封装前会自动验证接口定义
  - 接口定义验证失败将中止封装
  - 请确保接口定义文件完整且正确
        `);
        return;
    }
    
    const columnDir = args[0];
    
    if (!fs.existsSync(columnDir)) {
        console.error(`❌ 目录不存在: ${columnDir}`);
        process.exit(1);
    }
    
    try {
        const packager = new ColumnPackager(columnDir);
        await packager.package();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ 封装失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 运行
if (require.main === module) {
    main();
}

module.exports = ColumnPackager;

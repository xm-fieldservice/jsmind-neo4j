#!/usr/bin/env node
/**
 * Git pre-commit Hook
 * 
 * @author 程序员
 * @date 2025-10-08
 * 
 * 功能：
 * 1. 在提交前审核代码变更
 * 2. 检查文件数量和代码行数
 * 3. 检查新增文件是否重复
 * 4. 审核不通过则阻止提交
 */

const { execSync } = require('child_process');
const path = require('path');

// 配置
const config = {
    maxFiles: 20,
    maxLines: 1000,
    checkNewFiles: true,
    verbose: true
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取暂存区的变更
function getStagedChanges() {
    try {
        const output = execSync('git diff --cached --numstat', {
            encoding: 'utf-8'
        });
        
        const files = [];
        let insertions = 0;
        let deletions = 0;
        
        const lines = output.trim().split('\n').filter(l => l);
        for (const line of lines) {
            const [add, del, file] = line.split('\t');
            const addNum = parseInt(add) || 0;
            const delNum = parseInt(del) || 0;
            
            insertions += addNum;
            deletions += delNum;
            
            files.push({
                name: file,
                insertions: addNum,
                deletions: delNum
            });
        }
        
        return {
            files,
            insertions,
            deletions,
            totalLines: insertions + deletions
        };
    } catch (error) {
        log(`获取变更失败: ${error.message}`, 'red');
        return null;
    }
}

// 获取新增文件
function getNewFiles() {
    try {
        const output = execSync('git diff --cached --name-status --diff-filter=A', {
            encoding: 'utf-8'
        });
        
        return output.trim().split('\n')
            .filter(l => l)
            .map(l => l.split('\t')[1]);
    } catch (error) {
        return [];
    }
}

// 检查文件数量
function checkFileCount(changes) {
    const count = changes.files.length;
    const passed = count <= config.maxFiles;
    
    if (config.verbose) {
        if (passed) {
            log(`  ✅ 文件数量: ${count}个`, 'green');
        } else {
            log(`  ❌ 文件数量过多: ${count}个 (限制: ${config.maxFiles}个)`, 'red');
        }
    }
    
    return {
        passed,
        count,
        message: passed ? 
            '文件数量合理' : 
            `修改文件过多，建议拆分为多个提交`
    };
}

// 检查代码行数
function checkLineCount(changes) {
    const total = changes.totalLines;
    const passed = total <= config.maxLines;
    
    if (config.verbose) {
        if (passed) {
            log(`  ✅ 代码行数: +${changes.insertions} -${changes.deletions} (总计: ${total}行)`, 'green');
        } else {
            log(`  ❌ 代码变更过大: +${changes.insertions} -${changes.deletions} (总计: ${total}行, 限制: ${config.maxLines}行)`, 'red');
        }
    }
    
    return {
        passed,
        totalLines: total,
        message: passed ? 
            '代码变更量合理' : 
            `代码变更过大，建议拆分功能`
    };
}

// 检查新增文件
function checkNewFiles(newFiles, allFiles) {
    if (!config.checkNewFiles || newFiles.length === 0) {
        if (config.verbose && newFiles.length === 0) {
            log(`  ✅ 无新增文件`, 'green');
        }
        return {
            passed: true,
            message: '无新增文件'
        };
    }
    
    const warnings = [];
    
    for (const file of newFiles) {
        const fileName = path.basename(file, path.extname(file)).toLowerCase();
        
        // 检查是否有相似的文件名
        const similar = allFiles
            .filter(f => f.name !== file)
            .filter(f => {
                const existingName = path.basename(f.name, path.extname(f.name)).toLowerCase();
                return existingName.includes(fileName) || fileName.includes(existingName);
            });
        
        if (similar.length > 0) {
            warnings.push({
                file,
                similar: similar.map(s => s.name)
            });
        }
    }
    
    if (config.verbose) {
        if (warnings.length === 0) {
            log(`  ✅ 新增文件: ${newFiles.length}个`, 'green');
        } else {
            log(`  ⚠️  新增文件可能重复:`, 'yellow');
            warnings.forEach(w => {
                log(`     - ${w.file}`, 'yellow');
                log(`       相似: ${w.similar.join(', ')}`, 'yellow');
            });
        }
    }
    
    return {
        passed: warnings.length === 0,
        warnings,
        message: warnings.length === 0 ? 
            '新增文件检查通过' : 
            `发现${warnings.length}个潜在重复文件`
    };
}

// 主函数
async function main() {
    log('\n🔍 执行提交前审核...', 'cyan');
    
    // 获取变更
    const changes = getStagedChanges();
    if (!changes) {
        log('❌ 无法获取变更信息', 'red');
        process.exit(1);
    }
    
    if (changes.files.length === 0) {
        log('ℹ️  没有需要提交的变更', 'yellow');
        process.exit(0);
    }
    
    // 执行检查
    const checks = {
        fileCount: checkFileCount(changes),
        lineCount: checkLineCount(changes),
        newFiles: checkNewFiles(getNewFiles(), changes.files)
    };
    
    // 判断结果
    const passed = Object.values(checks).every(c => c.passed);
    
    if (passed) {
        log('\n✅ 审核通过\n', 'green');
        process.exit(0);
    } else {
        log('\n❌ 审核失败\n', 'red');
        
        // 显示建议
        log('建议:', 'yellow');
        Object.values(checks).forEach(check => {
            if (!check.passed) {
                log(`  - ${check.message}`, 'yellow');
            }
        });
        
        log('\n提示:', 'cyan');
        log('  - 使用 git commit --no-verify 可以跳过审核（不推荐）', 'cyan');
        log('  - 建议拆分为多个小提交', 'cyan');
        log('  - 或使用智能提交脚本: git smart\n', 'cyan');
        
        process.exit(1);
    }
}

// 执行
main().catch(error => {
    log(`\n❌ 审核异常: ${error.message}\n`, 'red');
    // 异常时默认通过，避免阻塞开发
    process.exit(0);
});

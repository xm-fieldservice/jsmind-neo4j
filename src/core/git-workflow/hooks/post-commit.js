#!/usr/bin/env node
/**
 * Git post-commit Hook
 * 
 * @author 程序员
 * @date 2025-10-08
 * 
 * 功能：
 * 1. 提交成功后审核提交质量
 * 2. 评分并记录
 * 3. 生成质量报告
 * 4. 低质量时发出警告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取最新提交信息
function getLatestCommit() {
    try {
        const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
        const message = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
        const author = execSync('git log -1 --pretty=%an', { encoding: 'utf-8' }).trim();
        const date = execSync('git log -1 --pretty=%ai', { encoding: 'utf-8' }).trim();
        
        return { hash, message, author, date };
    } catch (error) {
        return null;
    }
}

// 审核提交信息
function reviewCommitMessage(message) {
    const commitTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'arch'];
    
    const checks = {
        type: false,
        description: false,
        details: false,
        format: false
    };
    
    // 检查类型
    const firstLine = message.split('\n')[0];
    checks.type = commitTypes.some(type => firstLine.startsWith(type + ':'));
    
    // 检查描述长度
    const description = firstLine.includes(':') ? firstLine.split(':')[1].trim() : firstLine;
    checks.description = description.length >= 10 && description.length <= 72;
    
    // 检查详细说明
    checks.details = message.includes('## 主要变更') || message.includes('## 详细说明');
    
    // 检查格式
    const lines = message.split('\n');
    checks.format = lines.length > 1 && (lines[1].trim() === '' || message.includes('##'));
    
    // 计算分数
    const weights = { type: 20, description: 15, details: 40, format: 25 };
    const score = Object.keys(checks).reduce((sum, key) => 
        sum + (checks[key] ? weights[key] : 0), 0
    );
    
    return {
        score,
        checks,
        passed: score >= 60
    };
}

// 获取提交统计
function getCommitStats() {
    try {
        const output = execSync('git diff HEAD~1 HEAD --numstat', { encoding: 'utf-8' });
        
        let files = 0;
        let insertions = 0;
        let deletions = 0;
        
        const lines = output.trim().split('\n').filter(l => l);
        for (const line of lines) {
            const [add, del] = line.split('\t');
            files++;
            insertions += parseInt(add) || 0;
            deletions += parseInt(del) || 0;
        }
        
        return { files, insertions, deletions, totalLines: insertions + deletions };
    } catch (error) {
        return { files: 0, insertions: 0, deletions: 0, totalLines: 0 };
    }
}

// 保存审核记录
function saveReviewRecord(commit, review, stats) {
    const recordsDir = path.join(process.cwd(), '.git', 'commit-reviews');
    
    try {
        // 创建目录
        if (!fs.existsSync(recordsDir)) {
            fs.mkdirSync(recordsDir, { recursive: true });
        }
        
        // 保存记录
        const record = {
            hash: commit.hash,
            author: commit.author,
            date: commit.date,
            score: review.score,
            passed: review.passed,
            checks: review.checks,
            stats: stats,
            timestamp: Date.now()
        };
        
        const filename = path.join(recordsDir, `${commit.hash.substring(0, 7)}.json`);
        fs.writeFileSync(filename, JSON.stringify(record, null, 2));
        
        return true;
    } catch (error) {
        log(`保存记录失败: ${error.message}`, 'yellow');
        return false;
    }
}

// 显示审核结果
function displayReview(commit, review, stats) {
    log('\n📊 提交质量评分', 'cyan');
    log('═'.repeat(50), 'cyan');
    
    // 总分
    const scoreColor = review.score >= 80 ? 'green' : review.score >= 60 ? 'yellow' : 'red';
    log(`\n总分: ${review.score}/100`, scoreColor);
    
    // 详细检查
    log('\n检查项:', 'cyan');
    log(`  - 提交类型: ${review.checks.type ? '✅' : '❌'} ${review.checks.type ? '正确' : '缺少'}`, 
        review.checks.type ? 'green' : 'red');
    log(`  - 描述长度: ${review.checks.description ? '✅' : '❌'} ${review.checks.description ? '合适' : '不合适'}`, 
        review.checks.description ? 'green' : 'red');
    log(`  - 详细说明: ${review.checks.details ? '✅' : '❌'} ${review.checks.details ? '完整' : '缺少'}`, 
        review.checks.details ? 'green' : 'red');
    log(`  - 格式规范: ${review.checks.format ? '✅' : '❌'} ${review.checks.format ? '正确' : '不规范'}`, 
        review.checks.format ? 'green' : 'red');
    
    // 代码统计
    log('\n代码统计:', 'cyan');
    log(`  - 修改文件: ${stats.files}个`);
    log(`  - 新增代码: +${stats.insertions}行`);
    log(`  - 删除代码: -${stats.deletions}行`);
    log(`  - 总变更量: ${stats.totalLines}行`);
    
    // 建议
    if (!review.passed) {
        log('\n⚠️  提交质量较低，建议改进:', 'yellow');
        if (!review.checks.type) {
            log('  - 添加提交类型 (feat/fix/docs等)', 'yellow');
        }
        if (!review.checks.description) {
            log('  - 优化描述长度 (10-72字符)', 'yellow');
        }
        if (!review.checks.details) {
            log('  - 添加详细说明', 'yellow');
        }
        if (!review.checks.format) {
            log('  - 使用Markdown格式', 'yellow');
        }
        log('\n  💡 建议使用智能提交脚本: git smart', 'cyan');
    } else if (review.score >= 80) {
        log('\n🎉 提交质量优秀！', 'green');
    }
    
    log('\n' + '═'.repeat(50) + '\n', 'cyan');
}

// 主函数
async function main() {
    // 获取提交信息
    const commit = getLatestCommit();
    if (!commit) {
        log('❌ 无法获取提交信息', 'red');
        return;
    }
    
    // 审核提交信息
    const review = reviewCommitMessage(commit.message);
    
    // 获取统计
    const stats = getCommitStats();
    
    // 显示结果
    displayReview(commit, review, stats);
    
    // 保存记录
    saveReviewRecord(commit, review, stats);
}

// 执行
main().catch(error => {
    log(`❌ 审核异常: ${error.message}`, 'red');
});

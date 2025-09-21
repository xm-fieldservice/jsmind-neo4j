
// localStorage 清理脚本 - 移除干扰项
console.log('🧹 开始清理localStorage干扰项...');

function analyzeLocalStorage() {
    const analysis = {
        total: localStorage.length,
        core: [],           // 核心数据 (保留)
        redundant: [],      // 冗余数据 (清理)
        backup: [],         // 备份数据 (清理)
        debug: [],          // 调试数据 (清理)
        unknown: []         // 未知数据
    };
    
    // 核心数据模式 (绝对不能删除)
    const corePatterns = [
        /^mindmap_data_v1$/,
        /^__mind_full_cache_v1$/,
        /^mm_project_catalog_v1$/,
        /^mm:root-1758256084936-b8:/  // 当前活跃脑图
    ];
    
    // 冗余数据模式 (可以删除)
    const redundantPatterns = [
        /^mindmap_root-/,           // 统一存储管理器重复缓存
        /^relation_root-/,          // 关系数据缓存
        /^unified_app_state$/,      // 应用状态
        /^unified_cache_stats$/,    // 缓存统计
        /^workspace_stats$/         // 工作区统计
    ];
    
    // 备份数据模式 (可以删除)
    const backupPatterns = [
        /^data_backup_\d+$/,       // 数据备份
        /^__registry_fallback__$/   // 注册表备份
    ];
    
    // 调试数据模式 (可以删除)
    const debugPatterns = [
        /^debug_/,
        /^test_/,
        /^temp_/
    ];
    
    // 分析所有localStorage项
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = value ? value.length : 0;
        
        const item = { key, size };
        
        // 分类
        if (corePatterns.some(pattern => pattern.test(key))) {
            analysis.core.push(item);
        } else if (redundantPatterns.some(pattern => pattern.test(key))) {
            analysis.redundant.push(item);
        } else if (backupPatterns.some(pattern => pattern.test(key))) {
            analysis.backup.push(item);
        } else if (debugPatterns.some(pattern => pattern.test(key))) {
            analysis.debug.push(item);
        } else {
            analysis.unknown.push(item);
        }
    }
    
    return analysis;
}

function cleanupLocalStorage() {
    const analysis = analyzeLocalStorage();
    
    console.log('📊 localStorage 分析结果:');
    console.log(`总计: ${analysis.total} 项`);
    console.log(`核心数据: ${analysis.core.length} 项 (保留)`);
    console.log(`冗余数据: ${analysis.redundant.length} 项 (清理)`);
    console.log(`备份数据: ${analysis.backup.length} 项 (清理)`);
    console.log(`调试数据: ${analysis.debug.length} 项 (清理)`);
    console.log(`未知数据: ${analysis.unknown.length} 项 (需检查)`);
    
    // 显示核心数据 (保留的)
    console.log('\n✅ 保留的核心数据:');
    analysis.core.forEach(item => {
        console.log(`  - ${item.key} (${(item.size/1024).toFixed(1)}KB)`);
    });
    
    // 清理冗余数据
    let cleanedCount = 0;
    let cleanedSize = 0;
    
    console.log('\n🗑️ 清理冗余数据:');
    analysis.redundant.forEach(item => {
        console.log(`  - 删除: ${item.key} (${(item.size/1024).toFixed(1)}KB)`);
        localStorage.removeItem(item.key);
        cleanedCount++;
        cleanedSize += item.size;
    });
    
    console.log('\n🗑️ 清理备份数据:');
    // 保留最新的3个备份，删除其他的
    const sortedBackups = analysis.backup.sort((a, b) => {
        const timeA = a.key.match(/\d+$/)?.[0] || '0';
        const timeB = b.key.match(/\d+$/)?.[0] || '0';
        return parseInt(timeB) - parseInt(timeA);
    });
    
    sortedBackups.forEach((item, index) => {
        if (index >= 3) { // 保留最新的3个
            console.log(`  - 删除: ${item.key} (${(item.size/1024).toFixed(1)}KB)`);
            localStorage.removeItem(item.key);
            cleanedCount++;
            cleanedSize += item.size;
        } else {
            console.log(`  - 保留: ${item.key} (最新备份)`);
        }
    });
    
    console.log('\n🗑️ 清理调试数据:');
    analysis.debug.forEach(item => {
        console.log(`  - 删除: ${item.key} (${(item.size/1024).toFixed(1)}KB)`);
        localStorage.removeItem(item.key);
        cleanedCount++;
        cleanedSize += item.size;
    });
    
    // 检查未知数据
    if (analysis.unknown.length > 0) {
        console.log('\n⚠️ 未知数据 (需要手动检查):');
        analysis.unknown.forEach(item => {
            console.log(`  - ${item.key} (${(item.size/1024).toFixed(1)}KB)`);
        });
    }
    
    console.log(`\n✅ 清理完成!`);
    console.log(`删除了 ${cleanedCount} 项，释放 ${(cleanedSize/1024).toFixed(1)}KB 空间`);
    
    return {
        cleaned: cleanedCount,
        size: cleanedSize,
        remaining: analysis.core.length + Math.min(3, analysis.backup.length)
    };
}

// 禁用自动同步机制
function disableAutoSync() {
    console.log('⏸️ 临时禁用自动同步机制...');
    window.__STORAGE_PAUSE = true;
    window.__REG_SYNC_SUPPRESS = true;
    
    // 5秒后重新启用
    setTimeout(() => {
        window.__STORAGE_PAUSE = false;
        window.__REG_SYNC_SUPPRESS = false;
        console.log('▶️ 自动同步机制已重新启用');
    }, 5000);
}

// 执行清理
try {
    disableAutoSync();
    const result = cleanupLocalStorage();
    
    alert(`localStorage 清理完成!\n\n删除项目: ${result.cleaned}\n释放空间: ${(result.size/1024).toFixed(1)}KB\n剩余项目: ${result.remaining}`);
    
    // 建议刷新页面
    if (confirm('建议刷新页面以确保更改生效，是否现在刷新？')) {
        window.location.reload();
    }
    
} catch (error) {
    console.error('❌ 清理失败:', error);
    alert('清理失败: ' + error.message);
}

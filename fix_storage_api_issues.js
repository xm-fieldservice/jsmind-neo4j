/**
 * 修复存储系统API问题
 * 解决AutogenUnifiedStorage API调用错误和localStorage配额问题
 */

(function() {
    console.log('🔧 开始修复存储系统API问题...');
    
    function analyzeStorageAPIs() {
        console.log('📊 分析存储系统API...');
        
        const analysis = {
            AutogenUnifiedStorage: {
                exists: !!window.AutogenUnifiedStorage,
                methods: [],
                correctAPI: null
            },
            Registry: {
                exists: !!window.Registry,
                methods: [],
                storeExists: !!(window.Registry && window.Registry.store)
            },
            localStorage: {
                available: typeof Storage !== 'undefined',
                usage: getLocalStorageUsage()
            }
        };
        
        // 分析AutogenUnifiedStorage的方法
        if (window.AutogenUnifiedStorage) {
            analysis.AutogenUnifiedStorage.methods = Object.getOwnPropertyNames(window.AutogenUnifiedStorage)
                .filter(name => typeof window.AutogenUnifiedStorage[name] === 'function');
            
            // 检查正确的存储方法
            if (typeof window.AutogenUnifiedStorage.store === 'function') {
                analysis.AutogenUnifiedStorage.correctAPI = 'store';
            } else if (typeof window.AutogenUnifiedStorage.set === 'function') {
                analysis.AutogenUnifiedStorage.correctAPI = 'set';
            } else if (typeof window.AutogenUnifiedStorage.save === 'function') {
                analysis.AutogenUnifiedStorage.correctAPI = 'save';
            }
        }
        
        // 分析Registry的方法
        if (window.Registry && window.Registry.store) {
            analysis.Registry.methods = Object.getOwnPropertyNames(window.Registry.store)
                .filter(name => typeof window.Registry.store[name] === 'function');
        }
        
        console.log('📋 存储系统分析结果:', analysis);
        return analysis;
    }
    
    function getLocalStorageUsage() {
        if (typeof Storage === 'undefined') {
            return { available: false };
        }
        
        let totalSize = 0;
        let itemCount = 0;
        const items = [];
        
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage.getItem(key);
                    const size = (key.length + (value ? value.length : 0)) * 2; // UTF-16编码，每字符2字节
                    totalSize += size;
                    itemCount++;
                    
                    items.push({
                        key: key,
                        size: size,
                        sizeKB: Math.round(size / 1024 * 100) / 100
                    });
                }
            }
            
            // 按大小排序
            items.sort((a, b) => b.size - a.size);
            
            return {
                available: true,
                totalSize: totalSize,
                totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
                totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
                itemCount: itemCount,
                largestItems: items.slice(0, 5), // 前5个最大的项目
                estimatedQuota: 5 * 1024 * 1024, // 大多数浏览器的localStorage限制约5MB
                usagePercentage: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
            };
        } catch (error) {
            return {
                available: true,
                error: error.message
            };
        }
    }
    
    function createSafeStorageWrapper() {
        console.log('🛡️ 创建安全存储包装器...');
        
        const safeStorage = {
            // 安全的AutogenUnifiedStorage包装
            storeToAutogen: function(key, data) {
                if (!window.AutogenUnifiedStorage) {
                    throw new Error('AutogenUnifiedStorage不可用');
                }
                
                // 检查正确的API方法
                let storeMethod = null;
                if (typeof window.AutogenUnifiedStorage.store === 'function') {
                    storeMethod = 'store';
                } else if (typeof window.AutogenUnifiedStorage.set === 'function') {
                    storeMethod = 'set';
                } else if (typeof window.AutogenUnifiedStorage.save === 'function') {
                    storeMethod = 'save';
                } else {
                    throw new Error('找不到可用的存储方法');
                }
                
                try {
                    // 确保数据格式正确
                    const validatedData = this.validateData(key, data);
                    const result = window.AutogenUnifiedStorage[storeMethod](key, validatedData);
                    console.log(`✅ 使用${storeMethod}方法保存成功:`, key);
                    return result;
                } catch (error) {
                    console.error(`❌ AutogenUnifiedStorage.${storeMethod}失败:`, error);
                    throw error;
                }
            },
            
            // 安全的localStorage包装
            storeToLocalStorage: function(key, data) {
                if (typeof Storage === 'undefined') {
                    throw new Error('localStorage不可用');
                }
                
                try {
                    const jsonData = JSON.stringify(data);
                    const sizeKB = Math.round((jsonData.length * 2) / 1024 * 100) / 100;
                    
                    console.log(`📊 准备存储到localStorage: ${key} (${sizeKB}KB)`);
                    
                    // 检查是否会超出配额
                    const usage = getLocalStorageUsage();
                    if (usage.usagePercentage > 80) {
                        console.warn('⚠️ localStorage使用率已超过80%，尝试清理...');
                        this.cleanupLocalStorage();
                    }
                    
                    localStorage.setItem(key, jsonData);
                    console.log(`✅ localStorage保存成功: ${key}`);
                    return true;
                } catch (error) {
                    if (error.name === 'QuotaExceededError') {
                        console.warn('⚠️ localStorage配额超限，尝试清理后重试...');
                        this.cleanupLocalStorage();
                        
                        try {
                            const jsonData = JSON.stringify(data);
                            localStorage.setItem(key, jsonData);
                            console.log(`✅ 清理后localStorage保存成功: ${key}`);
                            return true;
                        } catch (retryError) {
                            console.error('❌ 清理后仍然保存失败:', retryError);
                            throw retryError;
                        }
                    } else {
                        console.error('❌ localStorage保存失败:', error);
                        throw error;
                    }
                }
            },
            
            // 数据验证
            validateData: function(key, data) {
                if (key === 'mindmap_data') {
                    // 验证脑图数据格式
                    if (!data || typeof data !== 'object') {
                        throw new Error('脑图数据必须是对象');
                    }
                    
                    // 确保有必要的属性
                    const validatedData = {
                        ...data
                    };
                    
                    // 如果缺少必要属性，添加默认值
                    if (!validatedData.meta) {
                        validatedData.meta = {
                            name: 'mindmap',
                            author: 'system',
                            version: '1.0'
                        };
                    }
                    
                    if (!validatedData.format) {
                        validatedData.format = 'node_tree';
                    }
                    
                    return validatedData;
                }
                
                return data;
            },
            
            // 清理localStorage
            cleanupLocalStorage: function() {
                console.log('🧹 开始清理localStorage...');
                
                const usage = getLocalStorageUsage();
                if (!usage.available) {
                    return;
                }
                
                console.log(`📊 清理前: ${usage.totalSizeKB}KB (${usage.usagePercentage}%)`);
                
                // 清理策略：删除备份文件和临时数据
                const keysToClean = [];
                
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        // 清理备份文件
                        if (key.startsWith('mindmap_backup_') || 
                            key.startsWith('backup_') ||
                            key.startsWith('temp_') ||
                            key.startsWith('test_') ||
                            key.includes('_old') ||
                            key.includes('_cache')) {
                            keysToClean.push(key);
                        }
                    }
                }
                
                // 删除标识的键
                let cleanedSize = 0;
                keysToClean.forEach(key => {
                    try {
                        const value = localStorage.getItem(key);
                        const size = (key.length + (value ? value.length : 0)) * 2;
                        localStorage.removeItem(key);
                        cleanedSize += size;
                        console.log(`🗑️ 删除: ${key} (${Math.round(size/1024*100)/100}KB)`);
                    } catch (error) {
                        console.warn(`⚠️ 删除${key}失败:`, error);
                    }
                });
                
                const newUsage = getLocalStorageUsage();
                console.log(`✅ 清理完成: 释放${Math.round(cleanedSize/1024*100)/100}KB, 当前${newUsage.totalSizeKB}KB (${newUsage.usagePercentage}%)`);
                
                return {
                    cleanedItems: keysToClean.length,
                    cleanedSize: cleanedSize,
                    newUsage: newUsage
                };
            }
        };
        
        return safeStorage;
    }
    
    function fixMindmapSaving() {
        console.log('💾 修复脑图保存功能...');
        
        if (!window.mindmapController || !window.mindmapController.data) {
            throw new Error('脑图控制器或数据不可用');
        }
        
        const safeStorage = createSafeStorageWrapper();
        const results = {
            autogen: false,
            localStorage: false,
            mindmapController: false
        };
        
        // 方法1: 使用修复后的AutogenUnifiedStorage
        try {
            safeStorage.storeToAutogen('mindmap_data', window.mindmapController.data);
            results.autogen = true;
        } catch (error) {
            console.warn('⚠️ AutogenUnifiedStorage保存失败:', error.message);
        }
        
        // 方法2: 使用mindmapController自带的保存方法
        try {
            if (typeof window.mindmapController.saveMindmapToStorage === 'function') {
                window.mindmapController.saveMindmapToStorage(true);
                results.mindmapController = true;
                console.log('✅ mindmapController保存成功');
            }
        } catch (error) {
            console.warn('⚠️ mindmapController保存失败:', error.message);
        }
        
        // 方法3: 创建压缩备份到localStorage（仅保存关键数据）
        try {
            const compactData = {
                data: window.mindmapController.data,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            safeStorage.storeToLocalStorage('mindmap_current', compactData);
            results.localStorage = true;
        } catch (error) {
            console.warn('⚠️ localStorage备份失败:', error.message);
        }
        
        return results;
    }
    
    function runStorageFix() {
        console.log('🚀 运行存储系统修复...');
        
        const steps = [
            { name: '分析存储API', func: analyzeStorageAPIs },
            { name: '创建安全包装器', func: createSafeStorageWrapper },
            { name: '修复脑图保存', func: fixMindmapSaving }
        ];
        
        const results = [];
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`🔄 步骤 ${i + 1}: ${step.name}`);
            
            try {
                const result = step.func();
                results.push({
                    step: step.name,
                    success: true,
                    result: result
                });
                console.log(`✅ 步骤完成: ${step.name}`);
            } catch (error) {
                console.error(`❌ 步骤失败: ${step.name}`, error);
                results.push({
                    step: step.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    // 创建修复按钮
    function createStorageFixButton() {
        const button = document.createElement('button');
        button.textContent = '🔧 修复存储API';
        button.style.cssText = `
            position: fixed;
            top: 700px;
            right: 20px;
            padding: 8px 12px;
            background: #dc2626;
            color: white;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            z-index: 10000;
            font-size: 12px;
            font-weight: 500;
        `;
        
        button.addEventListener('click', () => {
            button.textContent = '⏳ 修复中...';
            button.disabled = true;
            
            try {
                const results = runStorageFix();
                const successCount = results.filter(r => r.success).length;
                
                if (successCount === results.length) {
                    button.textContent = '✅ 修复完成';
                    button.style.background = '#10b981';
                } else {
                    button.textContent = '⚠️ 部分修复';
                    button.style.background = '#f59e0b';
                }
                
                console.log('📊 存储修复结果:', results);
                
            } catch (error) {
                button.textContent = '❌ 修复失败';
                button.style.background = '#ef4444';
                console.error('存储修复异常:', error);
            }
            
            setTimeout(() => {
                button.textContent = '🔧 修复存储API';
                button.disabled = false;
                button.style.background = '#dc2626';
            }, 5000);
        });
        
        document.body.appendChild(button);
        console.log('🔘 存储API修复按钮已创建');
    }
    
    // 延迟创建按钮
    setTimeout(() => {
        createStorageFixButton();
        console.log('💡 点击"🔧 修复存储API"按钮修复存储系统问题');
    }, 16000);
    
    // 导出修复函数
    window.fixStorageAPIIssues = {
        analyzeStorageAPIs: analyzeStorageAPIs,
        createSafeStorageWrapper: createSafeStorageWrapper,
        fixMindmapSaving: fixMindmapSaving,
        runStorageFix: runStorageFix
    };
    
    console.log('🛠️ 存储API修复脚本已加载');
    
})();

/**
 * 修复系统初始化机制 - 确保每次都加载上次保存的内容
 * 解决每次初始化都创建新脑图的问题
 */

(function() {
    console.log('🔧 开始修复持久化初始化机制...');
    
    // 等待MindmapController加载
    function waitForController() {
        if (!window.mindmapController) {
            setTimeout(waitForController, 100);
            return;
        }
        
        const mc = window.mindmapController;
        console.log('✅ MindmapController已加载，开始修复...');
        
        // 1. 修复getDefaultData方法 - 避免每次都生成新ID
        if (mc.getDefaultData && !mc._getDefaultDataFixed) {
            const originalGetDefaultData = mc.getDefaultData.bind(mc);
            
            mc.getDefaultData = function() {
                console.log('🔍 getDefaultData被调用，尝试使用持久化数据...');
                
                // 首先尝试从各种存储中获取现有数据
                const existingData = this._tryLoadExistingData();
                if (existingData) {
                    console.log('✅ 找到现有数据，使用现有数据而不是创建新的');
                    return existingData;
                }
                
                // 如果真的没有任何数据，使用固定的默认ID
                console.log('⚠️ 未找到现有数据，创建固定ID的默认数据');
                const defaultId = 'root-default-project';
                return {
                    id: defaultId,
                    label: '项目脑图',
                    content: '标签: 议题\n\n# 根节点\n\n在此编写内容...',
                    expanded: true,
                    children: []
                };
            };
            
            // 添加辅助方法来尝试加载现有数据
            mc._tryLoadExistingData = function() {
                console.log('🔍 尝试从各种存储源加载现有数据...');
                
                // 1. 尝试从AutogenUnifiedStorage加载
                if (this.autogenStorage) {
                    try {
                        // 同步尝试获取（如果有缓存）
                        const storageData = localStorage.getItem('autogen:mindmap:mindmap_data_v1');
                        if (storageData) {
                            const parsed = JSON.parse(storageData);
                            if (parsed && parsed.data) {
                                console.log('✅ 从AutogenUnifiedStorage缓存加载成功');
                                return this.fromJsMindTree(parsed.data);
                            }
                        }
                    } catch (error) {
                        console.warn('AutogenUnifiedStorage缓存加载失败:', error);
                    }
                }
                
                // 2. 尝试从localStorage的各种键加载
                const storageKeys = [
                    'mindmap_data_v1',
                    '__mind_full_cache_v1'
                ];
                
                for (const key of storageKeys) {
                    try {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && parsed.data) {
                                console.log(`✅ 从localStorage(${key})加载成功`);
                                return this.fromJsMindTree(parsed.data);
                            }
                        }
                    } catch (error) {
                        console.warn(`localStorage(${key})加载失败:`, error);
                    }
                }
                
                // 3. 尝试从per-mind存储键加载
                try {
                    const keys = Object.keys(localStorage).filter(key => key.startsWith('mm:') && key.endsWith(':data'));
                    for (const key of keys) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && parsed.data) {
                                console.log(`✅ 从per-mind存储(${key})加载成功`);
                                return this.fromJsMindTree(parsed.data);
                            }
                        }
                    }
                } catch (error) {
                    console.warn('per-mind存储加载失败:', error);
                }
                
                console.log('⚠️ 所有存储源都没有找到有效数据');
                return null;
            };
            
            mc._getDefaultDataFixed = true;
            console.log('✅ getDefaultData方法已修复');
        }
        
        // 2. 增强loadMindmapFromStorage方法
        if (mc.loadMindmapFromStorage && !mc._loadMindmapFromStorageFixed) {
            const originalLoadMindmapFromStorage = mc.loadMindmapFromStorage.bind(mc);
            
            mc.loadMindmapFromStorage = async function() {
                console.log('🔍 loadMindmapFromStorage被调用，开始全面搜索存储数据...');
                
                // 1. 首先尝试原始方法
                try {
                    const originalResult = await originalLoadMindmapFromStorage();
                    if (originalResult) {
                        console.log('✅ 原始加载方法成功');
                        return originalResult;
                    }
                } catch (error) {
                    console.warn('原始加载方法失败:', error);
                }
                
                // 2. 尝试从_tryLoadExistingData加载
                if (this._tryLoadExistingData) {
                    const existingData = this._tryLoadExistingData();
                    if (existingData) {
                        console.log('✅ 从_tryLoadExistingData加载成功');
                        return existingData;
                    }
                }
                
                // 3. 最后的尝试：搜索所有可能的存储键
                console.log('🔍 执行最后的全面搜索...');
                const allKeys = Object.keys(localStorage);
                const mindmapKeys = allKeys.filter(key => 
                    key.includes('mindmap') || 
                    key.includes('mind') || 
                    key.startsWith('mm:') ||
                    key.includes('cache')
                );
                
                for (const key of mindmapKeys) {
                    try {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && (parsed.data || parsed.format)) {
                                const data = parsed.data || parsed;
                                if (data.id && (data.label || data.topic)) {
                                    console.log(`✅ 从全面搜索(${key})找到数据`);
                                    return this.fromJsMindTree ? this.fromJsMindTree(data) : data;
                                }
                            }
                        }
                    } catch (error) {
                        // 忽略解析错误，继续搜索
                    }
                }
                
                console.log('⚠️ 所有加载尝试都失败，返回null');
                return null;
            };
            
            mc._loadMindmapFromStorageFixed = true;
            console.log('✅ loadMindmapFromStorage方法已增强');
        }
        
        // 3. 修复_loadInitialData方法 - 确保优先使用现有数据
        if (mc._loadInitialData && !mc._loadInitialDataFixed) {
            const original_loadInitialData = mc._loadInitialData.bind(mc);
            
            mc._loadInitialData = async function() {
                console.log('🔍 _loadInitialData被调用，优先加载现有数据...');
                
                try {
                    const loadedData = await this.loadMindmapFromStorage();
                    
                    if (loadedData) {
                        console.log('✅ 成功加载现有数据，不创建新数据');
                        this.data = loadedData;
                    } else {
                        console.log('⚠️ 未找到现有数据，使用getDefaultData');
                        this.data = this.getDefaultData();
                    }
                    
                    // 数据加载完成后，如果已经初始化了mind实例，重新渲染
                    if (this.mind) {
                        this.renderMindmap();
                    }
                    
                    console.log('✅ 初始数据加载完成，数据ID:', this.data?.id);
                    
                } catch (error) {
                    console.error('[MindmapController] 初始数据加载失败:', error);
                    console.log('🔄 加载失败，使用getDefaultData作为后备');
                    this.data = this.getDefaultData();
                }
            };
            
            mc._loadInitialDataFixed = true;
            console.log('✅ _loadInitialData方法已修复');
        }
        
        // 4. 增强保存机制 - 确保数据被正确保存
        if (mc.saveMindmapToStorage && !mc._saveMindmapToStorageFixed) {
            const originalSaveMindmapToStorage = mc.saveMindmapToStorage.bind(mc);
            
            mc.saveMindmapToStorage = async function(immediate = false) {
                // 调用原始保存方法
                const result = await originalSaveMindmapToStorage(immediate);
                
                // 额外保存到多个位置确保数据不丢失
                if (immediate && this.data) {
                    try {
                        // 保存到主键
                        const mainData = {
                            format: 'node_tree',
                            data: this.toJsMindTree ? this.toJsMindTree(this.data) : this.data
                        };
                        localStorage.setItem('mindmap_data_v1', JSON.stringify(mainData));
                        
                        // 保存到per-mind键
                        if (this.data.id) {
                            localStorage.setItem(`mm:${this.data.id}:data`, JSON.stringify(mainData));
                        }
                        
                        console.log('✅ 数据已保存到多个位置，确保持久化');
                    } catch (error) {
                        console.warn('额外保存失败:', error);
                    }
                }
                
                return result;
            };
            
            mc._saveMindmapToStorageFixed = true;
            console.log('✅ saveMindmapToStorage方法已增强');
        }
        
        // 5. 修复页面关闭时的保存
        if (!window._beforeUnloadFixed) {
            window.addEventListener('beforeunload', () => {
                console.log('🔄 页面关闭，立即保存当前数据...');
                if (mc && mc.saveMindmapToStorage) {
                    mc.saveMindmapToStorage(true); // 立即保存
                }
            });
            window._beforeUnloadFixed = true;
            console.log('✅ 页面关闭保存机制已设置');
        }
        
        console.log('🎉 持久化初始化机制修复完成！');
        
        // 显示修复完成通知
        showFixNotification('持久化初始化机制已修复', 'success');
    }
    
    function showFixNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 260px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;
        
        const colors = {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    // 开始修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForController);
    } else {
        waitForController();
    }
    
})();

console.log('🛠️ 持久化初始化修复工具已加载');

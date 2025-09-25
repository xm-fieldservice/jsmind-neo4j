/**
 * 修复关系管理模块与AutogenUnifiedStorage的集成
 */

(function() {
    console.log('🔧 开始修复关系管理模块存储集成...');
    
    // 等待所有组件加载
    function waitForComponents() {
        const checkReady = () => {
            const hasAutogenStorage = window.AutogenUnifiedStorage;
            const hasRelationFrontend = window.RelationFrontend;
            const hasRelationDataManager = window.RelationDataManager;
            
            if (hasAutogenStorage && hasRelationFrontend && hasRelationDataManager) {
                integrateStorageSystem();
            } else {
                setTimeout(checkReady, 200);
            }
        };
        
        checkReady();
    }
    
    function integrateStorageSystem() {
        console.log('🔗 开始集成存储系统...');
        
        // 1. 修复RelationDataManager与AutogenUnifiedStorage的集成
        if (window.RelationDataManager && !window.RelationDataManager.prototype._storageFixed) {
            const originalConstructor = window.RelationDataManager;
            
            // 重写构造函数以自动使用AutogenUnifiedStorage
            window.RelationDataManager = function(unifiedStorage = null) {
                // 如果没有提供存储实例，自动使用全局的AutogenUnifiedStorage
                if (!unifiedStorage && window.AutogenUnifiedStorage) {
                    unifiedStorage = window.AutogenUnifiedStorage;
                    console.log('✅ RelationDataManager自动使用AutogenUnifiedStorage');
                }
                
                return originalConstructor.call(this, unifiedStorage);
            };
            
            // 复制原型
            window.RelationDataManager.prototype = originalConstructor.prototype;
            window.RelationDataManager.prototype._storageFixed = true;
            
            console.log('✅ RelationDataManager存储集成已修复');
        }
        
        // 2. 修复RelationFrontend的存储引用
        if (window.relationFrontend) {
            const frontend = window.relationFrontend;
            
            // 设置统一存储引用
            if (!frontend.storage && window.AutogenUnifiedStorage) {
                frontend.storage = window.AutogenUnifiedStorage;
                console.log('✅ RelationFrontend已连接到AutogenUnifiedStorage');
            }
            
            // 重新初始化数据管理器
            if (!frontend.dataManager || !frontend.dataManager.storage) {
                frontend.dataManager = new window.RelationDataManager(window.AutogenUnifiedStorage);
                console.log('✅ RelationFrontend数据管理器已重新初始化');
            }
        }
        
        // 3. 创建全局关系管理实例（如果不存在）
        if (!window.relationFrontend && window.RelationFrontend) {
            window.relationFrontend = new window.RelationFrontend();
            console.log('✅ 全局RelationFrontend实例已创建');
        }
        
        // 4. 确保关系管理模块在ColumnManager中注册
        if (window.columnManager) {
            const cm = window.columnManager;
            
            // 检查关系栏是否在活动视图中
            const relationColumn = document.getElementById('relation-column');
            if (relationColumn && !cm.activeViews.includes('relation')) {
                // 不自动激活，但确保支持
                console.log('💡 关系栏已准备就绪，可通过视图切换按钮激活');
            }
        }
        
        console.log('✅ 关系管理模块存储集成修复完成');
    }
    
    // 开始等待组件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForComponents);
    } else {
        waitForComponents();
    }
    
    // 提供手动修复函数
    window.fixRelationStorageIntegration = integrateStorageSystem;
    
})();

console.log('🛠️ 关系管理模块存储集成修复工具已加载');

/**
 * 测试面板功能脚本
 * 为详情栏第三个选项卡提供手动测试功能
 */

(function() {
    'use strict';
    
    // 测试工具集合
    const TestPanel = {
        
        /**
         * 初始化测试面板
         */
        init() {
            console.log('🧪 测试面板初始化');
            this.bindEvents();
        },
        
        /**
         * 绑定事件
         */
        bindEvents() {
            // 脑图功能测试
            document.getElementById('test-mindmap-render')?.addEventListener('click', () => this.testMindmapRender());
            document.getElementById('test-mindmap-data')?.addEventListener('click', () => this.testMindmapData());
            document.getElementById('test-mindmap-storage')?.addEventListener('click', () => this.testMindmapStorage());
            
            // 存储系统测试
            document.getElementById('test-storage-basic')?.addEventListener('click', () => this.testStorageBasic());
            document.getElementById('test-storage-migration')?.addEventListener('click', () => this.testStorageMigration());
            document.getElementById('test-storage-cleanup')?.addEventListener('click', () => this.testStorageCleanup());
            
            // 导入导出测试
            document.getElementById('test-import-flow')?.addEventListener('click', () => this.testImportFlow());
            document.getElementById('test-export-flow')?.addEventListener('click', () => this.testExportFlow());
            document.getElementById('test-refresh-mechanism')?.addEventListener('click', () => this.testRefreshMechanism());
            
            // 系统诊断
            document.getElementById('test-system-health')?.addEventListener('click', () => this.testSystemHealth());
            document.getElementById('test-clear-all')?.addEventListener('click', () => this.clearAllResults());
        },
        
        /**
         * 输出测试结果
         */
        output(containerId, message, type = 'info') {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const timestamp = new Date().toLocaleTimeString();
            const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
            
            container.textContent += `[${timestamp}] ${prefix} ${message}\n`;
            container.scrollTop = container.scrollHeight;
        },
        
        /**
         * 清空指定容器的结果
         */
        clearResult(containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                container.textContent = '';
            }
        },
        
        /**
         * 测试脑图渲染功能
         */
        testMindmapRender() {
            this.clearResult('mindmap-test-result');
            this.output('mindmap-test-result', '开始测试脑图渲染功能...');
            
            try {
                // 检查MindmapController
                if (!window.mindmapController) {
                    this.output('mindmap-test-result', 'MindmapController未找到', 'error');
                    return;
                }
                
                // 检查jsMind实例
                if (!window.mindmapController.mind) {
                    this.output('mindmap-test-result', 'jsMind实例未创建', 'error');
                    return;
                }
                
                // 检查当前数据
                const currentData = window.mindmapController.data;
                if (!currentData) {
                    this.output('mindmap-test-result', '当前脑图数据为空', 'error');
                    return;
                }
                
                this.output('mindmap-test-result', `当前脑图ID: ${currentData.id}`, 'success');
                this.output('mindmap-test-result', `当前脑图标题: ${currentData.label}`, 'success');
                this.output('mindmap-test-result', `子节点数量: ${currentData.children?.length || 0}`, 'success');
                
                // 尝试重新渲染
                window.mindmapController.renderMindmap();
                this.output('mindmap-test-result', '脑图重新渲染完成', 'success');
                
            } catch (error) {
                this.output('mindmap-test-result', `渲染测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试脑图数据验证
         */
        testMindmapData() {
            this.clearResult('mindmap-test-result');
            this.output('mindmap-test-result', '开始验证脑图数据完整性...');
            
            try {
                const data = window.mindmapController?.data;
                if (!data) {
                    this.output('mindmap-test-result', '脑图数据不存在', 'error');
                    return;
                }
                
                // 验证根节点
                const issues = [];
                if (!data.id) issues.push('缺少ID');
                if (!data.label || data.label.trim() === '') issues.push('标题为空');
                if (!Array.isArray(data.children)) issues.push('children不是数组');
                
                if (issues.length > 0) {
                    this.output('mindmap-test-result', `数据问题: ${issues.join(', ')}`, 'error');
                } else {
                    this.output('mindmap-test-result', '根节点数据完整', 'success');
                }
                
                // 递归验证子节点
                let nodeCount = 1;
                const validateNode = (node, path = 'root') => {
                    if (node.children && Array.isArray(node.children)) {
                        node.children.forEach((child, index) => {
                            nodeCount++;
                            const childPath = `${path}.children[${index}]`;
                            const childIssues = [];
                            
                            if (!child.id) childIssues.push('缺少ID');
                            if (!child.label || child.label.trim() === '') childIssues.push('标题为空');
                            
                            if (childIssues.length > 0) {
                                this.output('mindmap-test-result', `${childPath}: ${childIssues.join(', ')}`, 'error');
                            }
                            
                            validateNode(child, childPath);
                        });
                    }
                };
                
                validateNode(data);
                this.output('mindmap-test-result', `总节点数: ${nodeCount}`, 'success');
                this.output('mindmap-test-result', '数据验证完成', 'success');
                
            } catch (error) {
                this.output('mindmap-test-result', `数据验证失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试脑图存储功能
         */
        testMindmapStorage() {
            this.clearResult('mindmap-test-result');
            this.output('mindmap-test-result', '开始测试脑图存储功能...');
            
            try {
                // 测试保存
                if (window.mindmapController && typeof window.mindmapController.saveMindmapToStorage === 'function') {
                    window.mindmapController.saveMindmapToStorage();
                    this.output('mindmap-test-result', '脑图保存测试完成', 'success');
                } else {
                    this.output('mindmap-test-result', '保存方法不可用', 'error');
                }
                
                // 测试AutogenUnifiedStorage
                if (window.AutogenUnifiedStorage) {
                    const testKey = 'test_mindmap_storage';
                    const testData = { test: true, timestamp: Date.now() };
                    
                    window.AutogenUnifiedStorage.set(`autogen:test:${testKey}`, testData);
                    const retrieved = window.AutogenUnifiedStorage.get(`autogen:test:${testKey}`);
                    
                    if (retrieved && retrieved.test === true) {
                        this.output('mindmap-test-result', 'AutogenUnifiedStorage读写测试通过', 'success');
                        window.AutogenUnifiedStorage.delete(`autogen:test:${testKey}`);
                        this.output('mindmap-test-result', '测试数据已清理', 'success');
                    } else {
                        this.output('mindmap-test-result', 'AutogenUnifiedStorage读写测试失败', 'error');
                    }
                } else {
                    this.output('mindmap-test-result', 'AutogenUnifiedStorage不可用', 'error');
                }
                
            } catch (error) {
                this.output('mindmap-test-result', `存储测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试存储系统基础功能
         */
        testStorageBasic() {
            this.clearResult('storage-test-result');
            this.output('storage-test-result', '开始测试存储系统基础功能...');
            
            try {
                // 测试localStorage
                const testKey = 'test_basic_storage';
                const testValue = { test: true, time: Date.now() };
                
                localStorage.setItem(testKey, JSON.stringify(testValue));
                const retrieved = JSON.parse(localStorage.getItem(testKey) || '{}');
                
                if (retrieved.test === true) {
                    this.output('storage-test-result', 'localStorage读写正常', 'success');
                    localStorage.removeItem(testKey);
                } else {
                    this.output('storage-test-result', 'localStorage读写异常', 'error');
                }
                
                // 测试AutogenUnifiedStorage
                if (window.AutogenUnifiedStorage) {
                    this.output('storage-test-result', 'AutogenUnifiedStorage已加载', 'success');
                    
                    // 获取存储统计
                    if (typeof window.AutogenUnifiedStorage.getStorageStats === 'function') {
                        const stats = window.AutogenUnifiedStorage.getStorageStats();
                        this.output('storage-test-result', `存储统计: ${stats.totalSize}, ${stats.totalItems}项`, 'success');
                    }
                } else {
                    this.output('storage-test-result', 'AutogenUnifiedStorage未加载', 'error');
                }
                
            } catch (error) {
                this.output('storage-test-result', `基础功能测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试存储数据迁移
         */
        testStorageMigration() {
            this.clearResult('storage-test-result');
            this.output('storage-test-result', '开始测试存储数据迁移...');
            
            try {
                if (window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage.migrateFromLocalStorage === 'function') {
                    // 创建一些旧格式数据用于测试
                    localStorage.setItem('mindmap_data_v1', JSON.stringify({
                        id: 'test-migration',
                        label: '迁移测试',
                        children: []
                    }));
                    
                    // 执行迁移
                    const migrated = window.AutogenUnifiedStorage.migrateFromLocalStorage();
                    this.output('storage-test-result', `迁移完成，处理了 ${migrated} 个项目`, 'success');
                    
                    // 清理测试数据
                    localStorage.removeItem('mindmap_data_v1');
                    
                } else {
                    this.output('storage-test-result', '迁移功能不可用', 'error');
                }
                
            } catch (error) {
                this.output('storage-test-result', `迁移测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试存储清理功能
         */
        testStorageCleanup() {
            this.clearResult('storage-test-result');
            this.output('storage-test-result', '开始测试存储清理功能...');
            
            try {
                if (window.AutogenUnifiedStorage) {
                    // 创建一些测试数据
                    const testKeys = ['test_cleanup_1', 'test_cleanup_2', 'test_cleanup_3'];
                    testKeys.forEach(key => {
                        window.AutogenUnifiedStorage.set(`autogen:test:${key}`, { test: true });
                    });
                    
                    this.output('storage-test-result', '已创建测试数据', 'success');
                    
                    // 清理测试数据
                    let cleaned = 0;
                    testKeys.forEach(key => {
                        if (window.AutogenUnifiedStorage.delete(`autogen:test:${key}`)) {
                            cleaned++;
                        }
                    });
                    
                    this.output('storage-test-result', `清理了 ${cleaned} 个测试项目`, 'success');
                    
                } else {
                    this.output('storage-test-result', 'AutogenUnifiedStorage不可用', 'error');
                }
                
            } catch (error) {
                this.output('storage-test-result', `清理测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试导入流程
         */
        testImportFlow() {
            this.clearResult('import-export-test-result');
            this.output('import-export-test-result', '开始测试导入流程...');
            
            try {
                // 检查导入相关组件
                if (!window.mindmapController) {
                    this.output('import-export-test-result', 'MindmapController不可用', 'error');
                    return;
                }
                
                if (!window.Registry) {
                    this.output('import-export-test-result', 'Registry系统不可用', 'error');
                    return;
                }
                
                // 模拟导入数据
                const mockData = {
                    id: 'test-import-' + Date.now(),
                    name: '测试导入脑图',
                    data: {
                        format: 'node_tree',
                        data: {
                            id: 'root-test-import',
                            topic: '测试导入根节点',
                            children: [
                                { id: 'child1', topic: '子节点1' },
                                { id: 'child2', topic: '子节点2' }
                            ]
                        }
                    }
                };
                
                this.output('import-export-test-result', '模拟数据已准备', 'success');
                this.output('import-export-test-result', `数据ID: ${mockData.id}`, 'success');
                this.output('import-export-test-result', '导入流程测试完成（仅验证组件可用性）', 'success');
                
            } catch (error) {
                this.output('import-export-test-result', `导入流程测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试导出流程
         */
        testExportFlow() {
            this.clearResult('import-export-test-result');
            this.output('import-export-test-result', '开始测试导出流程...');
            
            try {
                if (!window.mindmapController) {
                    this.output('import-export-test-result', 'MindmapController不可用', 'error');
                    return;
                }
                
                // 获取当前数据
                const currentData = window.mindmapController.data;
                if (!currentData) {
                    this.output('import-export-test-result', '当前无脑图数据可导出', 'error');
                    return;
                }
                
                // 转换为导出格式
                const exportData = {
                    format: 'node_tree',
                    data: window.mindmapController.toJsMindTree(currentData)
                };
                
                this.output('import-export-test-result', '数据转换成功', 'success');
                this.output('import-export-test-result', `导出数据大小: ${JSON.stringify(exportData).length} 字符`, 'success');
                this.output('import-export-test-result', '导出流程测试完成', 'success');
                
            } catch (error) {
                this.output('import-export-test-result', `导出流程测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 测试界面刷新机制
         */
        testRefreshMechanism() {
            this.clearResult('import-export-test-result');
            this.output('import-export-test-result', '开始测试界面刷新机制...');
            
            try {
                // 检查事件系统
                if (window.AutogenEventBus) {
                    this.output('import-export-test-result', 'AutogenEventBus可用', 'success');
                    
                    // 测试事件触发
                    const testEventHandler = (event) => {
                        this.output('import-export-test-result', `收到测试事件: ${JSON.stringify(event.detail)}`, 'success');
                    };
                    
                    window.AutogenEventBus.on('test:refresh', testEventHandler);
                    window.AutogenEventBus.emit('test:refresh', { test: true, timestamp: Date.now() });
                    window.AutogenEventBus.off('test:refresh', testEventHandler);
                    
                } else {
                    this.output('import-export-test-result', 'AutogenEventBus不可用', 'error');
                }
                
                // 检查Registry刷新
                if (window.Registry && typeof window.Registry.refresh === 'function') {
                    this.output('import-export-test-result', 'Registry刷新功能可用', 'success');
                } else {
                    this.output('import-export-test-result', 'Registry刷新功能不可用', 'error');
                }
                
            } catch (error) {
                this.output('import-export-test-result', `界面刷新测试失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 系统健康检查
         */
        testSystemHealth() {
            this.clearResult('system-diagnostic-result');
            this.output('system-diagnostic-result', '开始系统健康检查...');
            
            try {
                const components = {
                    'MindmapController': !!window.mindmapController,
                    'AutogenUnifiedStorage': !!window.AutogenUnifiedStorage,
                    'AutogenEventBus': !!window.AutogenEventBus,
                    'Registry': !!window.Registry,
                    'jsMind': !!(window.mindmapController && window.mindmapController.mind)
                };
                
                let healthyCount = 0;
                Object.entries(components).forEach(([name, status]) => {
                    const statusText = status ? '正常' : '异常';
                    const type = status ? 'success' : 'error';
                    this.output('system-diagnostic-result', `${name}: ${statusText}`, type);
                    if (status) healthyCount++;
                });
                
                const healthPercentage = Math.round((healthyCount / Object.keys(components).length) * 100);
                this.output('system-diagnostic-result', `系统健康度: ${healthPercentage}% (${healthyCount}/${Object.keys(components).length})`, 
                    healthPercentage >= 80 ? 'success' : 'error');
                
                // 内存使用情况
                if (performance.memory) {
                    const memory = performance.memory;
                    this.output('system-diagnostic-result', 
                        `内存使用: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`, 
                        'success');
                }
                
            } catch (error) {
                this.output('system-diagnostic-result', `健康检查失败: ${error.message}`, 'error');
            }
        },
        
        /**
         * 清空所有测试结果
         */
        clearAllResults() {
            const resultContainers = [
                'mindmap-test-result',
                'storage-test-result', 
                'import-export-test-result',
                'system-diagnostic-result'
            ];
            
            resultContainers.forEach(id => this.clearResult(id));
            console.log('🧹 所有测试结果已清空');
        }
    };
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => TestPanel.init(), 1000);
        });
    } else {
        setTimeout(() => TestPanel.init(), 1000);
    }
    
    // 导出到全局
    window.TestPanel = TestPanel;
    
    console.log('🧪 测试面板脚本已加载');
    
})();

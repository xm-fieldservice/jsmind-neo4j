/**
 * 脑图加载问题修复脚本
 * 解决：1. 强刷脑图不能正常加载  2. '读'按键导入的JSON不能正常显示脑图
 */

(function() {
    'use strict';
    
    const MindmapLoadingFixer = {
        
        /**
         * 修复脑图数据结构问题
         */
        fixMindmapData(data) {
            if (!data || typeof data !== 'object') {
                console.warn('[修复] 数据为空或无效，创建默认数据');
                return this.createDefaultData();
            }
            
            let fixed = false;
            
            // 修复根节点ID
            if (!data.id) {
                data.id = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                console.warn(`[修复] 添加缺失的根节点ID: ${data.id}`);
                fixed = true;
            }
            
            // 修复根节点标题
            if (!data.label || !String(data.label).trim()) {
                data.label = data.id.startsWith('root-') ? '项目脑图' : '未命名项目';
                console.warn(`[修复] 修复空标题: ${data.id} -> ${data.label}`);
                fixed = true;
            }
            
            // 修复topic字段（jsMind需要）
            if (!data.topic) {
                data.topic = data.label;
                fixed = true;
            }
            
            // 修复children数组
            if (!Array.isArray(data.children)) {
                data.children = [];
                console.warn(`[修复] 添加缺失的children数组`);
                fixed = true;
            }
            
            // 修复expanded属性
            if (data.expanded === undefined) {
                data.expanded = true;
                fixed = true;
            }
            
            // 递归修复子节点
            if (data.children && data.children.length > 0) {
                data.children.forEach((child, index) => {
                    const fixedChild = this.fixMindmapData(child);
                    if (fixedChild !== child) {
                        data.children[index] = fixedChild;
                        fixed = true;
                    }
                });
            }
            
            if (fixed) {
                console.log(`[修复] 已修复节点: ${data.id} (${data.label})`);
            }
            
            return data;
        },
        
        /**
         * 创建默认数据结构
         */
        createDefaultData() {
            return {
                id: `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                label: '项目脑图',
                topic: '项目脑图',
                content: `创建: ${new Date().toLocaleString()}\n\n这是一个新的脑图项目。`,
                expanded: true,
                children: []
            };
        },
        
        /**
         * 修复jsMind数据格式
         */
        fixJsMindFormat(jmData) {
            if (!jmData || !jmData.data) {
                console.warn('[修复] jsMind数据格式无效');
                return null;
            }
            
            // 递归修复节点
            const fixNode = (node) => {
                if (!node || !node.id) return null;
                
                // 确保topic不为空
                if (!node.topic || !String(node.topic).trim()) {
                    node.topic = node.id.startsWith('root-') ? '项目脑图' : '未命名节点';
                    console.warn(`[修复] 修复jsMind节点空标题: ${node.id} -> ${node.topic}`);
                }
                
                // 确保expanded属性
                if (node.expanded === undefined) {
                    node.expanded = true;
                }
                
                // 确保data对象
                if (!node.data) {
                    node.data = {};
                }
                
                // 同步content
                if (node.content !== undefined && !node.data.content) {
                    node.data.content = node.content;
                }
                
                // 递归处理子节点
                if (node.children && node.children.length > 0) {
                    node.children = node.children.map(fixNode).filter(Boolean);
                }
                
                return node;
            };
            
            jmData.data = fixNode(jmData.data);
            return jmData;
        },
        
        /**
         * 增强MindmapController的renderMindmap方法
         */
        enhanceRenderMindmap() {
            if (!window.mindmapController || !window.mindmapController.renderMindmap) {
                console.warn('[修复] MindmapController不可用');
                return;
            }
            
            const originalRender = window.mindmapController.renderMindmap;
            
            window.mindmapController.renderMindmap = function() {
                console.log('[修复] 增强版renderMindmap开始执行');
                
                try {
                    // 数据修复
                    if (this.data) {
                        this.data = MindmapLoadingFixer.fixMindmapData(this.data);
                    } else {
                        console.warn('[修复] 数据为空，创建默认数据');
                        this.data = MindmapLoadingFixer.createDefaultData();
                    }
                    
                    // 调用原始方法
                    return originalRender.call(this);
                    
                } catch (error) {
                    console.error('[修复] renderMindmap执行失败:', error);
                    
                    // 错误恢复：创建基础脑图
                    try {
                        this.data = MindmapLoadingFixer.createDefaultData();
                        return originalRender.call(this);
                    } catch (recoveryError) {
                        console.error('[修复] 错误恢复也失败:', recoveryError);
                        this.showToast && this.showToast('脑图渲染失败，请刷新页面', 'error');
                    }
                }
            };
            
            console.log('[修复] ✅ renderMindmap方法已增强');
        },
        
        /**
         * 增强数据转换方法
         */
        enhanceDataConversion() {
            if (!window.mindmapController) return;
            
            // 增强fromJsMindTree方法
            const originalFromJsMind = window.mindmapController.fromJsMindTree;
            if (originalFromJsMind) {
                window.mindmapController.fromJsMindTree = function(jmNode) {
                    try {
                        // 预处理修复
                        if (jmNode && (!jmNode.topic || !String(jmNode.topic).trim())) {
                            jmNode.topic = jmNode.id && jmNode.id.startsWith('root-') ? '项目脑图' : '未命名节点';
                            console.warn(`[修复] fromJsMindTree修复空标题: ${jmNode.id} -> ${jmNode.topic}`);
                        }
                        
                        const result = originalFromJsMind.call(this, jmNode);
                        return result ? MindmapLoadingFixer.fixMindmapData(result) : null;
                    } catch (error) {
                        console.error('[修复] fromJsMindTree失败:', error);
                        return null;
                    }
                };
            }
            
            // 增强toJsMindTree方法
            const originalToJsMind = window.mindmapController.toJsMindTree;
            if (originalToJsMind) {
                window.mindmapController.toJsMindTree = function(node, depth = 0) {
                    try {
                        // 预处理修复
                        if (node) {
                            node = MindmapLoadingFixer.fixMindmapData(node);
                        }
                        
                        const result = originalToJsMind.call(this, node, depth);
                        return result ? MindmapLoadingFixer.fixJsMindFormat({ data: result }).data : null;
                    } catch (error) {
                        console.error('[修复] toJsMindTree失败:', error);
                        return null;
                    }
                };
            }
            
            console.log('[修复] ✅ 数据转换方法已增强');
        },
        
        /**
         * 增强导入功能
         */
        enhanceImportFunction() {
            if (!window.mindmapController || !window.mindmapController.loadFirstMindmapFromList) {
                return;
            }
            
            const originalLoad = window.mindmapController.loadFirstMindmapFromList;
            
            window.mindmapController.loadFirstMindmapFromList = async function() {
                console.log('[修复] 增强版loadFirstMindmapFromList开始执行');
                
                try {
                    if (window.Registry && window.Registry.repo && window.Registry.repo.store) {
                        const projects = window.Registry.repo.store.state.projects;
                        if (projects && projects.length > 0) {
                            const firstProject = projects[0];
                            
                            if (firstProject.payload && firstProject.payload.data) {
                                let data = firstProject.payload.data;
                                
                                // 数据格式处理
                                if (data.format === 'node_tree' && data.data) {
                                    data = MindmapLoadingFixer.fixJsMindFormat(data);
                                    if (data && data.data) {
                                        data = this.fromJsMindTree(data.data);
                                    }
                                } else {
                                    data = MindmapLoadingFixer.fixMindmapData(data);
                                }
                                
                                if (data) {
                                    // 设置数据并渲染
                                    this.data = data;
                                    this.renderMindmap();
                                    
                                    // 选中根节点
                                    if (data.id) {
                                        this.setSelectedNode(data.id);
                                    }
                                    
                                    // 保存到存储
                                    await this.saveMindmapToStorage(true);
                                    
                                    // 触发事件
                                    if (window.AutogenEventBus) {
                                        window.AutogenEventBus.emit('mindmap:dataLoaded', {
                                            source: 'import',
                                            projectId: firstProject.id,
                                            projectName: firstProject.name,
                                            data: data
                                        });
                                    }
                                    
                                    console.log(`[修复] ✅ 已加载项目: ${firstProject.name}`);
                                    return;
                                }
                            }
                        }
                    }
                    
                    // 回退到原始方法
                    return originalLoad.call(this);
                    
                } catch (error) {
                    console.error('[修复] loadFirstMindmapFromList失败:', error);
                    this.showToast && this.showToast('加载脑图失败', 'error');
                }
            };
            
            console.log('[修复] ✅ 导入功能已增强');
        },
        
        /**
         * 运行所有修复
         */
        async runAllFixes() {
            console.log('🔧 开始运行脑图加载修复...');
            
            // 等待MindmapController加载
            let attempts = 0;
            while (!window.mindmapController && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.mindmapController) {
                console.error('[修复] MindmapController未加载，无法执行修复');
                return;
            }
            
            try {
                // 执行各项修复
                this.enhanceRenderMindmap();
                this.enhanceDataConversion();
                this.enhanceImportFunction();
                
                // 修复当前数据（如果存在）
                if (window.mindmapController.data) {
                    window.mindmapController.data = this.fixMindmapData(window.mindmapController.data);
                    console.log('[修复] ✅ 当前数据已修复');
                }
                
                console.log('🎉 脑图加载修复完成！');
                
                // 触发重新渲染
                setTimeout(() => {
                    if (window.mindmapController.data) {
                        window.mindmapController.renderMindmap();
                    }
                }, 1000);
                
            } catch (error) {
                console.error('❌ 修复过程中出现错误:', error);
            }
        }
    };
    
    // 暴露到全局
    window.MindmapLoadingFixer = MindmapLoadingFixer;
    
    // 页面加载完成后自动运行修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => MindmapLoadingFixer.runAllFixes(), 2000);
        });
    } else {
        setTimeout(() => MindmapLoadingFixer.runAllFixes(), 2000);
    }
    
    console.log('🔧 脑图加载修复脚本已加载');
    
})();

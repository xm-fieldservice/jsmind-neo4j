/**
 * MD存储测试脚本
 * 用于测试脑图注册和MD存储功能
 */

// 测试函数：创建测试脑图
function createTestMindmap(name) {
    const testData = {
        id: 'test_' + Date.now(),
        label: name || '测试脑图',
        topic: name || '测试脑图',
        children: [
            {
                id: 'child_1',
                label: '子节点1',
                topic: '子节点1',
                content: '这是第一个子节点的内容'
            },
            {
                id: 'child_2', 
                label: '子节点2',
                topic: '子节点2',
                content: '这是第二个子节点的内容'
            }
        ]
    };
    
    // 模拟脑图导入事件
    const event = new CustomEvent('mindmap:imported', {
        detail: {
            name: name || '测试脑图',
            payload: {
                format: 'node_tree',
                data: testData
            },
            source: 'test'
        }
    });
    
    window.dispatchEvent(event);
    console.log('已创建测试脑图:', name);
}

// 测试函数：检查MD存储状态
function checkMDStorageStatus() {
    console.log('=== MD存储状态检查 ===');
    
    // 检查脑图控制器
    if (window.mindmapController) {
        console.log('✅ 脑图控制器已加载');
        console.log('当前数据:', window.mindmapController.data ? '有数据' : '无数据');
        console.log('选中节点:', window.mindmapController.selectedNode);
    } else {
        console.log('❌ 脑图控制器未加载');
    }
    
    // 检查注册管理器
    if (window.mindmapRegistry) {
        console.log('✅ 脑图注册管理器已加载');
        console.log('项目数量:', window.mindmapRegistry.projects.length);
        console.log('当前项目:', window.mindmapRegistry.currentProjectId);
    } else {
        console.log('❌ 脑图注册管理器未加载');
    }
    
    // 检查DOM元素
    const projectList = document.getElementById('project-list');
    const queryList = document.getElementById('query-results-list');
    console.log('项目列表DOM:', projectList ? '✅ 存在' : '❌ 不存在');
    console.log('查询列表DOM:', queryList ? '✅ 存在' : '❌ 不存在');
    
    if (projectList) {
        console.log('项目列表显示状态:', projectList.style.display || 'block');
        console.log('项目列表子元素数量:', projectList.children.length);
    }
    
    if (queryList) {
        console.log('查询列表显示状态:', queryList.style.display || 'none');
        console.log('查询列表子元素数量:', queryList.children.length);
    }
    
    // 检查AutoGen状态
    if (window.AutoGenStatus) {
        console.log('✅ AutoGen状态:', window.AutoGenStatus);
    } else {
        console.log('❌ AutoGen状态未初始化');
    }
    
    // 检查存储适配器
    if (window.AutoGenStorageAdapter) {
        console.log('✅ AutoGen存储适配器已加载');
    } else {
        console.log('❌ AutoGen存储适配器未加载');
    }
    
    // 检查数据目录
    fetch('./data/unified_mindmap_storage.md')
        .then(response => {
            if (response.ok) {
                console.log('✅ MD存储文件存在');
                return response.text();
            } else {
                console.log('❌ MD存储文件不存在');
            }
        })
        .then(content => {
            if (content) {
                console.log('MD文件内容长度:', content.length);
            }
        })
        .catch(error => {
            console.log('❌ 无法访问MD存储文件:', error.message);
        });
}

// 测试函数：批量创建测试项目
function createMultipleTestProjects() {
    const projectNames = [
        '项目管理系统',
        '用户界面设计',
        '数据库架构',
        'API接口文档',
        '测试用例集合'
    ];
    
    projectNames.forEach((name, index) => {
        setTimeout(() => {
            createTestMindmap(name);
        }, index * 1000); // 每秒创建一个
    });
}

// 调试函数：清理重复项目
function cleanupDuplicateProjects() {
    console.log('=== 清理重复项目 ===');
    
    if (!window.mindmapRegistry) {
        console.log('❌ 注册管理器未加载');
        return;
    }
    
    const originalCount = window.mindmapRegistry.projects.length;
    console.log('原始项目数量:', originalCount);
    
    // 按名称去重，保留最新的
    const uniqueProjects = [];
    const seenNames = new Set();
    
    for (const project of window.mindmapRegistry.projects) {
        if (!seenNames.has(project.name)) {
            seenNames.add(project.name);
            uniqueProjects.push(project);
        } else {
            console.log('发现重复项目:', project.name);
        }
    }
    
    window.mindmapRegistry.projects = uniqueProjects;
    const newCount = uniqueProjects.length;
    
    console.log(`清理完成: ${originalCount} → ${newCount}`);
    
    // 保存并刷新
    window.mindmapRegistry.saveProjectRegistry();
    window.mindmapRegistry.renderProjectList();
}

// 调试函数：查看localStorage内容
function inspectLocalStorage() {
    console.log('=== localStorage 内容检查 ===');
    
    const relevantKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('mindmap') || key.includes('project'))) {
            relevantKeys.push(key);
        }
    }
    
    console.log('相关键值:', relevantKeys);
    
    relevantKeys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            const parsed = JSON.parse(value);
            console.log(`${key}:`, parsed);
        } catch (e) {
            console.log(`${key}: (无法解析JSON)`, localStorage.getItem(key));
        }
    });
}

// 调试函数：重置所有数据
function resetAllData() {
    if (confirm('确定要重置所有项目数据吗？这将清除所有脑图项目！')) {
        console.log('=== 重置所有数据 ===');
        
        // 清除注册表
        localStorage.removeItem('mindmap_project_registry');
        
        // 清除所有脑图数据
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('mindmap')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('已删除:', key);
        });
        
        // 重置注册管理器
        if (window.mindmapRegistry) {
            window.mindmapRegistry.projects = [];
            window.mindmapRegistry.currentProjectId = null;
            window.mindmapRegistry.renderProjectList();
        }
        
        console.log('所有数据已重置');
        alert('所有数据已重置，请刷新页面');
    }
}

// 测试函数：验证mind实例初始化
function testMindInitialization() {
    console.log('=== 测试Mind实例初始化 ===');
    
    if (!window.mindmapController) {
        console.log('❌ mindmapController未加载');
        return;
    }
    
    console.log('mindmapController存在:', !!window.mindmapController);
    console.log('mind实例存在:', !!window.mindmapController.mind);
    console.log('createMind方法存在:', typeof window.mindmapController.createMind === 'function');
    
    if (!window.mindmapController.mind) {
        console.log('尝试手动初始化mind实例...');
        try {
            window.mindmapController.createMind();
            console.log('初始化后mind实例存在:', !!window.mindmapController.mind);
        } catch (error) {
            console.error('手动初始化失败:', error);
        }
    }
    
    // 检查容器
    const container = document.getElementById('mindmap-container');
    console.log('脑图容器存在:', !!container);
    if (container) {
        const style = getComputedStyle(container);
        console.log('容器可见:', style.display !== 'none');
    }
}

// 测试函数：验证项目加载和同步
function testProjectLoadAndSync() {
    console.log('=== 测试项目加载和同步 ===');
    
    if (!window.mindmapRegistry) {
        console.log('❌ 注册管理器未加载');
        return;
    }
    
    if (!window.mindmapController) {
        console.log('❌ 脑图控制器未加载');
        return;
    }
    
    console.log('✅ 开始测试项目加载和同步功能');
    
    // 创建测试项目
    createTestMindmap('同步测试项目');
    
    setTimeout(() => {
        console.log('当前项目列表:');
        window.mindmapRegistry.projects.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name} (ID: ${p.id})`);
        });
        
        // 测试加载第一个项目
        if (window.mindmapRegistry.projects.length > 0) {
            const firstProject = window.mindmapRegistry.projects[0];
            console.log('测试加载项目:', firstProject.name);
            window.mindmapRegistry.loadProject(firstProject.id);
            
            // 测试标题同步
            setTimeout(() => {
                console.log('测试标题同步...');
                if (window.mindmapController.data) {
                    const oldName = window.mindmapController.data.label || window.mindmapController.data.topic;
                    const newName = '已修改的项目名称_' + Date.now();
                    
                    // 修改根节点标题
                    window.mindmapController.data.label = newName;
                    window.mindmapController.data.topic = newName;
                    
                    console.log(`标题从 "${oldName}" 改为 "${newName}"`);
                    console.log('等待同步...');
                    
                    // 检查同步结果
                    setTimeout(() => {
                        const updatedProject = window.mindmapRegistry.projects.find(p => p.id === firstProject.id);
                        if (updatedProject && updatedProject.name === newName) {
                            console.log('✅ 标题同步成功!');
                        } else {
                            console.log('❌ 标题同步失败');
                            console.log('期望:', newName);
                            console.log('实际:', updatedProject ? updatedProject.name : '项目不存在');
                        }
                    }, 3000);
                }
            }, 1000);
        }
    }, 2000);
}

// 测试函数：验证列表项点击联动
function testProjectClickHighlight() {
    console.log('=== 测试列表项点击联动 ===');
    
    if (!window.mindmapRegistry) {
        console.log('❌ 注册管理器未加载');
        return;
    }
    
    console.log('当前项目列表:');
    window.mindmapRegistry.projects.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (ID: ${p.id})`);
    });
    
    if (window.mindmapRegistry.projects.length === 0) {
        console.log('没有项目，创建测试项目...');
        createTestMindmap('联动测试项目');
        setTimeout(() => testProjectClickHighlight(), 2000);
        return;
    }
    
    // 测试点击第一个项目
    const firstProject = window.mindmapRegistry.projects[0];
    console.log('测试点击项目:', firstProject.name);
    
    window.mindmapRegistry.loadProject(firstProject.id);
    
    setTimeout(() => {
        console.log('当前项目ID:', window.mindmapRegistry.currentProjectId);
        const highlightedItem = document.querySelector('.project-item.active');
        if (highlightedItem) {
            console.log('✅ 列表项已高亮:', highlightedItem.dataset.projectId);
        } else {
            console.log('❌ 列表项未高亮');
        }
    }, 1000);
}

// 测试函数：清理根节点emoji
function testCleanupRootEmojis() {
    console.log('=== 测试清理根节点emoji ===');
    
    if (!window.mindmapController) {
        console.log('❌ mindmapController未加载');
        return;
    }
    
    if (!window.mindmapController.mind) {
        console.log('❌ mind实例未初始化');
        return;
    }
    
    const root = window.mindmapController.mind.get_root();
    if (!root) {
        console.log('❌ 未找到根节点');
        return;
    }
    
    console.log('根节点当前标题:', root.topic);
    
    // 检查是否包含测试emoji
    if (/[🏷️🔧📌⭐✅]/.test(root.topic)) {
        console.log('发现测试emoji，开始清理...');
        window.mindmapController._cleanupTestEmojisFromRoot();
        
        setTimeout(() => {
            const newRoot = window.mindmapController.mind.get_root();
            console.log('清理后根节点标题:', newRoot ? newRoot.topic : '未找到');
        }, 500);
    } else {
        console.log('✅ 根节点标题干净，无需清理');
    }
}

// 添加到全局作用域供控制台调用
window.testMDStorage = {
    createTestMindmap,
    checkMDStorageStatus,
    createMultipleTestProjects,
    cleanupDuplicateProjects,
    inspectLocalStorage,
    resetAllData,
    testMindInitialization,
    testProjectLoadAndSync,
    testProjectClickHighlight,
    testCleanupRootEmojis
};

console.log('MD存储测试脚本已加载');
console.log('可用测试函数:');
console.log('- testMDStorage.createTestMindmap("项目名称")');
console.log('- testMDStorage.checkMDStorageStatus()');
console.log('- testMDStorage.createMultipleTestProjects()');
console.log('- testMDStorage.cleanupDuplicateProjects() // 清理重复项目');
console.log('- testMDStorage.inspectLocalStorage() // 查看存储内容');
console.log('- testMDStorage.resetAllData() // 重置所有数据');
console.log('- testMDStorage.testMindInitialization() // 测试Mind实例初始化');
console.log('- testMDStorage.testProjectLoadAndSync() // 测试项目加载和同步');
console.log('- testMDStorage.testProjectClickHighlight() // 测试列表项点击联动');
console.log('- testMDStorage.testCleanupRootEmojis() // 测试清理根节点emoji');

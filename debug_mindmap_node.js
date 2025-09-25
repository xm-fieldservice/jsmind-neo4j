/**
 * 调试脑图节点结构
 * 检查"实施路径记录"节点是否有children属性
 */

(function() {
    console.log('🔍 开始调试脑图节点结构...');
    
    function debugMindmapNode() {
        if (!window.mindmapController || !window.mindmapController.data) {
            console.error('❌ 脑图控制器或数据不可用');
            return;
        }
        
        // 查找目标节点
        const targetNodeId = '9809480ec54ed01f';
        const targetNode = findNodeById(window.mindmapController.data, targetNodeId);
        
        if (!targetNode) {
            console.error('❌ 未找到"实施路径记录"节点');
            return;
        }
        
        console.log('✅ 找到"实施路径记录"节点:', targetNode);
        
        // 检查节点结构
        console.log('📋 节点结构分析:');
        console.log('- ID:', targetNode.id);
        console.log('- Topic:', targetNode.topic);
        console.log('- Expanded:', targetNode.expanded);
        console.log('- Direction:', targetNode.direction);
        console.log('- Has children property:', 'children' in targetNode);
        console.log('- Children value:', targetNode.children);
        console.log('- Children type:', typeof targetNode.children);
        console.log('- Children length:', targetNode.children ? targetNode.children.length : 'N/A');
        
        // 检查所有属性
        console.log('📋 所有属性:');
        Object.keys(targetNode).forEach(key => {
            console.log(`- ${key}:`, typeof targetNode[key], targetNode[key]);
        });
        
        return targetNode;
    }
    
    function findNodeById(node, targetId) {
        if (node.id === targetId) {
            return node;
        }
        if (node.children) {
            for (let child of node.children) {
                const found = findNodeById(child, targetId);
                if (found) return found;
            }
        }
        return null;
    }
    
    function testAddChild() {
        const targetNode = findNodeById(window.mindmapController.data, '9809480ec54ed01f');
        if (!targetNode) {
            console.error('❌ 未找到目标节点');
            return;
        }
        
        console.log('🧪 测试添加子节点...');
        
        // 确保children数组存在
        if (!targetNode.children) {
            targetNode.children = [];
            console.log('✅ 创建children数组');
        }
        
        // 添加测试节点
        const testNode = {
            id: 'test_' + Date.now(),
            topic: '测试节点 - ' + new Date().toLocaleTimeString(),
            expanded: true,
            direction: 'right',
            data: {
                type: 'test',
                timestamp: new Date().toISOString()
            }
        };
        
        targetNode.children.push(testNode);
        console.log('✅ 添加测试节点:', testNode);
        
        // 保存并刷新
        try {
            window.mindmapController.saveMindmapToStorage(true);
            console.log('✅ 保存到存储');
            
            window.mindmapController.renderMindmap();
            console.log('✅ 重新渲染脑图');
            
            return testNode;
        } catch (error) {
            console.error('❌ 保存或渲染失败:', error);
            return null;
        }
    }
    
    // 创建调试按钮
    function createDebugButton() {
        const button = document.createElement('button');
        button.textContent = '🔍 调试节点结构';
        button.style.cssText = `
            position: fixed;
            top: 580px;
            right: 20px;
            padding: 8px 12px;
            background: #6366f1;
            color: white;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            z-index: 10000;
            font-size: 12px;
            font-weight: 500;
        `;
        
        button.addEventListener('click', () => {
            debugMindmapNode();
        });
        
        document.body.appendChild(button);
        
        // 创建测试添加按钮
        const testButton = document.createElement('button');
        testButton.textContent = '🧪 测试添加节点';
        testButton.style.cssText = `
            position: fixed;
            top: 620px;
            right: 20px;
            padding: 8px 12px;
            background: #10b981;
            color: white;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            z-index: 10000;
            font-size: 12px;
            font-weight: 500;
        `;
        
        testButton.addEventListener('click', () => {
            testButton.textContent = '⏳ 添加中...';
            testButton.disabled = true;
            
            try {
                const result = testAddChild();
                if (result) {
                    testButton.textContent = '✅ 添加成功';
                    testButton.style.background = '#10b981';
                } else {
                    testButton.textContent = '❌ 添加失败';
                    testButton.style.background = '#ef4444';
                }
            } catch (error) {
                testButton.textContent = '❌ 添加异常';
                testButton.style.background = '#ef4444';
                console.error('测试添加异常:', error);
            }
            
            setTimeout(() => {
                testButton.textContent = '🧪 测试添加节点';
                testButton.disabled = false;
                testButton.style.background = '#10b981';
            }, 3000);
        });
        
        document.body.appendChild(testButton);
        
        console.log('🔘 调试按钮已创建');
    }
    
    // 延迟创建按钮
    setTimeout(() => {
        createDebugButton();
        console.log('💡 点击"🔍 调试节点结构"按钮查看节点详情');
        console.log('💡 点击"🧪 测试添加节点"按钮测试添加功能');
    }, 14000);
    
    // 导出调试函数
    window.debugMindmapNode = debugMindmapNode;
    window.testAddChild = testAddChild;
    
    console.log('🛠️ 脑图节点调试脚本已加载');
    
})();

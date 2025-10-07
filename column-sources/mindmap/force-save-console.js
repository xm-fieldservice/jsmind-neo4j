/**
 * 在脑图页面控制台运行此脚本，强制保存当前数据
 * 
 * 使用方法：
 * 1. 打开脑图页面（mindmap-standalone.html）
 * 2. 按F12打开开发者工具
 * 3. 切换到Console标签
 * 4. 复制粘贴此脚本并回车
 */

(async function forceSaveCurrentData() {
    console.log('=== 🚨 强制保存脚本开始 ===\n');
    
    try {
        // 1. 获取当前脑图数据
        console.log('1. 获取当前脑图数据...');
        let mindmapData = null;
        
        if (typeof window.mindmapColumn !== 'undefined' && window.mindmapColumn.jm) {
            mindmapData = window.mindmapColumn.jm.get_data();
            console.log('   ✅ 从mindmapColumn获取数据');
        } else if (typeof jm !== 'undefined') {
            mindmapData = jm.get_data();
            console.log('   ✅ 从全局jm获取数据');
        } else {
            console.error('   ❌ 未找到jsMind实例');
            return;
        }
        
        if (!mindmapData) {
            console.error('   ❌ 数据为空');
            return;
        }
        
        // 2. 同步所有节点的content
        console.log('\n2. 同步节点内容...');
        const syncNodeData = (exportNode) => {
            if (!exportNode) return;
            
            let jmNode;
            if (typeof window.mindmapColumn !== 'undefined' && window.mindmapColumn.jm) {
                jmNode = window.mindmapColumn.jm.get_node(exportNode.id);
            } else if (typeof jm !== 'undefined') {
                jmNode = jm.get_node(exportNode.id);
            }
            
            if (jmNode && jmNode.data) {
                exportNode.data = jmNode.data;
            }
            
            if (exportNode.children) {
                exportNode.children.forEach(child => syncNodeData(child));
            }
        };
        syncNodeData(mindmapData.data);
        console.log('   ✅ 节点内容已同步');
        
        // 3. 统计节点
        let nodeCount = 0;
        let nodesWithContent = 0;
        const countNodes = (node) => {
            if (!node) return;
            nodeCount++;
            if (node.data?.content || node.content) {
                nodesWithContent++;
            }
            if (node.children) {
                node.children.forEach(countNodes);
            }
        };
        countNodes(mindmapData.data);
        console.log(`   - 总节点数: ${nodeCount}`);
        console.log(`   - 有内容的节点: ${nodesWithContent}`);
        
        // 4. 创建存储项
        console.log('\n3. 创建存储项...');
        const storageItem = {
            type: 'mindmap',
            data: mindmapData,
            metadata: {
                version: '2.0.0',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                ttl: 1800000 // 30分钟
            }
        };
        console.log('   ✅ 存储项已创建');
        
        // 5. 保存到AutogenUnifiedStorage
        console.log('\n4. 保存到AutogenUnifiedStorage...');
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            const success = await AutogenUnifiedStorage.store('mindmap', 'current', mindmapData, {
                skipJsonBase: true
            });
            console.log(`   ${success ? '✅' : '❌'} AutogenUnifiedStorage保存${success ? '成功' : '失败'}`);
        } else {
            console.warn('   ⚠️  AutogenUnifiedStorage未加载');
        }
        
        // 6. 直接保存到LocalStorage（备用）
        console.log('\n5. 直接保存到LocalStorage...');
        try {
            localStorage.setItem('autogen:mindmap:current', JSON.stringify(storageItem));
            console.log('   ✅ LocalStorage保存成功');
            
            // 验证
            const saved = localStorage.getItem('autogen:mindmap:current');
            console.log(`   - 保存大小: ${saved.length}字节`);
        } catch (e) {
            console.error(`   ❌ LocalStorage保存失败: ${e.message}`);
        }
        
        // 7. 直接保存到IndexedDB（备用）
        console.log('\n6. 直接保存到IndexedDB...');
        if (typeof AutogenUnifiedStorage !== 'undefined' && AutogenUnifiedStorage.indexedDBAvailable) {
            try {
                const idbSuccess = await AutogenUnifiedStorage.setToIndexedDB(
                    'autogen:mindmap:current',
                    storageItem
                );
                console.log(`   ${idbSuccess ? '✅' : '❌'} IndexedDB保存${idbSuccess ? '成功' : '失败'}`);
            } catch (e) {
                console.error(`   ❌ IndexedDB保存失败: ${e.message}`);
            }
        } else {
            console.warn('   ⚠️  IndexedDB不可用');
        }
        
        // 8. 验证持久化
        console.log('\n7. 验证持久化...');
        
        // 清除内存缓存
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            AutogenUnifiedStorage.memoryCache.clear();
            console.log('   - 已清除内存缓存');
        }
        
        // 从持久层读取
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            const retrieved = await AutogenUnifiedStorage.retrieve('mindmap', 'current');
            if (retrieved) {
                console.log('   ✅ 从持久层成功读取数据');
                
                // 统计恢复的节点
                let recoveredNodes = 0;
                const countRecovered = (node) => {
                    if (!node) return;
                    recoveredNodes++;
                    if (node.children) {
                        node.children.forEach(countRecovered);
                    }
                };
                countRecovered(retrieved.data);
                console.log(`   - 恢复节点数: ${recoveredNodes}`);
            } else {
                console.error('   ❌ 从持久层读取失败');
            }
        }
        
        console.log('\n=== ✅ 强制保存完成 ===');
        console.log('\n建议：');
        console.log('1. 关闭浏览器');
        console.log('2. 重新打开脑图页面');
        console.log('3. 验证数据是否保留');
        
        // 返回数据供检查
        return {
            success: true,
            nodeCount,
            nodesWithContent,
            dataSize: JSON.stringify(mindmapData).length
        };
        
    } catch (error) {
        console.error('\n=== ❌ 强制保存失败 ===');
        console.error('错误:', error.message);
        console.error('堆栈:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
})();

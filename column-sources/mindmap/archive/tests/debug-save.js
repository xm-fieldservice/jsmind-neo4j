// 调试保存功能的脚本
// 在浏览器控制台执行

async function debugSave() {
    console.log('=== 开始调试保存功能 ===');
    
    // 1. 检查当前选中节点
    const node = window.mindmapColumn.jm.get_selected_node();
    console.log('1. 当前选中节点:', node);
    console.log('   - ID:', node?.id);
    console.log('   - Topic:', node?.topic);
    console.log('   - Data:', node?.data);
    console.log('   - Data.content:', node?.data?.content);
    
    // 2. 检查编辑器内容
    const editor = document.getElementById('nodeContentEditor');
    console.log('2. 编辑器内容:', editor?.value);
    
    // 3. 检查 jsMind 内部节点
    const jmNode = window.mindmapColumn.jm.get_node(node?.id);
    console.log('3. jsMind内部节点:', jmNode);
    console.log('   - Data:', jmNode?.data);
    console.log('   - Data.content:', jmNode?.data?.content);
    
    // 4. 获取完整数据
    const fullData = window.mindmapColumn.jm.get_data();
    console.log('4. 完整脑图数据:', fullData);
    
    // 5. 测试压缩
    if (typeof window.DataCompressor !== 'undefined') {
        const compressor = new window.DataCompressor();
        const compressed = compressor.compress(fullData);
        console.log('5. 压缩后数据:', compressed);
        
        // 6. 测试还原
        const decompressed = compressor.decompress(compressed);
        console.log('6. 还原后数据:', decompressed);
        
        // 7. 检查当前节点的内容是否保留
        function findNode(data, nodeId) {
            if (data.id === nodeId) return data;
            if (data.children) {
                for (const child of data.children) {
                    const found = findNode(child, nodeId);
                    if (found) return found;
                }
            }
            return null;
        }
        
        const originalNode = findNode(fullData.data, node?.id);
        const compressedNode = findNode(compressed.data, node?.id);
        const decompressedNode = findNode(decompressed.data, node?.id);
        
        console.log('7. 节点内容对比:');
        console.log('   - 原始:', originalNode?.data?.content);
        console.log('   - 压缩后:', compressedNode?.data?.content);
        console.log('   - 还原后:', decompressedNode?.data?.content);
    }
    
    // 8. 测试保存
    console.log('8. 开始测试保存...');
    try {
        await window.mindmapColumn.saveToUnifiedStorage(fullData);
        console.log('   ✅ 保存成功');
        
        // 9. 测试加载
        console.log('9. 开始测试加载...');
        const mindmapStorage = new window.MindmapStorage();
        const loaded = await mindmapStorage.loadMindmapData('current');
        console.log('   ✅ 加载成功:', loaded);
        
        const loadedNode = findNode(loaded.data, node?.id);
        console.log('   - 加载的节点内容:', loadedNode?.data?.content);
    } catch (error) {
        console.error('   ❌ 保存/加载失败:', error);
    }
    
    console.log('=== 调试完成 ===');
}

// 执行调试
debugSave();

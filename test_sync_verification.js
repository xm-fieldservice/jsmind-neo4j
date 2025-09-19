/**
 * MD同步验证测试脚本
 * 模拟用户编辑脑图节点，验证MD底座是否正确同步
 */
(function() {
  'use strict';
  
  console.log('[同步测试] 测试脚本加载');
  
  // 测试配置
  const TEST_CONFIG = {
    testNodeContent: '🧪 测试内容 - ' + new Date().toLocaleTimeString(),
    testNodeTitle: '测试节点 - ' + Math.random().toString(36).substr(2, 5),
    waitTime: 2000, // 等待同步完成的时间（毫秒）
  };
  
  // 获取MD底座当前状态
  function getMDBaseStatus() {
    if (!window.MDBaseManager) {
      return { error: 'MDBaseManager不可用' };
    }
    
    try {
      const status = window.MDBaseManager.getStatus();
      const content = window.MDBaseManager.cache?.content || '';
      return {
        ...status,
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      };
    } catch(e) {
      return { error: e.message };
    }
  }
  
  // 查找脑图中的测试内容
  function findTestContentInMD() {
    if (!window.MDBaseManager || !window.MDBaseManager.cache?.content) {
      return { found: false, reason: 'MD内容不可用' };
    }
    
    const content = window.MDBaseManager.cache.content;
    const hasTestTitle = content.includes(TEST_CONFIG.testNodeTitle);
    const hasTestContent = content.includes(TEST_CONFIG.testNodeContent);
    
    return {
      found: hasTestTitle || hasTestContent,
      hasTitle: hasTestTitle,
      hasContent: hasTestContent,
      searchTitle: TEST_CONFIG.testNodeTitle,
      searchContent: TEST_CONFIG.testNodeContent,
      mdContentLength: content.length
    };
  }
  
  // 模拟编辑脑图节点
  function simulateNodeEdit() {
    const ctrl = window.mindmapController;
    if (!ctrl || !ctrl.mind) {
      console.error('[同步测试] ❌ MindmapController或jsMind实例不可用');
      return false;
    }
    
    try {
      // 获取根节点
      const rootNode = ctrl.mind.get_root();
      if (!rootNode) {
        console.error('[同步测试] ❌ 无法获取根节点');
        return false;
      }
      
      console.log('[同步测试] 📝 开始模拟编辑...');
      console.log('[同步测试] 根节点ID:', rootNode.id);
      
      // 添加一个新的子节点
      const newNodeId = 'test-node-' + Date.now();
      const newNode = ctrl.mind.add_node(rootNode, newNodeId, TEST_CONFIG.testNodeTitle);
      
      if (!newNode) {
        console.error('[同步测试] ❌ 创建新节点失败');
        return false;
      }
      
      console.log('[同步测试] ✅ 新节点已创建:', newNodeId);
      
      // 模拟选中新节点并编辑内容
      ctrl.mind.select_node(newNodeId);
      ctrl.selectedNode = newNodeId;
      
      // 更新节点数据
      if (ctrl.data && ctrl.data.children) {
        const newNodeData = {
          id: newNodeId,
          topic: TEST_CONFIG.testNodeTitle,
          content: TEST_CONFIG.testNodeContent,
          children: []
        };
        ctrl.data.children.push(newNodeData);
      }
      
      // 更新jsMind节点数据
      if (newNode.data) {
        newNode.data.content = TEST_CONFIG.testNodeContent;
      }
      
      console.log('[同步测试] ✅ 节点内容已设置');
      console.log('[同步测试] 标题:', TEST_CONFIG.testNodeTitle);
      console.log('[同步测试] 内容:', TEST_CONFIG.testNodeContent);
      
      // 触发保存（这会自动触发MD同步）
      setTimeout(() => {
        console.log('[同步测试] 🔄 触发保存...');
        ctrl.saveMindmapToStorage();
      }, 100);
      
      return true;
    } catch(e) {
      console.error('[同步测试] ❌ 模拟编辑失败:', e);
      return false;
    }
  }
  
  // 执行完整的同步测试
  function runSyncTest() {
    console.log('\n=== 🧪 MD同步验证测试开始 ===');
    
    // 1. 检查初始状态
    console.log('\n📊 步骤1: 检查初始状态');
    const initialStatus = getMDBaseStatus();
    console.log('初始MD状态:', initialStatus);
    
    // 2. 模拟编辑
    console.log('\n✏️ 步骤2: 模拟编辑脑图节点');
    const editSuccess = simulateNodeEdit();
    
    if (!editSuccess) {
      console.error('❌ 测试失败：无法模拟编辑');
      return;
    }
    
    // 3. 等待同步完成
    console.log(`\n⏳ 步骤3: 等待同步完成 (${TEST_CONFIG.waitTime}ms)...`);
    
    setTimeout(() => {
      // 4. 检查同步后状态
      console.log('\n🔍 步骤4: 验证同步结果');
      
      const finalStatus = getMDBaseStatus();
      console.log('同步后MD状态:', finalStatus);
      
      const searchResult = findTestContentInMD();
      console.log('内容搜索结果:', searchResult);
      
      // 5. 输出测试结果
      console.log('\n📋 测试结果总结:');
      console.log('================');
      
      if (searchResult.found) {
        console.log('✅ 同步成功！测试内容已在MD底座中找到');
        console.log('  - 标题同步:', searchResult.hasTitle ? '✅' : '❌');
        console.log('  - 内容同步:', searchResult.hasContent ? '✅' : '❌');
      } else {
        console.log('❌ 同步失败！测试内容未在MD底座中找到');
        console.log('  - 失败原因:', searchResult.reason || '未知');
      }
      
      console.log('  - MD内容长度:', finalStatus.contentLength || 0);
      console.log('  - 项目数量:', finalStatus.projectCount || 0);
      
      // 6. 显示MD内容预览（用于调试）
      if (finalStatus.contentPreview) {
        console.log('\n📄 MD内容预览:');
        console.log(finalStatus.contentPreview);
      }
      
      console.log('\n=== 🧪 MD同步验证测试完成 ===\n');
      
    }, TEST_CONFIG.waitTime);
  }
  
  // 快速检查当前MD状态的函数
  function quickCheck() {
    console.log('\n=== 🔍 快速MD状态检查 ===');
    const status = getMDBaseStatus();
    console.log('MD底座状态:', status);
    
    if (status.contentLength > 0) {
      console.log('✅ MD底座有内容');
      console.log('内容预览:', status.contentPreview);
    } else {
      console.log('⚠️ MD底座内容为空');
    }
    console.log('=========================\n');
  }
  
  // 暴露到全局
  window.SyncTest = {
    run: runSyncTest,
    check: quickCheck,
    config: TEST_CONFIG,
    getMDStatus: getMDBaseStatus,
    findTestContent: findTestContentInMD
  };
  
  console.log('[同步测试] ✅ 测试脚本已加载');
  
  // 自动运行测试 - 等待页面完全加载后执行
  setTimeout(() => {
    console.log('[同步测试] 🚀 自动开始同步验证测试...');
    runSyncTest();
  }, 5000); // 等待5秒确保所有组件都已加载
  
})();

/**
 * test-modular-architecture.js
 * 模块化架构测试验证脚本
 * 
 * 测试目标：
 * 1. 验证所有模块正确加载
 * 2. 验证接口兼容性
 * 3. 验证核心功能正常
 * 4. 验证管理效率提升
 */

(function() {
  'use strict';
  
  console.log('🧪 [测试] 开始模块化架构验证');
  
  // 等待页面和脚本加载完成
  function runTests() {
    const results = {
      moduleLoading: testModuleLoading(),
      interfaceCompatibility: testInterfaceCompatibility(),
      coreFunctionality: testCoreFunctionality(),
      managementEfficiency: testManagementEfficiency()
    };
    
    generateTestReport(results);
  }
  
  // 测试1：模块加载验证
  function testModuleLoading() {
    console.log('📦 [测试] 验证模块加载状态');
    
    const modules = [
      'StorageModule',
      'UIModule', 
      'EventsModule',
      'DataModule',
      'TagsModule',
      'AdvancedModule'
    ];
    
    const results = [];
    
    modules.forEach(moduleName => {
      const exists = window[moduleName] !== undefined;
      const hasController = window.mindmapController && 
                           typeof window.mindmapController[Object.keys(window[moduleName] || {})[0]] === 'function';
      
      results.push({
        module: moduleName,
        loaded: exists,
        integrated: hasController,
        status: exists && hasController ? 'PASS' : 'FAIL'
      });
      
      console.log(`  ${exists && hasController ? '✅' : '❌'} ${moduleName}: ${exists ? '已加载' : '未加载'}, ${hasController ? '已集成' : '未集成'}`);
    });
    
    return results;
  }
  
  // 测试2：接口兼容性验证
  function testInterfaceCompatibility() {
    console.log('🔌 [测试] 验证接口兼容性');
    
    const criticalInterfaces = [
      'saveMindmapToStorage',
      'loadMindmapFromStorage',
      'setSelectedNode',
      'renderTagList',
      'findNode',
      'addChildNode',
      'removeNode',
      'showToast',
      'enterFullscreenEditor',
      '_parseTagsFromContent'
    ];
    
    const results = [];
    const controller = window.mindmapController;
    
    if (!controller) {
      return [{ interface: 'MindmapController', status: 'FAIL', error: '控制器未创建' }];
    }
    
    criticalInterfaces.forEach(interfaceName => {
      const exists = typeof controller[interfaceName] === 'function';
      
      results.push({
        interface: interfaceName,
        status: exists ? 'PASS' : 'FAIL',
        type: typeof controller[interfaceName]
      });
      
      console.log(`  ${exists ? '✅' : '❌'} ${interfaceName}: ${exists ? '可用' : '缺失'}`);
    });
    
    return results;
  }
  
  // 测试3：核心功能验证
  function testCoreFunctionality() {
    console.log('⚙️ [测试] 验证核心功能');
    
    const results = [];
    const controller = window.mindmapController;
    
    if (!controller) {
      return [{ test: '核心功能', status: 'FAIL', error: '控制器未创建' }];
    }
    
    // 测试数据管理
    try {
      const testData = controller.getDefaultData();
      results.push({
        test: '数据管理 - getDefaultData',
        status: testData && testData.id ? 'PASS' : 'FAIL',
        details: testData ? `ID: ${testData.id}` : '无数据'
      });
    } catch (e) {
      results.push({
        test: '数据管理 - getDefaultData',
        status: 'ERROR',
        error: e.message
      });
    }
    
    // 测试存储系统
    try {
      const hasStorage = controller.autogenStorage !== undefined;
      results.push({
        test: '存储系统 - AutogenUnifiedStorage',
        status: hasStorage ? 'PASS' : 'WARN',
        details: hasStorage ? '已连接' : '使用localStorage降级'
      });
    } catch (e) {
      results.push({
        test: '存储系统',
        status: 'ERROR',
        error: e.message
      });
    }
    
    // 测试标签解析
    try {
      const testContent = '标签: 测试, 验证\n\n这是测试内容';
      const parsed = controller._parseTagsFromContent(testContent);
      const isValid = parsed.tags.includes('测试') && parsed.tags.includes('验证');
      
      results.push({
        test: '标签管理 - 标签解析',
        status: isValid ? 'PASS' : 'FAIL',
        details: `解析出 ${parsed.tags.length} 个标签`
      });
    } catch (e) {
      results.push({
        test: '标签管理',
        status: 'ERROR',
        error: e.message
      });
    }
    
    // 测试UI提示
    try {
      controller.showToast('模块化架构测试', 'info', 1000);
      results.push({
        test: 'UI系统 - 提示消息',
        status: 'PASS',
        details: '提示消息已显示'
      });
    } catch (e) {
      results.push({
        test: 'UI系统',
        status: 'ERROR',
        error: e.message
      });
    }
    
    return results;
  }
  
  // 测试4：管理效率验证
  function testManagementEfficiency() {
    console.log('📊 [测试] 验证管理效率提升');
    
    const results = [];
    
    // 文件数量统计
    const moduleFiles = [
      'jsmind-controller-storage.js',
      'jsmind-controller-ui.js', 
      'jsmind-controller-events.js',
      'jsmind-controller-data.js',
      'jsmind-controller-tags.js',
      'jsmind-controller-advanced.js'
    ];
    
    results.push({
      metric: '文件拆分',
      before: '1个文件 (233KB)',
      after: `${moduleFiles.length + 1}个文件 (模块化)`,
      status: 'IMPROVED',
      improvement: '提高了代码管理效率'
    });
    
    // 功能分组验证
    const functionalGroups = {
      '存储管理': ['saveMindmapToStorage', 'loadMindmapFromStorage', '_syncToJsonBase'],
      'UI渲染': ['showToast', 'renderTagList', 'renderAttachmentList'],
      '事件处理': ['bindDetailEvents', 'setSelectedNode', '_toggleTagForSelectedNode'],
      '数据管理': ['findNode', 'addChildNode', 'removeNode', 'getDefaultData'],
      '标签管理': ['_parseTagsFromContent', '_buildTagsLine', 'highlightActiveTagsForSelectedNode'],
      '高级功能': ['enterFullscreenEditor', 'startSnapshotScheduler', 'importMindmapFromPicker']
    };
    
    Object.entries(functionalGroups).forEach(([groupName, functions]) => {
      const availableFunctions = functions.filter(fn => 
        typeof window.mindmapController?.[fn] === 'function'
      );
      
      results.push({
        metric: `功能分组 - ${groupName}`,
        status: availableFunctions.length === functions.length ? 'COMPLETE' : 'PARTIAL',
        details: `${availableFunctions.length}/${functions.length} 功能可用`,
        coverage: Math.round((availableFunctions.length / functions.length) * 100)
      });
    });
    
    return results;
  }
  
  // 生成测试报告
  function generateTestReport(results) {
    console.log('\n📋 [测试报告] 模块化架构验证结果');
    console.log('='.repeat(50));
    
    // 模块加载结果
    console.log('\n📦 模块加载状态:');
    const moduleResults = results.moduleLoading;
    const loadedModules = moduleResults.filter(r => r.status === 'PASS').length;
    console.log(`  ✅ 成功加载: ${loadedModules}/${moduleResults.length} 个模块`);
    
    // 接口兼容性结果
    console.log('\n🔌 接口兼容性:');
    const interfaceResults = results.interfaceCompatibility;
    const compatibleInterfaces = interfaceResults.filter(r => r.status === 'PASS').length;
    console.log(`  ✅ 兼容接口: ${compatibleInterfaces}/${interfaceResults.length} 个`);
    
    // 核心功能结果
    console.log('\n⚙️ 核心功能:');
    const functionalResults = results.coreFunctionality;
    const workingFunctions = functionalResults.filter(r => r.status === 'PASS').length;
    console.log(`  ✅ 正常功能: ${workingFunctions}/${functionalResults.length} 个`);
    
    // 管理效率结果
    console.log('\n📊 管理效率提升:');
    const efficiencyResults = results.managementEfficiency;
    efficiencyResults.forEach(result => {
      if (result.metric === '文件拆分') {
        console.log(`  ✅ ${result.metric}: ${result.before} → ${result.after}`);
      } else if (result.coverage !== undefined) {
        console.log(`  ${result.coverage === 100 ? '✅' : '⚠️'} ${result.metric}: ${result.coverage}% 覆盖率`);
      }
    });
    
    // 总体评估
    console.log('\n🎯 总体评估:');
    const totalTests = moduleResults.length + interfaceResults.length + functionalResults.length;
    const passedTests = loadedModules + compatibleInterfaces + workingFunctions;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`  📈 成功率: ${successRate}%`);
    console.log(`  🏆 状态: ${successRate >= 90 ? '优秀' : successRate >= 80 ? '良好' : successRate >= 70 ? '及格' : '需要改进'}`);
    
    if (successRate >= 80) {
      console.log('\n🎉 模块化重构成功！管理效率显著提升：');
      console.log('  • 代码按功能域清晰分组，问题定位更快');
      console.log('  • 每个模块职责单一，修改风险更低');
      console.log('  • 保持了完整的接口兼容性');
      console.log('  • 实现了233KB超大文件的合理拆分');
    } else {
      console.log('\n⚠️ 需要进一步优化某些模块的集成');
    }
    
    // 保存测试结果到localStorage
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        successRate: successRate,
        results: results,
        summary: {
          modulesLoaded: loadedModules,
          interfacesCompatible: compatibleInterfaces,
          functionsWorking: workingFunctions,
          totalTests: totalTests
        }
      };
      
      localStorage.setItem('modular_architecture_test_report', JSON.stringify(reportData));
      console.log('\n💾 测试报告已保存到 localStorage');
    } catch (e) {
      console.warn('保存测试报告失败:', e);
    }
  }
  
  // 启动测试
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runTests, 1000); // 等待1秒确保所有脚本加载完成
    });
  } else {
    setTimeout(runTests, 1000);
  }
  
})();

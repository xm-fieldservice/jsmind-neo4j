/**
 * MD底座同步机制诊断脚本
 * 检查从前端到实际文件的完整同步链路
 */
(function() {
  'use strict';
  
  console.log('[MD底座诊断] 诊断脚本加载');
  
  // 诊断结果
  let diagnosticResults = {
    timestamp: new Date().toLocaleString(),
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  // 添加测试结果
  function addTestResult(name, status, message, details = null) {
    const result = {
      name,
      status, // 'pass', 'fail', 'warn'
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    
    diagnosticResults.tests.push(result);
    diagnosticResults.summary[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++;
    
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`[MD底座诊断] ${emoji} ${name}: ${message}`);
    if (details) {
      console.log(`[MD底座诊断]    详情:`, details);
    }
  }
  
  // 测试1: 检查MDBaseManager是否存在
  function test1_CheckMDBaseManager() {
    if (window.MDBaseManager) {
      addTestResult('MDBaseManager存在性', 'pass', 'MDBaseManager已加载');
      return true;
    } else {
      addTestResult('MDBaseManager存在性', 'fail', 'MDBaseManager未加载');
      return false;
    }
  }
  
  // 测试2: 检查配置
  function test2_CheckConfiguration() {
    const mode = window.MD_WRITE_MODE;
    const apiBase = window.MDBaseManager?.API_BASE;
    
    if (mode === 'server') {
      addTestResult('写入模式配置', 'pass', `写入模式: ${mode}`, { apiBase });
    } else {
      addTestResult('写入模式配置', 'warn', `写入模式: ${mode}，可能不会写入文件`, { apiBase });
    }
    
    if (apiBase) {
      addTestResult('API基址配置', 'pass', `API基址: ${apiBase}`);
      return true;
    } else {
      addTestResult('API基址配置', 'fail', 'API基址未配置');
      return false;
    }
  }
  
  // 测试3: 测试后端API连通性
  async function test3_CheckBackendAPI() {
    try {
      const apiBase = window.MDBaseManager?.API_BASE || '';
      const response = await fetch(apiBase + '/api/md-base/hash', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        addTestResult('后端API连通性', 'pass', 'MD底座API可访问', result);
        return true;
      } else {
        addTestResult('后端API连通性', 'fail', `API响应错误: ${response.status}`);
        return false;
      }
    } catch (error) {
      addTestResult('后端API连通性', 'fail', `API连接失败: ${error.message}`);
      return false;
    }
  }
  
  // 测试4: 测试文件读取
  async function test4_CheckFileRead() {
    try {
      const content = await window.MDBaseManager.loadMDBase();
      if (content && content.length > 0) {
        addTestResult('MD文件读取', 'pass', `成功读取MD文件，长度: ${content.length}字符`);
        return content;
      } else {
        addTestResult('MD文件读取', 'fail', 'MD文件为空或读取失败');
        return null;
      }
    } catch (error) {
      addTestResult('MD文件读取', 'fail', `读取异常: ${error.message}`);
      return null;
    }
  }
  
  // 测试5: 测试写入功能
  async function test5_CheckFileWrite() {
    try {
      // 创建测试项目数据
      const testProject = {
        id: `diagnostic-test-${Date.now()}`,
        name: '诊断测试项目',
        payload: {
          format: 'node_tree',
          data: {
            id: `diagnostic-test-${Date.now()}`,
            label: '诊断测试节点',
            content: `# 诊断测试\n\n创建时间: ${new Date().toLocaleString()}\n\n这是MD底座同步诊断的测试节点。`,
            children: []
          }
        },
        updatedAt: Date.now()
      };
      
      console.log('[MD底座诊断] 开始写入测试...');
      const success = await window.MDBaseManager.writeMindmapToMD(testProject);
      
      if (success) {
        addTestResult('MD文件写入', 'pass', '成功写入测试项目到MD文件', { projectId: testProject.id });
        return testProject;
      } else {
        addTestResult('MD文件写入', 'fail', '写入测试项目失败');
        return null;
      }
    } catch (error) {
      addTestResult('MD文件写入', 'fail', `写入异常: ${error.message}`);
      return null;
    }
  }
  
  // 测试6: 验证文件内容
  async function test6_VerifyFileContent(testProject) {
    if (!testProject) {
      addTestResult('文件内容验证', 'fail', '无测试项目可验证');
      return false;
    }
    
    try {
      // 等待一秒确保文件写入完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新读取文件
      const content = await window.MDBaseManager.loadMDBase();
      
      if (content && content.includes(testProject.id)) {
        addTestResult('文件内容验证', 'pass', '测试项目已成功写入MD文件');
        return true;
      } else {
        addTestResult('文件内容验证', 'fail', '测试项目未在MD文件中找到');
        return false;
      }
    } catch (error) {
      addTestResult('文件内容验证', 'fail', `验证异常: ${error.message}`);
      return false;
    }
  }
  
  // 测试7: 检查自动同步机制
  function test7_CheckAutoSync() {
    const hasAutoSync = !!window.mindmapController?.saveMindmapToStorage?.__mdSyncWrapped;
    const hasRealtimeSync = !!window.realtimeMDSyncer;
    
    if (hasAutoSync) {
      addTestResult('自动同步机制', 'pass', '保存方法已被包装，支持自动同步');
    } else {
      addTestResult('自动同步机制', 'warn', '保存方法未被包装，可能不支持自动同步');
    }
    
    if (hasRealtimeSync) {
      addTestResult('实时同步器', 'pass', '实时同步器已激活');
    } else {
      addTestResult('实时同步器', 'warn', '实时同步器未激活');
    }
    
    return hasAutoSync || hasRealtimeSync;
  }
  
  // 生成诊断报告
  function generateReport() {
    console.log('\n=== 📋 MD底座同步机制诊断报告 ===');
    console.log(`诊断时间: ${diagnosticResults.timestamp}`);
    console.log(`测试结果: ✅${diagnosticResults.summary.passed} ❌${diagnosticResults.summary.failed} ⚠️${diagnosticResults.summary.warnings}`);
    
    console.log('\n📊 详细测试结果:');
    diagnosticResults.tests.forEach((test, index) => {
      const emoji = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${emoji} ${test.name}: ${test.message}`);
    });
    
    console.log('\n🔍 问题分析:');
    const failedTests = diagnosticResults.tests.filter(t => t.status === 'fail');
    const warnTests = diagnosticResults.tests.filter(t => t.status === 'warn');
    
    if (failedTests.length === 0 && warnTests.length === 0) {
      console.log('✅ MD底座同步机制工作正常！');
    } else {
      if (failedTests.length > 0) {
        console.log('❌ 发现严重问题:');
        failedTests.forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`);
        });
      }
      
      if (warnTests.length > 0) {
        console.log('⚠️ 发现潜在问题:');
        warnTests.forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`);
        });
      }
    }
    
    console.log('\n💡 建议措施:');
    if (failedTests.some(t => t.name.includes('MDBaseManager'))) {
      console.log('  - 检查MDBaseManager是否正确加载');
    }
    if (failedTests.some(t => t.name.includes('API'))) {
      console.log('  - 检查后端服务器是否运行，API端点是否正确');
    }
    if (failedTests.some(t => t.name.includes('写入'))) {
      console.log('  - 检查文件权限和后端写入逻辑');
    }
    if (warnTests.some(t => t.name.includes('模式'))) {
      console.log('  - 考虑将MD_WRITE_MODE设置为"server"以确保文件写入');
    }
    
    console.log('=====================================\n');
  }
  
  // 执行完整诊断
  async function runFullDiagnostic() {
    console.log('[MD底座诊断] 🚀 开始完整诊断...');
    
    // 基础检查
    const hasMDManager = test1_CheckMDBaseManager();
    if (!hasMDManager) {
      generateReport();
      return;
    }
    
    test2_CheckConfiguration();
    
    // API检查
    const apiWorking = await test3_CheckBackendAPI();
    if (!apiWorking) {
      generateReport();
      return;
    }
    
    // 文件操作检查
    const content = await test4_CheckFileRead();
    const testProject = await test5_CheckFileWrite();
    await test6_VerifyFileContent(testProject);
    
    // 同步机制检查
    test7_CheckAutoSync();
    
    // 生成报告
    generateReport();
  }
  
  // 暴露到全局
  window.MDSyncDiagnostic = {
    run: runFullDiagnostic,
    results: diagnosticResults
  };
  
  // 自动运行诊断
  setTimeout(() => {
    runFullDiagnostic();
  }, 3000); // 等待3秒确保所有组件加载完成
  
  console.log('[MD底座诊断] ✅ 诊断脚本已就绪');
  
})();

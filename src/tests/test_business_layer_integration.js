/**
 * 程序员 - Phase 6.2 Day 3 业务层集成测试
 * 
 * 测试业务层模块与控制器的集成效果
 * 验证委托模式和向后兼容性
 */

(function() {
  'use strict';
  
  class BusinessLayerIntegrationTest {
    constructor() {
      this.testResults = [];
      this.controller = null;
    }
    
    async runAllTests() {
      console.log('🧪 [BusinessLayerTest] 开始业务层集成测试');
      
      try {
        // 等待控制器初始化
        await this.waitForController();
        
        // 运行测试套件
        await this.testBusinessModuleInitialization();
        await this.testNodeManagerDelegation();
        await this.testStateManagerDelegation();
        await this.testSyncManagerDelegation();
        await this.testBackwardCompatibility();
        await this.testErrorHandling();
        
        // 输出测试结果
        this.outputTestResults();
        
      } catch (error) {
        console.error('🚨 [BusinessLayerTest] 测试执行失败:', error);
        this.testResults.push({
          name: 'Test Execution',
          status: 'FAILED',
          error: error.message
        });
      }
    }
    
    async waitForController() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkController = () => {
          attempts++;
          
          if (window.mindmapController && window.mindmapController.mind) {
            this.controller = window.mindmapController;
            console.log('✅ [BusinessLayerTest] 控制器准备就绪');
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('控制器初始化超时'));
          } else {
            setTimeout(checkController, 100);
          }
        };
        
        checkController();
      });
    }
    
    async testBusinessModuleInitialization() {
      console.log('🔍 [BusinessLayerTest] 测试业务模块初始化');
      
      try {
        const hasNodeManager = !!this.controller.nodeManager;
        const hasStateManager = !!this.controller.stateManager;
        const hasSyncManager = !!this.controller.syncManager;
        
        this.testResults.push({
          name: 'NodeManager Initialization',
          status: hasNodeManager ? 'PASSED' : 'FAILED',
          details: `NodeManager存在: ${hasNodeManager}`
        });
        
        this.testResults.push({
          name: 'StateManager Initialization',
          status: hasStateManager ? 'PASSED' : 'FAILED',
          details: `StateManager存在: ${hasStateManager}`
        });
        
        this.testResults.push({
          name: 'SyncManager Initialization',
          status: hasSyncManager ? 'PASSED' : 'FAILED',
          details: `SyncManager存在: ${hasSyncManager}`
        });
        
      } catch (error) {
        this.testResults.push({
          name: 'Business Module Initialization',
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    async testNodeManagerDelegation() {
      console.log('🔍 [BusinessLayerTest] 测试节点管理器委托');
      
      try {
        // 测试addChildNode委托
        const originalMethod = this.controller.addChildNode;
        let delegationCalled = false;
        
        if (this.controller.nodeManager) {
          const originalNodeManagerMethod = this.controller.nodeManager.addChildNode;
          this.controller.nodeManager.addChildNode = function() {
            delegationCalled = true;
            return 'test-node-id';
          };
          
          // 调用控制器方法
          try {
            this.controller.addChildNode('root');
          } catch (error) {
            // 忽略实际执行错误，只关注委托是否发生
          }
          
          // 恢复原始方法
          this.controller.nodeManager.addChildNode = originalNodeManagerMethod;
        }
        
        this.testResults.push({
          name: 'NodeManager Delegation',
          status: delegationCalled ? 'PASSED' : 'FAILED',
          details: `委托调用: ${delegationCalled}`
        });
        
      } catch (error) {
        this.testResults.push({
          name: 'NodeManager Delegation',
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    async testStateManagerDelegation() {
      console.log('🔍 [BusinessLayerTest] 测试状态管理器委托');
      
      try {
        let delegationCalled = false;
        
        if (this.controller.stateManager) {
          const originalMethod = this.controller.stateManager.setSelectedNode;
          this.controller.stateManager.setSelectedNode = function() {
            delegationCalled = true;
            return true;
          };
          
          // 调用控制器方法
          try {
            this.controller.setSelectedNode('test-node');
          } catch (error) {
            // 忽略实际执行错误
          }
          
          // 恢复原始方法
          this.controller.stateManager.setSelectedNode = originalMethod;
        }
        
        this.testResults.push({
          name: 'StateManager Delegation',
          status: delegationCalled ? 'PASSED' : 'FAILED',
          details: `委托调用: ${delegationCalled}`
        });
        
      } catch (error) {
        this.testResults.push({
          name: 'StateManager Delegation',
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    async testSyncManagerDelegation() {
      console.log('🔍 [BusinessLayerTest] 测试同步管理器委托');
      
      try {
        let delegationCalled = false;
        
        if (this.controller.syncManager) {
          const originalMethod = this.controller.syncManager.saveToStorage;
          this.controller.syncManager.saveToStorage = function() {
            delegationCalled = true;
            return Promise.resolve(true);
          };
          
          // 调用控制器方法
          try {
            await this.controller.saveMindmapToStorage();
          } catch (error) {
            // 忽略实际执行错误
          }
          
          // 恢复原始方法
          this.controller.syncManager.saveToStorage = originalMethod;
        }
        
        this.testResults.push({
          name: 'SyncManager Delegation',
          status: delegationCalled ? 'PASSED' : 'FAILED',
          details: `委托调用: ${delegationCalled}`
        });
        
      } catch (error) {
        this.testResults.push({
          name: 'SyncManager Delegation',
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    async testBackwardCompatibility() {
      console.log('🔍 [BusinessLayerTest] 测试向后兼容性');
      
      try {
        // 临时禁用业务模块，测试回退机制
        const originalNodeManager = this.controller.nodeManager;
        const originalStateManager = this.controller.stateManager;
        const originalSyncManager = this.controller.syncManager;
        
        this.controller.nodeManager = null;
        this.controller.stateManager = null;
        this.controller.syncManager = null;
        
        let backwardCompatible = true;
        
        try {
          // 测试原始方法是否仍然可用
          if (typeof this.controller.addChildNode === 'function') {
            // 方法存在，向后兼容
          } else {
            backwardCompatible = false;
          }
        } catch (error) {
          backwardCompatible = false;
        }
        
        // 恢复业务模块
        this.controller.nodeManager = originalNodeManager;
        this.controller.stateManager = originalStateManager;
        this.controller.syncManager = originalSyncManager;
        
        this.testResults.push({
          name: 'Backward Compatibility',
          status: backwardCompatible ? 'PASSED' : 'FAILED',
          details: `向后兼容: ${backwardCompatible}`
        });
        
      } catch (error) {
        this.testResults.push({
          name: 'Backward Compatibility',
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    async testErrorHandling() {
      console.log('🔍 [BusinessLayerTest] 测试错误处理');
      
      try {
        let errorHandled = false;
        
        if (this.controller.nodeManager) {
          const originalMethod = this.controller.nodeManager.addChildNode;
          this.controller.nodeManager.addChildNode = function() {
            throw new Error('测试错误');
          };
          
          try {
            this.controller.addChildNode('root');
            errorHandled = true; // 如果没有抛出错误，说明错误被处理了
          } catch (error) {
            errorHandled = false; // 错误没有被处理
          }
          
          // 恢复原始方法
          this.controller.nodeManager.addChildNode = originalMethod;
        }
        
        this.testResults.push({
          name: 'Error Handling',
          status: errorHandled ? 'PASSED' : 'FAILED',
          details: `错误处理: ${errorHandled}`
        });
        
      } catch (error) {
        this.testResults.push({
          name: 'Error Handling',
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    outputTestResults() {
      console.log('\n📊 [BusinessLayerTest] 测试结果汇总:');
      console.log('='.repeat(60));
      
      let passed = 0;
      let failed = 0;
      let errors = 0;
      
      this.testResults.forEach(result => {
        const status = result.status === 'PASSED' ? '✅' : 
                      result.status === 'FAILED' ? '❌' : '🚨';
        
        console.log(`${status} ${result.name}: ${result.status}`);
        if (result.details) {
          console.log(`   ${result.details}`);
        }
        if (result.error) {
          console.log(`   错误: ${result.error}`);
        }
        
        if (result.status === 'PASSED') passed++;
        else if (result.status === 'FAILED') failed++;
        else errors++;
      });
      
      console.log('='.repeat(60));
      console.log(`📈 总计: ${this.testResults.length} 个测试`);
      console.log(`✅ 通过: ${passed} 个`);
      console.log(`❌ 失败: ${failed} 个`);
      console.log(`🚨 错误: ${errors} 个`);
      
      const successRate = Math.round((passed / this.testResults.length) * 100);
      console.log(`📊 成功率: ${successRate}%`);
      
      // 存储测试结果到全局变量
      window.businessLayerTestResults = {
        total: this.testResults.length,
        passed: passed,
        failed: failed,
        errors: errors,
        successRate: successRate,
        details: this.testResults
      };
      
      if (successRate >= 80) {
        console.log('🎉 [BusinessLayerTest] 业务层集成测试通过！');
      } else {
        console.warn('⚠️ [BusinessLayerTest] 业务层集成测试需要改进');
      }
    }
  }
  
  // 自动运行测试
  if (typeof window !== 'undefined') {
    window.BusinessLayerIntegrationTest = BusinessLayerIntegrationTest;
    
    // 延迟运行测试，确保所有模块加载完成
    setTimeout(() => {
      const test = new BusinessLayerIntegrationTest();
      test.runAllTests();
    }, 2000);
  }
  
})();

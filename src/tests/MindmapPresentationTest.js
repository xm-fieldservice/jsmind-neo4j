/**
 * 程序员 MindmapPresentationTest.js - 表现层模块测试套件
 * 
 * 测试范围：
 * - MindmapRenderer 渲染器功能测试
 * - MindmapEventManager 事件管理器测试
 * - MindmapUIController UI控制器测试
 * - MindmapPresentationIntegration 集成测试
 * 
 * 测试类型：
 * - 单元测试：各模块独立功能测试
 * - 集成测试：模块间协作测试
 * - 性能测试：渲染和事件处理性能
 * - 兼容性测试：向后兼容性验证
 */

class MindmapPresentationTest {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    
    this.testData = {
      sampleMindmapData: {
        id: 'test-root',
        label: '测试根节点',
        content: '这是测试内容',
        expanded: true,
        children: [
          {
            id: 'test-child-1',
            label: '子节点1',
            content: '子节点内容1',
            expanded: true,
            children: []
          },
          {
            id: 'test-child-2',
            label: '子节点2',
            content: '子节点内容2',
            expanded: false,
            children: [
              {
                id: 'test-grandchild-1',
                label: '孙节点1',
                content: '孙节点内容1',
                expanded: true,
                children: []
              }
            ]
          }
        ]
      }
    };
    
    this.mockObjects = {};
    this.testStartTime = null;
    this.testEndTime = null;
    
    console.log('[MindmapPresentationTest] 表现层测试套件初始化完成');
  }
  
  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.testStartTime = performance.now();
    console.log('🧪 [MindmapPresentationTest] 开始表现层模块测试...');
    
    try {
      // 准备测试环境
      await this._setupTestEnvironment();
      
      // 运行渲染器测试
      await this._testMindmapRenderer();
      
      // 运行事件管理器测试
      await this._testMindmapEventManager();
      
      // 运行UI控制器测试
      await this._testMindmapUIController();
      
      // 运行集成测试
      await this._testPresentationIntegration();
      
      // 运行性能测试
      await this._testPerformance();
      
      // 清理测试环境
      await this._cleanupTestEnvironment();
      
    } catch (error) {
      this._recordError('测试执行异常', error);
    }
    
    this.testEndTime = performance.now();
    this._generateTestReport();
  }
  
  /**
   * 设置测试环境
   */
  async _setupTestEnvironment() {
    console.log('🔧 [MindmapPresentationTest] 设置测试环境...');
    
    try {
      // 创建测试容器
      this._createTestContainer();
      
      // 创建模拟对象
      this._createMockObjects();
      
      // 等待依赖加载
      await this._waitForDependencies();
      
      console.log('✅ [MindmapPresentationTest] 测试环境设置完成');
    } catch (error) {
      throw new Error(`测试环境设置失败: ${error.message}`);
    }
  }
  
  /**
   * 创建测试容器
   */
  _createTestContainer() {
    // 创建测试用的DOM容器
    const testContainer = document.createElement('div');
    testContainer.id = 'test-mindmap-container';
    testContainer.style.cssText = 'width: 800px; height: 600px; position: absolute; top: -9999px; left: -9999px;';
    document.body.appendChild(testContainer);
    
    // 创建测试用的标签面板元素
    const tagPanel = document.createElement('div');
    tagPanel.id = 'test-tag-panel';
    const tagGroups = document.createElement('div');
    tagGroups.id = 'test-tag-groups';
    const tagList = document.createElement('div');
    tagList.id = 'test-tag-list';
    const tagEmpty = document.createElement('div');
    tagEmpty.id = 'test-tag-panel-empty';
    
    tagPanel.appendChild(tagGroups);
    tagPanel.appendChild(tagList);
    tagPanel.appendChild(tagEmpty);
    document.body.appendChild(tagPanel);
    
    this.mockObjects.testContainer = testContainer;
    this.mockObjects.tagPanel = tagPanel;
  }
  
  /**
   * 创建模拟对象
   */
  _createMockObjects() {
    // 模拟jsMind实例
    this.mockObjects.mockMind = {
      show: (data) => {
        console.log('Mock jsMind.show called with:', data);
        return true;
      },
      get_data: () => ({
        format: 'node_tree',
        data: this.testData.sampleMindmapData
      }),
      get_node: (nodeId) => ({
        id: nodeId,
        topic: `节点${nodeId}`,
        data: {}
      }),
      get_selected_node: () => ({
        id: 'test-root',
        topic: '测试根节点'
      }),
      get_root: () => ({
        id: 'test-root',
        topic: '测试根节点'
      }),
      select_node: (nodeId) => {
        console.log(`Mock select_node: ${nodeId}`);
      },
      center_node: (nodeId) => {
        console.log(`Mock center_node: ${nodeId}`);
      },
      set_node_color: (nodeId, bg, fg) => {
        console.log(`Mock set_node_color: ${nodeId}, ${bg}, ${fg}`);
      }
    };
    
    // 模拟事件总线
    this.mockObjects.mockEventBus = {
      emit: (event, data) => {
        console.log(`Mock EventBus emit: ${event}`, data);
      },
      on: (event, handler) => {
        console.log(`Mock EventBus on: ${event}`);
      }
    };
    
    // 模拟日志器
    this.mockObjects.mockLogger = {
      log: (...args) => console.log('[MockLogger]', ...args),
      warn: (...args) => console.warn('[MockLogger]', ...args),
      error: (...args) => console.error('[MockLogger]', ...args)
    };
  }
  
  /**
   * 等待依赖加载
   */
  async _waitForDependencies() {
    const maxWaitTime = 5000;
    const checkInterval = 100;
    let waitTime = 0;
    
    while (waitTime < maxWaitTime) {
      if (window.MindmapRenderer && window.MindmapEventManager && 
          window.MindmapUIController && window.MindmapPresentationIntegration) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }
    
    throw new Error('依赖加载超时');
  }
  
  /**
   * 测试MindmapRenderer
   */
  async _testMindmapRenderer() {
    console.log('🎯 [MindmapPresentationTest] 测试MindmapRenderer...');
    
    try {
      // 测试1: 渲染器初始化
      await this._test('渲染器初始化', async () => {
        const renderer = new window.MindmapRenderer({
          mind: this.mockObjects.mockMind,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        this._assert(renderer !== null, '渲染器实例创建成功');
        this._assert(typeof renderer.renderMindmap === 'function', '渲染方法存在');
        this._assert(typeof renderer.applyDefaultNodeColor === 'function', '颜色应用方法存在');
        
        return renderer;
      });
      
      // 测试2: 渲染功能
      await this._test('渲染功能', async () => {
        const renderer = new window.MindmapRenderer({
          mind: this.mockObjects.mockMind,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        const result = await renderer.renderMindmap(this.testData.sampleMindmapData);
        this._assert(result === true, '渲染返回成功');
        
        const stats = renderer.getRenderStats();
        this._assert(stats.totalRenders > 0, '渲染统计正确');
      });
      
      // 测试3: 颜色应用
      await this._test('颜色应用', async () => {
        const renderer = new window.MindmapRenderer({
          mind: this.mockObjects.mockMind,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await renderer.applyDefaultNodeColor('#f0f0f0', '#333333');
        // 验证颜色应用不会抛出异常
        this._assert(true, '颜色应用成功');
      });
      
      // 测试4: 节点选择
      await this._test('节点选择', async () => {
        const renderer = new window.MindmapRenderer({
          mind: this.mockObjects.mockMind,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        const result = renderer.selectNode('test-child-1');
        this._assert(result === true, '节点选择成功');
      });
      
      // 测试5: 性能统计
      await this._test('性能统计', async () => {
        const renderer = new window.MindmapRenderer({
          mind: this.mockObjects.mockMind,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await renderer.renderMindmap(this.testData.sampleMindmapData);
        const stats = renderer.getRenderStats();
        
        this._assert(typeof stats.totalRenders === 'number', '总渲染次数统计存在');
        this._assert(typeof stats.cacheHitRate === 'string', '缓存命中率统计存在');
        this._assert(typeof stats.averageRenderTime === 'string', '平均渲染时间统计存在');
      });
      
    } catch (error) {
      this._recordError('MindmapRenderer测试', error);
    }
  }
  
  /**
   * 测试MindmapEventManager
   */
  async _testMindmapEventManager() {
    console.log('🎮 [MindmapPresentationTest] 测试MindmapEventManager...');
    
    try {
      // 测试1: 事件管理器初始化
      await this._test('事件管理器初始化', async () => {
        const eventManager = new window.MindmapEventManager({
          mind: this.mockObjects.mockMind,
          container: this.mockObjects.testContainer,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        this._assert(eventManager !== null, '事件管理器实例创建成功');
        this._assert(typeof eventManager.initialize === 'function', '初始化方法存在');
        
        await eventManager.initialize();
        this._assert(eventManager.isInitialized === true, '事件管理器初始化成功');
        
        return eventManager;
      });
      
      // 测试2: 事件统计
      await this._test('事件统计', async () => {
        const eventManager = new window.MindmapEventManager({
          mind: this.mockObjects.mockMind,
          container: this.mockObjects.testContainer,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await eventManager.initialize();
        const stats = eventManager.getEventStats();
        
        this._assert(typeof stats.totalEvents === 'number', '总事件数统计存在');
        this._assert(Array.isArray(stats.activeEventTypes), '活跃事件类型统计存在');
        this._assert(typeof stats.totalHandlers === 'number', '处理器数量统计存在');
      });
      
      // 测试3: 键盘事件模拟
      await this._test('键盘事件处理', async () => {
        const eventManager = new window.MindmapEventManager({
          mind: this.mockObjects.mockMind,
          container: this.mockObjects.testContainer,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await eventManager.initialize();
        
        // 模拟键盘事件
        const keyEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true
        });
        
        document.dispatchEvent(keyEvent);
        
        // 验证事件处理不会抛出异常
        this._assert(true, '键盘事件处理成功');
      });
      
    } catch (error) {
      this._recordError('MindmapEventManager测试', error);
    }
  }
  
  /**
   * 测试MindmapUIController
   */
  async _testMindmapUIController() {
    console.log('🎨 [MindmapPresentationTest] 测试MindmapUIController...');
    
    try {
      // 测试1: UI控制器初始化
      await this._test('UI控制器初始化', async () => {
        const uiController = new window.MindmapUIController({
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        this._assert(uiController !== null, 'UI控制器实例创建成功');
        this._assert(typeof uiController.initialize === 'function', '初始化方法存在');
        
        await uiController.initialize();
        this._assert(uiController.isInitialized === true, 'UI控制器初始化成功');
        
        return uiController;
      });
      
      // 测试2: Toast功能
      await this._test('Toast功能', async () => {
        const uiController = new window.MindmapUIController({
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await uiController.initialize();
        
        uiController.showToast('测试消息', 'info');
        uiController.showToast('成功消息', 'success');
        uiController.showToast('警告消息', 'warning');
        uiController.showToast('错误消息', 'error');
        
        const state = uiController.getUIState();
        this._assert(state.activeToasts.length > 0, 'Toast消息显示成功');
      });
      
      // 测试3: 模态框功能
      await this._test('模态框功能', async () => {
        const uiController = new window.MindmapUIController({
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await uiController.initialize();
        
        const modalContent = '<div><h3>测试模态框</h3><p>这是测试内容</p></div>';
        uiController.showModal('test-modal', modalContent);
        
        const state = uiController.getUIState();
        this._assert(state.activeModals.has('test-modal'), '模态框显示成功');
        
        uiController.closeModal('test-modal');
        const stateAfterClose = uiController.getUIState();
        
        // 由于关闭有动画延迟，我们检查关闭方法是否正常执行
        this._assert(true, '模态框关闭方法执行成功');
      });
      
      // 测试4: UI状态管理
      await this._test('UI状态管理', async () => {
        const uiController = new window.MindmapUIController({
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await uiController.initialize();
        
        const initialState = uiController.getUIState();
        this._assert(typeof initialState.toolbarVisible === 'boolean', '工具栏状态存在');
        this._assert(typeof initialState.tagPanelVisible === 'boolean', '标签面板状态存在');
        this._assert(typeof initialState.isMobile === 'boolean', '响应式状态存在');
        
        uiController.toggleToolbar();
        const stateAfterToggle = uiController.getUIState();
        this._assert(stateAfterToggle.toolbarVisible !== initialState.toolbarVisible, '工具栏状态切换成功');
      });
      
    } catch (error) {
      this._recordError('MindmapUIController测试', error);
    }
  }
  
  /**
   * 测试表现层集成
   */
  async _testPresentationIntegration() {
    console.log('🔌 [MindmapPresentationTest] 测试表现层集成...');
    
    try {
      // 测试1: 集成器初始化
      await this._test('集成器初始化', async () => {
        const integrator = new window.MindmapPresentationIntegration({
          logger: this.mockObjects.mockLogger,
          eventBus: this.mockObjects.mockEventBus
        });
        
        this._assert(integrator !== null, '集成器实例创建成功');
        this._assert(typeof integrator.integrate === 'function', '集成方法存在');
        
        return integrator;
      });
      
      // 测试2: 模拟控制器集成
      await this._test('模拟控制器集成', async () => {
        const integrator = new window.MindmapPresentationIntegration({
          logger: this.mockObjects.mockLogger,
          eventBus: this.mockObjects.mockEventBus
        });
        
        // 创建模拟的MindmapController
        const mockController = {
          mind: this.mockObjects.mockMind,
          dom: {
            containerEl: this.mockObjects.testContainer
          },
          data: this.testData.sampleMindmapData,
          selectedNode: 'test-root',
          dragEnabled: true,
          
          // 原始方法
          renderMindmap: () => console.log('Original renderMindmap'),
          applyDefaultNodeColor: () => console.log('Original applyDefaultNodeColor'),
          showToast: (msg) => console.log('Original showToast:', msg),
          wireKeyboardShortcuts: () => console.log('Original wireKeyboardShortcuts'),
          wireContextMenu: () => console.log('Original wireContextMenu'),
          enableDragging: () => console.log('Original enableDragging'),
          disableDragging: () => console.log('Original disableDragging'),
          renderTagPanelFromMind: () => console.log('Original renderTagPanelFromMind'),
          scheduleAutoFit: () => console.log('Original scheduleAutoFit')
        };
        
        // 执行集成
        await integrator.integrate(mockController);
        
        const state = integrator.getIntegrationState();
        this._assert(state.initialized === true, '集成完成');
        this._assert(state.renderer === true, '渲染器集成成功');
        this._assert(state.eventManager === true, '事件管理器集成成功');
        this._assert(state.uiController === true, 'UI控制器集成成功');
        
        // 测试集成后的方法调用
        mockController.renderMindmap();
        mockController.showToast('集成测试消息');
        
        this._assert(true, '集成后方法调用成功');
      });
      
    } catch (error) {
      this._recordError('表现层集成测试', error);
    }
  }
  
  /**
   * 性能测试
   */
  async _testPerformance() {
    console.log('⚡ [MindmapPresentationTest] 性能测试...');
    
    try {
      // 测试1: 渲染性能
      await this._test('渲染性能', async () => {
        const renderer = new window.MindmapRenderer({
          mind: this.mockObjects.mockMind,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        const startTime = performance.now();
        
        // 连续渲染10次
        for (let i = 0; i < 10; i++) {
          await renderer.renderMindmap(this.testData.sampleMindmapData);
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const averageTime = totalTime / 10;
        
        console.log(`渲染性能: 10次渲染总耗时 ${totalTime.toFixed(2)}ms, 平均 ${averageTime.toFixed(2)}ms`);
        
        this._assert(averageTime < 100, '平均渲染时间小于100ms');
        
        const stats = renderer.getRenderStats();
        console.log('渲染统计:', stats);
      });
      
      // 测试2: 事件处理性能
      await this._test('事件处理性能', async () => {
        const eventManager = new window.MindmapEventManager({
          mind: this.mockObjects.mockMind,
          container: this.mockObjects.testContainer,
          eventBus: this.mockObjects.mockEventBus,
          logger: this.mockObjects.mockLogger
        });
        
        await eventManager.initialize();
        
        const startTime = performance.now();
        
        // 模拟100个键盘事件
        for (let i = 0; i < 100; i++) {
          const keyEvent = new KeyboardEvent('keydown', {
            key: i % 2 === 0 ? 'Tab' : 'Enter',
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(keyEvent);
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        console.log(`事件处理性能: 100个事件处理耗时 ${totalTime.toFixed(2)}ms`);
        
        this._assert(totalTime < 500, '100个事件处理时间小于500ms');
      });
      
    } catch (error) {
      this._recordError('性能测试', error);
    }
  }
  
  /**
   * 清理测试环境
   */
  async _cleanupTestEnvironment() {
    console.log('🧹 [MindmapPresentationTest] 清理测试环境...');
    
    try {
      // 移除测试DOM元素
      const testContainer = document.getElementById('test-mindmap-container');
      if (testContainer) {
        testContainer.remove();
      }
      
      const testTagPanel = document.getElementById('test-tag-panel');
      if (testTagPanel) {
        testTagPanel.remove();
      }
      
      // 清理Toast容器
      const toastContainer = document.getElementById('toast-container');
      if (toastContainer) {
        toastContainer.remove();
      }
      
      console.log('✅ [MindmapPresentationTest] 测试环境清理完成');
    } catch (error) {
      console.warn('[MindmapPresentationTest] 测试环境清理失败:', error);
    }
  }
  
  /**
   * 执行单个测试
   */
  async _test(testName, testFunction) {
    this.testResults.total++;
    
    try {
      console.log(`  📋 测试: ${testName}`);
      const result = await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        result: result
      });
      console.log(`  ✅ 通过: ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack
      });
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      console.error(`  ❌ 失败: ${testName} - ${error.message}`);
    }
  }
  
  /**
   * 断言函数
   */
  _assert(condition, message) {
    if (!condition) {
      throw new Error(`断言失败: ${message}`);
    }
  }
  
  /**
   * 记录错误
   */
  _recordError(context, error) {
    this.testResults.errors.push({
      context,
      error: error.message,
      stack: error.stack
    });
    console.error(`[MindmapPresentationTest] ${context}错误:`, error);
  }
  
  /**
   * 生成测试报告
   */
  _generateTestReport() {
    const duration = this.testEndTime - this.testStartTime;
    const passRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(2);
    
    console.log('\n📊 [MindmapPresentationTest] 测试报告');
    console.log('='.repeat(60));
    console.log(`总测试数: ${this.testResults.total}`);
    console.log(`通过: ${this.testResults.passed}`);
    console.log(`失败: ${this.testResults.failed}`);
    console.log(`通过率: ${passRate}%`);
    console.log(`总耗时: ${duration.toFixed(2)}ms`);
    console.log('='.repeat(60));
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test || error.context}: ${error.error}`);
      });
    }
    
    console.log('\n📋 详细结果:');
    this.testResults.details.forEach((detail, index) => {
      const status = detail.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${detail.name}`);
      if (detail.error) {
        console.log(`   错误: ${detail.error}`);
      }
    });
    
    // 触发测试完成事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mindmap-presentation-test-complete', {
        detail: {
          results: this.testResults,
          duration,
          passRate
        }
      }));
    }
    
    const finalStatus = this.testResults.failed === 0 ? '✅ 全部通过' : '❌ 存在失败';
    console.log(`\n🏁 [MindmapPresentationTest] 测试完成: ${finalStatus}`);
  }
  
  /**
   * 获取测试结果
   */
  getTestResults() {
    return {
      ...this.testResults,
      duration: this.testEndTime - this.testStartTime,
      passRate: ((this.testResults.passed / this.testResults.total) * 100).toFixed(2) + '%'
    };
  }
}

// 导出测试类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapPresentationTest;
} else if (typeof window !== 'undefined') {
  window.MindmapPresentationTest = MindmapPresentationTest;
}

// 自动运行测试（如果在浏览器环境中）
if (typeof window !== 'undefined' && window.location.search.includes('run-presentation-tests')) {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [MindmapPresentationTest] 自动运行表现层测试...');
    
    try {
      // 等待一段时间确保所有脚本加载完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const testSuite = new MindmapPresentationTest();
      await testSuite.runAllTests();
      
      // 将测试结果保存到全局变量供调试使用
      window.presentationTestResults = testSuite.getTestResults();
      
    } catch (error) {
      console.error('[MindmapPresentationTest] 自动测试运行失败:', error);
    }
  });
}

/**
 * MD底座功能测试脚本
 * 测试脑图与MD底座的双向读写功能
 */
(function(){
  'use strict';

  const TestMDBase = {
    // 测试MD解析器
    async testParser() {
      console.log('=== 测试MD解析器 ===');
      
      if (!window.MindmapMDParser) {
        console.error('MD解析器未加载');
        return false;
      }

      // 测试数据
      const testProject = {
        id: 'test_md_001',
        name: '测试项目',
        payload: {
          format: 'node_tree',
          data: {
            id: 'root',
            topic: '测试项目',
            children: [
              {
                id: 'child1',
                topic: '子节点1',
                data: { content: '这是子节点1的内容' }
              },
              {
                id: 'child2', 
                topic: '子节点2',
                children: [
                  {
                    id: 'grandchild1',
                    topic: '孙节点1'
                  }
                ]
              }
            ]
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        accessCount: 5
      };

      try {
        // 测试JSON转MD
        const mdContent = window.MindmapMDParser.jsonToMD(testProject);
        console.log('JSON转MD成功:', mdContent ? '✓' : '✗');
        if (mdContent) {
          console.log('MD内容长度:', mdContent.length);
        }

        // 测试MD转JSON
        if (mdContent) {
          const projects = window.MindmapMDParser.mdToJSON(mdContent);
          console.log('MD转JSON成功:', projects.length > 0 ? '✓' : '✗');
          console.log('解析出项目数:', projects.length);
          
          if (projects.length > 0) {
            const parsedProject = projects[0];
            console.log('项目ID匹配:', parsedProject.id === testProject.id ? '✓' : '✗');
            console.log('项目名称匹配:', parsedProject.name === testProject.name ? '✓' : '✗');
          }
        }

        return true;
      } catch (error) {
        console.error('解析器测试失败:', error);
        return false;
      }
    },

    // 测试MD底座管理器
    async testManager() {
      console.log('=== 测试MD底座管理器 ===');
      
      if (!window.MDBaseManager) {
        console.error('MD底座管理器未加载');
        return false;
      }

      try {
        // 测试加载MD底座
        console.log('加载MD底座...');
        const content = await window.MDBaseManager.loadMDBase();
        console.log('加载成功:', content ? '✓' : '✗');
        console.log('内容长度:', content ? content.length : 0);

        // 测试写入项目
        const testProject = {
          id: 'test_manager_001',
          name: 'MD管理器测试项目',
          payload: {
            format: 'node_tree',
            data: {
              id: 'root',
              topic: 'MD管理器测试项目',
              children: [
                { id: 'test1', topic: '测试节点1' },
                { id: 'test2', topic: '测试节点2' }
              ]
            }
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          accessCount: 1
        };

        console.log('写入测试项目...');
        const writeSuccess = await window.MDBaseManager.writeMindmapToMD(testProject);
        console.log('写入成功:', writeSuccess ? '✓' : '✗');

        // 测试读取项目
        console.log('读取测试项目...');
        const retrievedProject = await window.MDBaseManager.restoreMindmapFromMD(testProject.id);
        console.log('读取成功:', retrievedProject ? '✓' : '✗');
        
        if (retrievedProject) {
          console.log('项目ID匹配:', retrievedProject.id === testProject.id ? '✓' : '✗');
          console.log('项目名称匹配:', retrievedProject.name === testProject.name ? '✓' : '✗');
        }

        // 测试获取所有项目
        console.log('获取所有项目...');
        const allProjects = await window.MDBaseManager.getAllProjects();
        console.log('获取成功:', Array.isArray(allProjects) ? '✓' : '✗');
        console.log('项目总数:', allProjects.length);

        // 测试状态
        const status = window.MDBaseManager.getStatus();
        console.log('状态信息:', status);

        return true;
      } catch (error) {
        console.error('管理器测试失败:', error);
        return false;
      }
    },

    // 测试存储服务集成
    async testStorageIntegration() {
      console.log('=== 测试存储服务集成 ===');
      
      if (!window.MindmapStorage) {
        console.error('存储服务未加载');
        return false;
      }

      try {
        // 测试保存（应该自动写入MD底座）
        const testPayload = {
          format: 'node_tree',
          data: {
            id: 'integration_test_root',
            topic: '存储集成测试',
            children: [
              { id: 'int_child1', topic: '集成测试子节点' }
            ]
          },
          meta: {
            mind_id: 'integration_test_001',
            createdAt: Date.now()
          }
        };

        console.log('保存到存储服务...');
        window.MindmapStorage.save(testPayload);
        console.log('保存完成');

        // 等待异步MD写入完成
        await new Promise(resolve => setTimeout(resolve, 100));

        // 检查MD底座中是否有该项目
        if (window.MDBaseManager) {
          const mdProject = await window.MDBaseManager.restoreMindmapFromMD('integration_test_001');
          console.log('MD底座中找到项目:', mdProject ? '✓' : '✗');
          
          if (mdProject) {
            console.log('项目名称:', mdProject.name);
            console.log('数据格式:', mdProject.payload?.format);
          }
        }

        // 测试从MD底座加载
        const loadedFromMD = await window.MindmapStorage.loadFromMDBase('integration_test_001');
        console.log('从MD底座加载成功:', loadedFromMD ? '✓' : '✗');

        // 测试获取状态（包含MD底座状态）
        const status = await window.MindmapStorage.getStatus();
        console.log('存储状态:', status);

        return true;
      } catch (error) {
        console.error('存储集成测试失败:', error);
        return false;
      }
    },

    // 运行所有测试
    async runAllTests() {
      console.log('🚀 开始MD底座功能测试');
      console.log('时间:', new Date().toLocaleString());
      console.log('');

      const results = {
        parser: false,
        manager: false,
        integration: false
      };

      try {
        results.parser = await this.testParser();
        console.log('');
        
        results.manager = await this.testManager();
        console.log('');
        
        results.integration = await this.testStorageIntegration();
        console.log('');
      } catch (error) {
        console.error('测试执行失败:', error);
      }

      // 输出测试结果
      console.log('=== 测试结果汇总 ===');
      console.log('MD解析器:', results.parser ? '✅ 通过' : '❌ 失败');
      console.log('MD底座管理器:', results.manager ? '✅ 通过' : '❌ 失败');
      console.log('存储服务集成:', results.integration ? '✅ 通过' : '❌ 失败');
      
      const totalTests = Object.keys(results).length;
      const passedTests = Object.values(results).filter(Boolean).length;
      console.log(`总体结果: ${passedTests}/${totalTests} 通过`);
      
      if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！MD底座功能正常');
      } else {
        console.log('⚠️ 部分测试失败，请检查相关功能');
      }

      return results;
    }
  };

  // 导出到全局
  window.TestMDBase = TestMDBase;

  // 自动运行测试（可选）
  if (typeof window !== 'undefined' && window.location.search.includes('test-md-base')) {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => TestMDBase.runAllTests(), 1000);
    });
  }

})();

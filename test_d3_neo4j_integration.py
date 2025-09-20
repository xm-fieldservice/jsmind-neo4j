#!/usr/bin/env python3
"""
D3.js + Neo4j 集成测试和演示脚本
自动创建测试数据并验证可视化功能
"""

import requests
import json
import time
from pathlib import Path

class D3Neo4jTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.test_data_created = False
    
    def check_backend_status(self):
        """检查后端服务状态"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def create_test_nodes(self):
        """创建测试节点数据"""
        print("📝 创建测试节点数据...")
        
        test_nodes = [
            {
                "id": "project_main",
                "label": "主项目",
                "type": "project",
                "description": "核心项目管理节点",
                "properties": {"priority": "high", "status": "active"}
            },
            {
                "id": "task_analysis",
                "label": "需求分析",
                "type": "task", 
                "description": "项目需求分析任务",
                "properties": {"assignee": "张三", "progress": 80}
            },
            {
                "id": "task_design",
                "label": "系统设计",
                "type": "task",
                "description": "系统架构设计任务", 
                "properties": {"assignee": "李四", "progress": 60}
            },
            {
                "id": "resource_team",
                "label": "开发团队",
                "type": "resource",
                "description": "项目开发团队资源",
                "properties": {"size": 5, "location": "北京"}
            },
            {
                "id": "milestone_alpha",
                "label": "Alpha版本",
                "type": "milestone", 
                "description": "项目第一个里程碑",
                "properties": {"target_date": "2025-10-01", "completion": 45}
            }
        ]
        
        # 通过Neo4j API创建节点（这里需要实现节点创建API）
        # 暂时通过同步脑图数据的方式创建
        mindmap_data = {
            "format": "node_tree",
            "data": {
                "nodes": test_nodes,
                "relationships": []
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/sync-mindmap",
                json=mindmap_data,
                timeout=10
            )
            if response.status_code in [200, 201]:
                print("✅ 测试节点创建成功")
                return True
            else:
                print(f"❌ 节点创建失败: {response.status_code}")
        except Exception as e:
            print(f"❌ 节点创建异常: {e}")
        
        return False
    
    def create_test_relationships(self):
        """创建测试关系数据"""
        print("🔗 创建测试关系数据...")
        
        test_relationships = [
            {
                "source": "project_main",
                "target": "task_analysis", 
                "type": "CONTAINS",
                "properties": {"weight": 1, "created_at": "2025-09-20"}
            },
            {
                "source": "project_main",
                "target": "task_design",
                "type": "CONTAINS", 
                "properties": {"weight": 1, "created_at": "2025-09-20"}
            },
            {
                "source": "task_analysis",
                "target": "task_design",
                "type": "PRECEDES",
                "properties": {"dependency_type": "finish_to_start"}
            },
            {
                "source": "project_main", 
                "target": "resource_team",
                "type": "USES",
                "properties": {"allocation": 100}
            },
            {
                "source": "project_main",
                "target": "milestone_alpha", 
                "type": "TARGETS",
                "properties": {"priority": "high"}
            }
        ]
        
        success_count = 0
        for rel in test_relationships:
            try:
                response = requests.post(
                    f"{self.base_url}/api/relations",
                    json=rel,
                    timeout=10
                )
                if response.status_code in [200, 201]:
                    success_count += 1
                else:
                    print(f"⚠️ 关系创建失败: {rel['source']} -> {rel['target']}")
            except Exception as e:
                print(f"❌ 关系创建异常: {e}")
        
        if success_count > 0:
            print(f"✅ 成功创建 {success_count}/{len(test_relationships)} 个关系")
            self.test_data_created = True
            return True
        
        return False
    
    def test_graph_data_api(self):
        """测试图形数据API"""
        print("🧪 测试图形数据API...")
        
        try:
            # 测试全图数据
            response = requests.get(f"{self.base_url}/api/neo4j/graph-data", timeout=10)
            if response.status_code == 200:
                data = response.json()
                nodes = data.get('nodes', [])
                links = data.get('links', [])
                
                print(f"✅ 全图数据获取成功:")
                print(f"   📊 节点数量: {len(nodes)}")
                print(f"   🔗 连线数量: {len(links)}")
                
                # 打印节点类型统计
                node_types = {}
                for node in nodes:
                    node_type = node.get('type', 'unknown')
                    node_types[node_type] = node_types.get(node_type, 0) + 1
                
                print(f"   📈 节点类型分布: {node_types}")
                
                # 测试指定节点的关系网络
                if nodes:
                    test_node_id = nodes[0]['id']
                    response2 = requests.get(
                        f"{self.base_url}/api/neo4j/graph-data?node_id={test_node_id}",
                        timeout=10
                    )
                    if response2.status_code == 200:
                        data2 = response2.json()
                        print(f"✅ 节点关系网络获取成功 (中心节点: {test_node_id})")
                        print(f"   📊 相关节点: {len(data2.get('nodes', []))}")
                        print(f"   🔗 相关连线: {len(data2.get('links', []))}")
                
                return True
            else:
                print(f"❌ API调用失败: {response.status_code}")
                
        except Exception as e:
            print(f"❌ API测试异常: {e}")
        
        return False
    
    def generate_frontend_test_script(self):
        """生成前端测试脚本"""
        print("📜 生成前端测试脚本...")
        
        test_script = """
// D3.js + Neo4j 集成测试脚本
// 在浏览器控制台中运行此脚本来测试可视化功能

console.log('🧪 开始D3.js + Neo4j集成测试...');

// 1. 检查D3.js是否加载
if (typeof d3 === 'undefined') {
    console.error('❌ D3.js未加载');
} else {
    console.log('✅ D3.js已加载，版本:', d3.version);
}

// 2. 检查D3RelationGraph组件是否加载
if (typeof D3RelationGraph === 'undefined') {
    console.error('❌ D3RelationGraph组件未加载');
} else {
    console.log('✅ D3RelationGraph组件已加载');
}

// 3. 测试后端API连接
fetch('/api/neo4j/graph-data')
    .then(response => response.json())
    .then(data => {
        console.log('✅ 后端API连接成功');
        console.log('📊 图形数据:', data);
        
        // 4. 创建测试可视化
        const container = document.createElement('div');
        container.id = 'test-d3-graph';
        container.style.cssText = 'width: 800px; height: 600px; border: 1px solid #ccc; margin: 20px;';
        document.body.appendChild(container);
        
        const graph = new D3RelationGraph('test-d3-graph', {
            width: 800,
            height: 600
        });
        
        graph.loadData(data);
        console.log('✅ D3.js可视化测试完成');
        
        // 保存全局引用
        window.testGraph = graph;
        console.log('💡 可以通过 window.testGraph 访问图形实例');
    })
    .catch(error => {
        console.error('❌ 后端API连接失败:', error);
    });
"""
        
        # 保存到文件
        script_path = Path(__file__).parent / "frontend_test_script.js"
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(test_script)
        
        print(f"✅ 前端测试脚本已保存到: {script_path}")
        return True
    
    def run_integration_test(self):
        """运行完整的集成测试"""
        print("🚀 开始D3.js + Neo4j集成测试")
        print("="*60)
        
        # 1. 检查后端服务
        if not self.check_backend_status():
            print("❌ 后端服务未启动，请先运行 start_neo4j_d3_server.py")
            return False
        
        print("✅ 后端服务运行正常")
        
        # 2. 创建测试数据
        self.create_test_nodes()
        time.sleep(1)  # 给数据库一点时间
        self.create_test_relationships()
        
        # 3. 测试API
        time.sleep(2)  # 给数据库一点时间
        api_success = self.test_graph_data_api()
        
        # 4. 生成前端测试脚本
        self.generate_frontend_test_script()
        
        # 5. 打印测试结果
        print("\n" + "="*60)
        print("🎯 集成测试结果")
        print("="*60)
        
        if api_success:
            print("✅ D3.js + Neo4j 集成测试通过")
            print("🌐 请打开 http://localhost:3000 查看前端效果")
            print("📋 在浏览器控制台运行 frontend_test_script.js 进行前端测试")
        else:
            print("❌ 集成测试失败，请检查Neo4j连接和数据")
        
        print("="*60)
        return api_success

def main():
    """主函数"""
    tester = D3Neo4jTester()
    success = tester.run_integration_test()
    
    if success:
        print("🎉 集成测试完成！")
    else:
        print("💥 集成测试失败！")

if __name__ == "__main__":
    main()

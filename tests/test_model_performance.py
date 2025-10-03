#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
模型性能测试脚本
测试不同模型在Cypher翻译任务上的响应时间和准确性

环境配置说明：
1. 复制 .env.example 为 .env
2. 配置以下API密钥：
   - DEEPSEEK_API_KEY=your_deepseek_api_key
   - DASHSCOPE_API_KEY=your_dashscope_api_key
3. 运行: python tests/test_model_performance.py
"""

import os
import time
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Tuple
import sys

# 添加项目根目录到路径
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# 尝试加载.env文件
try:
    from dotenv import load_dotenv
    env_file = PROJECT_ROOT / '.env'
    if env_file.exists():
        load_dotenv(env_file)
        print(f"✅ 已加载环境配置: {env_file}")
    else:
        print(f"⚠️ 未找到.env文件: {env_file}")
        print(f"   请复制 .env.example 为 .env 并配置API密钥")
except ImportError:
    print("⚠️ python-dotenv未安装，将直接读取环境变量")
    print("   提示: pip install python-dotenv")

try:
    from autogen_ext.models import load_model
    AUTOGEN_AVAILABLE = True
except ImportError:
    AUTOGEN_AVAILABLE = False
    print("⚠️ autogen_ext未安装，将使用直接API调用")

import requests

class ModelPerformanceTester:
    """模型性能测试器"""
    
    def __init__(self):
        self.check_environment()
        
        self.test_queries = [
            "显示张三负责的所有任务",
            "找出项目管理系统包含的任务",
            "统计有多少个任务",
            "显示任务A依赖的所有任务",
            "找出所有高优先级的任务",
        ]
        
        self.expected_patterns = [
            "MATCH.*Person.*name.*张三.*ASSIGNED_TO.*Task.*RETURN",
            "MATCH.*Project.*name.*项目管理系统.*CONTAINS.*Task.*RETURN",
            "MATCH.*Task.*count",
            "MATCH.*Task.*name.*任务A.*DEPENDS_ON.*Task.*RETURN",
            "MATCH.*Task.*WHERE.*priority.*HIGH.*RETURN",
        ]
        
        self.system_prompt = """你是一个Neo4j Cypher查询专家。

数据库结构：
- 节点类型：Project（项目）, Task（任务）, Person（人员）, Resource（资源）, Milestone（里程碑）
- 关系类型：CONTAINS（包含）, DEPENDS_ON（依赖）, ASSIGNED_TO（分配给）, MANAGES（管理）, USES（使用）

任务：将用户的自然语言查询转换为精确的Cypher查询语句。

要求：
1. 只输出Cypher语句，不要解释
2. 使用MATCH、WHERE、RETURN等标准语法
3. 节点标签首字母大写
4. 关系类型全大写

示例：
用户："显示张三负责的所有任务"
Cypher：MATCH (p:Person {name:"张三"})-[:ASSIGNED_TO]->(t:Task) RETURN t

用户："找出项目管理系统包含的任务"
Cypher：MATCH (p:Project {name:"项目管理系统"})-[:CONTAINS]->(t:Task) RETURN t"""
    
    def check_environment(self):
        """检查环境配置"""
        print("\n" + "=" * 80)
        print("🔍 环境配置检查")
        print("=" * 80)
        
        required_keys = {
            'DEEPSEEK_API_KEY': 'DeepSeek模型',
            'DASHSCOPE_API_KEY': 'Qwen模型'
        }
        
        missing_keys = []
        for key, desc in required_keys.items():
            value = os.getenv(key)
            if value:
                masked = value[:8] + '...' + value[-4:] if len(value) > 12 else '***'
                print(f"✅ {key}: {masked} ({desc})")
            else:
                print(f"❌ {key}: 未配置 ({desc})")
                missing_keys.append(key)
        
        if missing_keys:
            print("\n⚠️ 缺少API密钥配置，请按以下步骤配置：")
            print("\n步骤1：创建.env文件")
            print(f"   cd {PROJECT_ROOT}")
            print("   copy .env.example .env  # Windows")
            print("   # 或 cp .env.example .env  # Linux/Mac")
            
            print("\n步骤2：编辑.env文件，添加以下内容：")
            for key in missing_keys:
                print(f"   {key}=your_api_key_here")
            
            print("\n步骤3：获取API密钥")
            print("   DeepSeek: https://platform.deepseek.com/")
            print("   阿里云DashScope: https://dashscope.console.aliyun.com/")
            
            print("\n步骤4：重新运行测试")
            print("   python tests/test_model_performance.py")
            
            print("\n" + "=" * 80)
            
            # 询问是否继续
            try:
                response = input("\n是否继续运行测试？(y/N): ").strip().lower()
                if response != 'y':
                    print("测试已取消")
                    sys.exit(0)
            except KeyboardInterrupt:
                print("\n测试已取消")
                sys.exit(0)
        
        print()

    async def test_deepseek_reasoner(self, query: str) -> Tuple[str, float, bool]:
        """测试DeepSeek Reasoner模型"""
        api_key = os.getenv('DEEPSEEK_API_KEY')
        if not api_key:
            return "❌ API密钥未配置", 0, False
        
        start_time = time.time()
        
        try:
            response = requests.post(
                'https://api.deepseek.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'deepseek-reasoner',
                    'messages': [
                        {'role': 'system', 'content': self.system_prompt},
                        {'role': 'user', 'content': query}
                    ],
                    'temperature': 0.3,
                    'max_tokens': 500
                },
                timeout=30
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                cypher = data['choices'][0]['message']['content'].strip()
                # 清理markdown代码块
                cypher = cypher.replace('```cypher\n', '').replace('```\n', '').replace('```', '')
                success = 'MATCH' in cypher.upper() and 'RETURN' in cypher.upper()
                return cypher, elapsed, success
            else:
                return f"❌ API错误: {response.status_code}", elapsed, False
                
        except Exception as e:
            elapsed = time.time() - start_time
            return f"❌ 异常: {str(e)}", elapsed, False

    async def test_deepseek_chat(self, query: str) -> Tuple[str, float, bool]:
        """测试DeepSeek Chat模型"""
        api_key = os.getenv('DEEPSEEK_API_KEY')
        if not api_key:
            return "❌ API密钥未配置", 0, False
        
        start_time = time.time()
        
        try:
            response = requests.post(
                'https://api.deepseek.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'deepseek-chat',
                    'messages': [
                        {'role': 'system', 'content': self.system_prompt},
                        {'role': 'user', 'content': query}
                    ],
                    'temperature': 0.3,
                    'max_tokens': 500
                },
                timeout=30
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                cypher = data['choices'][0]['message']['content'].strip()
                cypher = cypher.replace('```cypher\n', '').replace('```\n', '').replace('```', '')
                success = 'MATCH' in cypher.upper() and 'RETURN' in cypher.upper()
                return cypher, elapsed, success
            else:
                return f"❌ API错误: {response.status_code}", elapsed, False
                
        except Exception as e:
            elapsed = time.time() - start_time
            return f"❌ 异常: {str(e)}", elapsed, False

    async def test_qwen_turbo(self, query: str) -> Tuple[str, float, bool]:
        """测试Qwen Turbo模型"""
        api_key = os.getenv('DASHSCOPE_API_KEY')
        if not api_key:
            return "❌ API密钥未配置", 0, False
        
        start_time = time.time()
        
        try:
            response = requests.post(
                'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'qwen-turbo-latest',
                    'messages': [
                        {'role': 'system', 'content': self.system_prompt},
                        {'role': 'user', 'content': query}
                    ],
                    'temperature': 0.3,
                    'max_tokens': 500
                },
                timeout=30
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                cypher = data['choices'][0]['message']['content'].strip()
                cypher = cypher.replace('```cypher\n', '').replace('```\n', '').replace('```', '')
                success = 'MATCH' in cypher.upper() and 'RETURN' in cypher.upper()
                return cypher, elapsed, success
            else:
                return f"❌ API错误: {response.status_code}", elapsed, False
                
        except Exception as e:
            elapsed = time.time() - start_time
            return f"❌ 异常: {str(e)}", elapsed, False

    async def run_comprehensive_test(self):
        """运行综合测试"""
        print("=" * 80)
        print("🧪 Neo4j Cypher翻译模型性能测试")
        print("=" * 80)
        print()
        
        models = [
            ('DeepSeek Reasoner', self.test_deepseek_reasoner),
            ('DeepSeek Chat', self.test_deepseek_chat),
            ('Qwen Turbo', self.test_qwen_turbo),
        ]
        
        results = {model_name: [] for model_name, _ in models}
        
        for i, query in enumerate(self.test_queries, 1):
            print(f"\n📝 测试查询 {i}/{len(self.test_queries)}: {query}")
            print("-" * 80)
            
            for model_name, test_func in models:
                print(f"\n🤖 {model_name}:")
                cypher, elapsed, success = await test_func(query)
                
                results[model_name].append({
                    'query': query,
                    'cypher': cypher,
                    'time': elapsed,
                    'success': success
                })
                
                status = "✅" if success else "❌"
                print(f"   状态: {status}")
                print(f"   响应时间: {elapsed:.2f}秒")
                print(f"   生成的Cypher: {cypher[:100]}...")
        
        # 统计结果
        print("\n" + "=" * 80)
        print("📊 测试结果统计")
        print("=" * 80)
        
        for model_name in results:
            model_results = results[model_name]
            success_count = sum(1 for r in model_results if r['success'])
            avg_time = sum(r['time'] for r in model_results) / len(model_results)
            
            print(f"\n🤖 {model_name}:")
            print(f"   成功率: {success_count}/{len(model_results)} ({success_count/len(model_results)*100:.1f}%)")
            print(f"   平均响应时间: {avg_time:.2f}秒")
            print(f"   最快响应: {min(r['time'] for r in model_results):.2f}秒")
            print(f"   最慢响应: {max(r['time'] for r in model_results):.2f}秒")
        
        # 推荐
        print("\n" + "=" * 80)
        print("🎯 推荐结论")
        print("=" * 80)
        
        # 计算综合评分
        scores = {}
        for model_name in results:
            model_results = results[model_name]
            success_rate = sum(1 for r in model_results if r['success']) / len(model_results)
            avg_time = sum(r['time'] for r in model_results) / len(model_results)
            
            # 综合评分：成功率70% + 速度30%（速度越快分数越高）
            speed_score = 1 / (avg_time + 0.1)  # 避免除零
            score = success_rate * 0.7 + (speed_score / 10) * 0.3
            scores[model_name] = score
        
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        for rank, (model_name, score) in enumerate(ranked, 1):
            stars = "⭐" * (4 - rank) if rank <= 3 else ""
            print(f"{rank}. {model_name}: {score:.3f} {stars}")
        
        print(f"\n✅ 推荐使用: {ranked[0][0]}")
        
        # 保存详细结果
        output_file = PROJECT_ROOT / 'tests' / 'model_performance_results.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 详细结果已保存到: {output_file}")

async def main():
    """主函数"""
    tester = ModelPerformanceTester()
    await tester.run_comprehensive_test()

if __name__ == '__main__':
    asyncio.run(main())

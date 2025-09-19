# -*- coding: utf-8 -*-
"""
Agent环境测试脚本 - 自动检查环境变量和运行agent
遵循严格规则：页面UI自动化，无需用户手动执行命令
"""
import os
import sys
import json
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

def load_env_file():
    """自动加载.env文件中的环境变量"""
    env_file = ROOT / ".env"
    if not env_file.exists():
        print("❌ .env文件不存在")
        return False
    
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    os.environ[key] = value
        print("✅ .env文件加载成功")
        return True
    except Exception as e:
        print(f"❌ .env文件加载失败: {e}")
        return False

def check_environment():
    """检查必要的环境变量"""
    print("\n=== 环境变量检查 ===")
    
    required_vars = {
        "DASHSCOPE_API_KEY": "阿里云DashScope API密钥",
        "OPENAI_API_KEY": "OpenAI API密钥（备用）",
    }
    
    missing_vars = []
    for var, desc in required_vars.items():
        value = os.getenv(var)
        if value:
            masked_value = value[:8] + "..." if len(value) > 8 else "***"
            print(f"✅ {var}: {masked_value} ({desc})")
        else:
            print(f"❌ {var}: 未设置 ({desc})")
            missing_vars.append(var)
    
    return len(missing_vars) == 0, missing_vars

def test_agent_config():
    """测试agent配置文件"""
    print("\n=== Agent配置检查 ===")
    
    config_path = ROOT / "data" / "config" / "agents" / "Preprocess_assistant.json"
    if not config_path.exists():
        print(f"❌ Agent配置文件不存在: {config_path}")
        return False, None
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print("✅ Agent配置文件加载成功")
        
        # 检查关键配置
        agent_name = config.get('config', {}).get('name', '未知')
        model = config.get('config', {}).get('model_client', {}).get('config', {}).get('model', '未知')
        base_url = config.get('config', {}).get('model_client', {}).get('config', {}).get('base_url', '未知')
        api_key_env = config.get('config', {}).get('model_client', {}).get('config', {}).get('api_key_env', '未知')
        
        print(f"  Agent名称: {agent_name}")
        print(f"  模型: {model}")
        print(f"  API地址: {base_url}")
        print(f"  API密钥环境变量: {api_key_env}")
        
        return True, config
        
    except Exception as e:
        print(f"❌ Agent配置文件解析失败: {e}")
        return False, None

def test_agent_import():
    """测试AutoGen模块导入"""
    print("\n=== AutoGen模块检查 ===")
    
    try:
        # 测试导入autogen_client模块
        from autogen_client.config_loader import load_agent_json, normalize_agent_config
        from autogen_client.autogen_backends import AutogenAgentBackend
        print("✅ autogen_client模块导入成功")
        return True
    except ImportError as e:
        print(f"❌ autogen_client模块导入失败: {e}")
        try:
            # 尝试直接导入autogen模块
            import autogen_agentchat
            import autogen_ext
            print("✅ 原生autogen模块可用")
            return True
        except ImportError as e2:
            print(f"❌ 原生autogen模块也不可用: {e2}")
            return False

def run_simple_test():
    """运行简单的agent测试"""
    print("\n=== Agent运行测试 ===")
    
    try:
        # 使用通用脚本测试
        from run_universal_agent import UniversalAgentRunner
        
        config_path = "data/config/agents/Preprocess_assistant.json"
        runner = UniversalAgentRunner(config_path, verbose=True)
        
        test_input = "今天开会讨论了项目进度，需要在下周完成功能开发"
        print(f"测试输入: {test_input}")
        
        response = runner.run_once(test_input)
        print(f"Agent响应: {response}")
        
        runner.cleanup()
        return True, response
        
    except Exception as e:
        print(f"❌ Agent运行测试失败: {e}")
        import traceback
        print(traceback.format_exc())
        return False, str(e)

def main():
    """主测试函数 - 自动运行所有检查"""
    print("🤖 Agent环境自动化测试开始")
    print("=" * 50)
    
    # 1. 加载环境变量
    env_loaded = load_env_file()
    
    # 2. 检查环境变量
    env_ok, missing_vars = check_environment()
    
    # 3. 检查配置文件
    config_ok, config = test_agent_config()
    
    # 4. 检查模块导入
    import_ok = test_agent_import()
    
    # 5. 运行测试（如果前面都通过）
    test_ok = False
    response = None
    if env_ok and config_ok and import_ok:
        test_ok, response = run_simple_test()
    
    # 总结报告
    print("\n" + "=" * 50)
    print("📊 测试结果总结")
    print("=" * 50)
    
    print(f"环境变量加载: {'✅ 成功' if env_loaded else '❌ 失败'}")
    print(f"环境变量检查: {'✅ 通过' if env_ok else '❌ 失败'}")
    if not env_ok:
        print(f"  缺失变量: {', '.join(missing_vars)}")
    
    print(f"配置文件检查: {'✅ 通过' if config_ok else '❌ 失败'}")
    print(f"模块导入检查: {'✅ 通过' if import_ok else '❌ 失败'}")
    print(f"Agent运行测试: {'✅ 成功' if test_ok else '❌ 失败'}")
    
    if test_ok:
        print("\n🎉 所有测试通过！Agent可以正常运行")
        print("现在可以集成到笔记页面了")
    else:
        print("\n⚠️  存在问题需要解决:")
        if not env_loaded:
            print("- 请检查.env文件是否存在")
        if not env_ok:
            print("- 请在.env文件中设置缺失的环境变量")
        if not config_ok:
            print("- 请检查Agent配置文件")
        if not import_ok:
            print("- 请检查AutoGen模块安装")
        if not test_ok and env_ok and config_ok and import_ok:
            print("- Agent运行时出现错误，请检查配置和网络")
    
    return test_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

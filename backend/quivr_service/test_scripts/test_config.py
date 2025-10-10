"""
测试配置加载
验证模型配置是否正确加载
"""
import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    PROJECT_ROOT,
    MODEL_CONFIG_DIR,
    VECTOR_DB_CONFIG,
    AVAILABLE_MODELS,
    load_model_config,
    get_llm_config,
    get_embedding_config
)


def test_project_structure():
    """测试项目结构"""
    print("=== 测试1：项目结构 ===")
    print(f"✓ 项目根目录: {PROJECT_ROOT}")
    print(f"✓ 模型配置目录: {MODEL_CONFIG_DIR}")
    print(f"✓ 向量数据库目录: {VECTOR_DB_CONFIG['persist_directory']}")
    
    # 检查目录是否存在
    assert MODEL_CONFIG_DIR.exists(), f"模型配置目录不存在: {MODEL_CONFIG_DIR}"
    print("✅ 项目结构测试通过\n")


def test_model_configs():
    """测试模型配置文件"""
    print("=== 测试2：模型配置文件 ===")
    
    for model_name in AVAILABLE_MODELS:
        try:
            config = load_model_config(model_name)
            print(f"✓ {model_name}: 配置加载成功")
            print(f"  - 模型: {config['config']['model']}")
            print(f"  - Base URL: {config['config']['base_url']}")
            print(f"  - API Key环境变量: {config['config'].get('api_key_env', 'N/A')}")
        except Exception as e:
            print(f"✗ {model_name}: 配置加载失败 - {e}")
    
    print("✅ 模型配置文件测试完成\n")


def test_llm_config():
    """测试LLM配置"""
    print("=== 测试3：LLM配置 ===")
    
    try:
        config = get_llm_config()
        print(f"✓ LLM配置加载成功")
        print(f"  - 模型: {config['model']}")
        print(f"  - Base URL: {config['base_url']}")
        print(f"  - API Key: {'已设置 ✓' if config['api_key'] else '未设置 ✗'}")
        print(f"  - Temperature: {config['temperature']}")
        print(f"  - Max Tokens: {config['max_tokens']}")
        print("✅ LLM配置测试通过\n")
        return True
    except Exception as e:
        print(f"✗ LLM配置加载失败: {e}")
        print("⚠️  请设置环境变量 DASHSCOPE_API_KEY\n")
        return False


def test_embedding_config():
    """测试嵌入模型配置"""
    print("=== 测试4：嵌入模型配置 ===")
    
    try:
        config = get_embedding_config()
        print(f"✓ 嵌入模型配置加载成功")
        print(f"  - 模型: {config['model']}")
        print(f"  - Base URL: {config['base_url']}")
        print(f"  - API Key: {'已设置 ✓' if config['api_key'] else '未设置 ✗'}")
        print("✅ 嵌入模型配置测试通过\n")
        return True
    except Exception as e:
        print(f"✗ 嵌入模型配置加载失败: {e}")
        print("⚠️  请设置环境变量 DASHSCOPE_API_KEY\n")
        return False


def main():
    """主测试函数"""
    print("=" * 60)
    print("Quivr服务配置测试")
    print("=" * 60)
    print()
    
    # 运行所有测试
    test_project_structure()
    test_model_configs()
    llm_ok = test_llm_config()
    embedding_ok = test_embedding_config()
    
    # 总结
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    
    if llm_ok and embedding_ok:
        print("✅ 所有配置测试通过！可以开始下一步。")
        print("\n下一步：")
        print("1. 复制 env.example 为 .env")
        print("2. 在 .env 中填入真实的 API Key")
        print("3. 运行: python test_scripts/test_api_connection.py")
    else:
        print("⚠️  部分配置测试失败")
        print("\n请执行以下步骤：")
        print("1. 复制 env.example 为 .env")
        print("2. 在 .env 中填入真实的 DASHSCOPE_API_KEY")
        print("3. 重新运行此测试")


if __name__ == "__main__":
    main()

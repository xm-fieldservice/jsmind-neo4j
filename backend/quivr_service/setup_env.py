"""
环境变量设置辅助脚本
从项目根目录的 .env 读取API Key并设置到 backend/quivr_service/.env
"""
import os
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent
ROOT_ENV_FILE = PROJECT_ROOT / ".env"
SERVICE_ENV_FILE = Path(__file__).parent / ".env"

def read_env_value(env_file: Path, key: str) -> str:
    """从.env文件读取指定key的值"""
    if not env_file.exists():
        return None
    
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith(key + '='):
                return line.split('=', 1)[1].strip()
    return None

def update_env_file(env_file: Path, key: str, value: str):
    """更新.env文件中的key值"""
    if not env_file.exists():
        print(f"❌ 文件不存在: {env_file}")
        return False
    
    lines = []
    updated = False
    
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip().startswith(key + '='):
                lines.append(f"{key}={value}\n")
                updated = True
            else:
                lines.append(line)
    
    if not updated:
        # 如果没有找到该key，添加到文件末尾
        lines.append(f"\n{key}={value}\n")
    
    with open(env_file, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    return True

def main():
    """主函数"""
    print("=" * 60)
    print("环境变量设置辅助脚本")
    print("=" * 60)
    print()
    
    # 检查根目录的.env文件
    if not ROOT_ENV_FILE.exists():
        print(f"❌ 项目根目录的 .env 文件不存在: {ROOT_ENV_FILE}")
        print("请先在项目根目录创建 .env 文件并填入API Key")
        return
    
    print(f"✓ 找到项目根目录的 .env 文件: {ROOT_ENV_FILE}")
    
    # 读取API Keys
    api_keys = {
        'DASHSCOPE_API_KEY': read_env_value(ROOT_ENV_FILE, 'DASHSCOPE_API_KEY'),
        'DEEPSEEK_API_KEY': read_env_value(ROOT_ENV_FILE, 'DEEPSEEK_API_KEY'),
        'MOONSHOT_API_KEY': read_env_value(ROOT_ENV_FILE, 'MOONSHOT_API_KEY'),
    }
    
    print("\n从项目根目录读取到的API Keys:")
    for key, value in api_keys.items():
        if value:
            # 只显示前10个字符
            masked_value = value[:10] + "..." if len(value) > 10 else value
            print(f"  ✓ {key}: {masked_value}")
        else:
            print(f"  ✗ {key}: 未设置")
    
    # 检查服务的.env文件
    if not SERVICE_ENV_FILE.exists():
        print(f"\n❌ 服务的 .env 文件不存在: {SERVICE_ENV_FILE}")
        print("请先运行: copy env.example .env")
        return
    
    print(f"\n✓ 找到服务的 .env 文件: {SERVICE_ENV_FILE}")
    
    # 更新服务的.env文件
    print("\n开始更新服务的 .env 文件...")
    updated_count = 0
    
    for key, value in api_keys.items():
        if value:
            if update_env_file(SERVICE_ENV_FILE, key, value):
                print(f"  ✓ 已更新 {key}")
                updated_count += 1
            else:
                print(f"  ✗ 更新失败 {key}")
    
    print("\n" + "=" * 60)
    print(f"✅ 成功更新 {updated_count} 个API Key")
    print("=" * 60)
    print("\n下一步：运行配置测试")
    print("  python test_scripts/test_config.py")

if __name__ == "__main__":
    main()

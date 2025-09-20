#!/usr/bin/env python3
"""
Neo4j配置检查工具
快速验证Neo4j连接配置是否正确
"""

import os
import sys
from pathlib import Path

def project_root():
    return Path(__file__).resolve().parents[1]

def check_neo4j_config():
    """检查Neo4j配置"""
    print("🔍 Neo4j配置检查工具")
    print("="*50)
    
    # 检查.env文件
    env_file = project_root() / '.env'
    template_file = project_root() / 'neo4j_config_template.env'
    
    if not env_file.exists():
        if template_file.exists():
            print("❌ 未找到.env配置文件")
            print(f"💡 请复制配置模板: copy {template_file.name} .env")
            print("   然后编辑.env文件中的Neo4j连接信息")
            return False
        else:
            print("❌ 未找到配置文件和模板")
            return False
    
    print("✅ 找到.env配置文件")
    
    # 检查环境变量
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
    except ImportError:
        print("⚠️ 未安装python-dotenv，使用系统环境变量")
    
    neo4j_uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
    neo4j_password = os.getenv('NEO4J_PASSWORD', '')
    
    print(f"📋 Neo4j配置信息:")
    print(f"   URI: {neo4j_uri}")
    print(f"   用户: {neo4j_user}")
    print(f"   密码: {'*' * len(neo4j_password) if neo4j_password else '未设置'}")
    
    # 检查Neo4j依赖
    try:
        import neo4j
        print(f"✅ Neo4j驱动已安装 (版本: {neo4j.__version__})")
    except ImportError:
        print("❌ Neo4j驱动未安装")
        print("💡 安装命令: pip install neo4j")
        return False
    
    # 测试连接
    print("\n🔌 测试Neo4j连接...")
    try:
        sys.path.insert(0, str(project_root()))
        from backend.app.database import get_neo4j_driver
        
        driver = get_neo4j_driver()
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            if result.single():
                print("✅ Neo4j连接成功！")
                
                # 获取数据库信息
                db_info = session.run("CALL dbms.components() YIELD name, versions, edition")
                for record in db_info:
                    print(f"   数据库: {record['name']} {record['versions'][0]} ({record['edition']})")
                
                return True
                
    except Exception as e:
        print(f"❌ Neo4j连接失败: {e}")
        print("\n🛠️ 故障排除建议:")
        print("1. 确保Neo4j服务已启动")
        print("2. 检查连接URI是否正确")
        print("3. 验证用户名和密码")
        print("4. 确认防火墙设置")
        return False

def main():
    """主函数"""
    success = check_neo4j_config()
    
    if success:
        print("\n🎉 Neo4j配置检查通过！")
        print("💡 现在可以运行: python tools/start.py --neo4j")
    else:
        print("\n❌ Neo4j配置检查失败")
        print("💡 请根据上述建议修复配置后重试")
        sys.exit(1)

if __name__ == "__main__":
    main()

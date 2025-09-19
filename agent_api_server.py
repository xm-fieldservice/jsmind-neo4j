# -*- coding: utf-8 -*-
"""
Agent API服务器 - 为笔记栏提供Agent调用接口
遵循严格规则：通过页面UI自动启动，无需用户手动执行命令
"""
import os
import sys
import json
import asyncio
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

# 项目根目录
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# 自动加载环境变量
def load_env_file():
    env_file = ROOT / ".env"
    if env_file.exists():
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
        except Exception as e:
            print(f"⚠️ .env文件加载失败: {e}")

# 加载环境变量
load_env_file()

app = Flask(__name__)
CORS(app)  # 允许跨域请求

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "ok",
        "service": "agent_api_server",
        "timestamp": str(Path(__file__).stat().st_mtime)
    })

@app.route('/api/agent/run', methods=['POST'])
def run_agent():
    """运行Agent接口"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "请求数据为空"}), 400
        
        agent_config = data.get('agent_config')
        user_input = data.get('user_input')
        agent_type = data.get('agent_type', 'agent')
        
        if not agent_config or not user_input:
            return jsonify({"error": "缺少必要参数"}), 400
        
        print(f"[API] 收到请求: {agent_type}, 输入长度: {len(user_input)}")
        
        # 使用外部脚本运行Agent - 严格遵循规则：不得自定义运行机制
        try:
            import subprocess
            import tempfile
            
            # 创建临时配置文件
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
                json.dump(agent_config, f, ensure_ascii=False, indent=2)
                temp_config_path = f.name
            
            try:
                # 调用外部脚本 - 使用我们的通用脚本
                cmd = [
                    'python', 
                    str(ROOT / 'run_universal_agent.py'),
                    '-c', temp_config_path,
                    '-i', user_input
                ]
                
                print(f"[API] 执行命令: {' '.join(cmd)}")
                
                # 运行外部脚本
                result = subprocess.run(
                    cmd,
                    cwd=str(ROOT),
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    timeout=60  # 60秒超时
                )
                
                if result.returncode == 0:
                    # 成功执行
                    response = result.stdout.strip()
                    
                    print(f"[API] 脚本执行成功，响应长度: {len(response)}")
                    
                    return jsonify({
                        "success": True,
                        "response": response,
                        "agent_type": agent_type,
                        "timestamp": str(Path(__file__).stat().st_mtime)
                    })
                else:
                    # 执行失败
                    error_msg = result.stderr.strip() if result.stderr else "脚本执行失败"
                    print(f"[API] 脚本执行失败: {error_msg}")
                    
                    return jsonify({
                        "error": f"脚本执行失败: {error_msg}",
                        "suggestion": "请检查配置文件和环境变量"
                    }), 500
                    
            finally:
                # 清理临时文件
                try:
                    Path(temp_config_path).unlink()
                except:
                    pass
            
        except ImportError as e:
            return jsonify({
                "error": f"Agent模块导入失败: {e}",
                "suggestion": "请检查AutoGen模块是否正确安装"
            }), 500
            
        except Exception as e:
            return jsonify({
                "error": f"Agent运行失败: {e}",
                "suggestion": "请检查配置文件和环境变量"
            }), 500
            
    except Exception as e:
        return jsonify({"error": f"服务器内部错误: {e}"}), 500

@app.route('/api/agent/test', methods=['GET'])
def test_agent_env():
    """测试Agent环境接口"""
    try:
        result = {
            "env_vars": {},
            "modules": {},
            "config_files": {}
        }
        
        # 检查环境变量
        env_vars = ["DASHSCOPE_API_KEY", "OPENAI_API_KEY"]
        for var in env_vars:
            value = os.getenv(var)
            result["env_vars"][var] = {
                "exists": bool(value),
                "length": len(value) if value else 0
            }
        
        # 检查模块
        try:
            import autogen_agentchat
            result["modules"]["autogen_agentchat"] = True
        except ImportError:
            result["modules"]["autogen_agentchat"] = False
            
        try:
            import autogen_ext
            result["modules"]["autogen_ext"] = True
        except ImportError:
            result["modules"]["autogen_ext"] = False
        
        # 检查配置文件
        config_path = ROOT / "data" / "config" / "agents" / "Preprocess_assistant.json"
        result["config_files"]["Preprocess_assistant"] = config_path.exists()
        
        return jsonify({
            "success": True,
            "result": result,
            "timestamp": str(Path(__file__).stat().st_mtime)
        })
        
    except Exception as e:
        return jsonify({"error": f"环境测试失败: {e}"}), 500

def main():
    """主函数 - 自动启动服务器"""
    print("🤖 Agent API服务器启动中...")
    print(f"项目根目录: {ROOT}")
    
    # 检查端口是否被占用
    import socket
    port = 8081
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(('localhost', port)) == 0:
            print(f"⚠️ 端口 {port} 已被占用，尝试使用其他端口")
            port = 8082
    
    print(f"🚀 服务器将在端口 {port} 启动")
    print(f"📡 API地址: http://127.0.0.1:{port}")
    print(f"🔍 健康检查: http://127.0.0.1:{port}/health")
    print(f"🤖 Agent测试: http://127.0.0.1:{port}/api/agent/test")
    
    try:
        app.run(host='127.0.0.1', port=port, debug=False)
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()

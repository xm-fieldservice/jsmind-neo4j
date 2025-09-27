#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Registry后端服务 - 8081端口
提供注册表管理API，支持前端Registry系统
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 配置
REGISTRY_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'mindmap_registry.json')

def load_registry():
    """加载注册表数据"""
    try:
        if os.path.exists(REGISTRY_PATH):
            with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            # 创建默认注册表
            default_registry = {
                "version": "1.0",
                "last_updated": datetime.now().isoformat(),
                "entries": []
            }
            save_registry(default_registry)
            return default_registry
    except Exception as e:
        logger.error(f'加载注册表失败: {e}')
        return {"version": "1.0", "last_updated": datetime.now().isoformat(), "entries": []}

def save_registry(data):
    """保存注册表数据"""
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
        
        # 更新时间戳
        data['last_updated'] = datetime.now().isoformat()
        
        with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f'注册表保存成功: {REGISTRY_PATH}')
        return True
    except Exception as e:
        logger.error(f'保存注册表失败: {e}')
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'service': 'registry-server',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/registry/get', methods=['GET'])
def get_registry():
    """获取注册表"""
    try:
        registry = load_registry()
        return jsonify({
            'success': True,
            'data': registry
        })
    except Exception as e:
        logger.error(f'获取注册表失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/registry/save', methods=['POST'])
def save_registry_endpoint():
    """保存注册表"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': '无效的JSON数据'
            }), 400
        
        success = save_registry(data)
        if success:
            return jsonify({
                'success': True,
                'message': '注册表保存成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': '保存失败'
            }), 500
            
    except Exception as e:
        logger.error(f'保存注册表失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/registry/add', methods=['POST'])
def add_registry_entry():
    """添加注册表条目"""
    try:
        entry = request.get_json()
        if not entry:
            return jsonify({
                'success': False,
                'error': '无效的条目数据'
            }), 400
        
        registry = load_registry()
        
        # 添加时间戳
        entry['created_at'] = datetime.now().isoformat()
        entry['updated_at'] = datetime.now().isoformat()
        
        registry['entries'].append(entry)
        
        success = save_registry(registry)
        if success:
            return jsonify({
                'success': True,
                'message': '条目添加成功',
                'entry': entry
            })
        else:
            return jsonify({
                'success': False,
                'error': '保存失败'
            }), 500
            
    except Exception as e:
        logger.error(f'添加条目失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/agent/run', methods=['POST'])
def run_agent():
    """代理运行接口（兼容性）"""
    try:
        data = request.get_json()
        # 这里可以添加实际的代理运行逻辑
        return jsonify({
            'success': True,
            'result': 'Agent运行成功',
            'data': data
        })
    except Exception as e:
        logger.error(f'代理运行失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    logger.info('启动Registry后端服务...')
    logger.info(f'注册表文件路径: {REGISTRY_PATH}')
    app.run(host='0.0.0.0', port=8081, debug=True)

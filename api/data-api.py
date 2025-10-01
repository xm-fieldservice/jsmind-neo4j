#!/usr/bin/env python3
"""
JSON数据底座API
提供数据的读取和保存接口
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 数据文件路径
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'nodes.json')

@app.route('/api/data', methods=['GET'])
def get_data():
    """获取JSON数据底座"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data), 200
        else:
            # 返回空数据结构
            return jsonify({
                "meta": {
                    "version": "2.0",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "total_nodes": 0,
                    "description": "项目管理数据底座"
                },
                "nodes": [],
                "indexes": {
                    "by_tag": {},
                    "by_date": {},
                    "root_nodes": []
                }
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data', methods=['POST'])
def save_data():
    """保存JSON数据底座"""
    try:
        data = request.get_json()
        
        # 确保目录存在
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        
        # 保存到文件
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"[API] 数据已保存: {data['meta']['total_nodes']} 个节点")
        
        return jsonify({
            "success": True,
            "message": "数据保存成功",
            "total_nodes": data['meta']['total_nodes']
        }), 200
        
    except Exception as e:
        print(f"[API] 保存失败: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/node/<node_id>', methods=['GET'])
def get_node(node_id):
    """获取单个节点"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 查找节点
        node = next((n for n in data['nodes'] if n['id'] == node_id), None)
        
        if node:
            return jsonify({
                "found": True,
                "data": node
            }), 200
        else:
            return jsonify({
                "found": False,
                "message": "节点不存在"
            }), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/stats', methods=['GET'])
def get_stats():
    """获取统计信息"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            "total_nodes": len(data['nodes']),
            "total_tags": len(data['indexes']['by_tag']),
            "total_dates": len(data['indexes']['by_date']),
            "root_nodes": len(data['indexes']['root_nodes']),
            "last_updated": data['meta']['updated_at']
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("  JSON数据底座API服务")
    print("=" * 60)
    print(f"  数据文件: {DATA_FILE}")
    print(f"  API地址: http://localhost:5000/api/data")
    print("=" * 60)
    print()
    app.run(host='0.0.0.0', port=5000, debug=True)

"""
JSON底座API服务
提供JSON文件的读写接口，支持统一存储系统
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import shutil
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 配置
JSON_BASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'all_mindmaps.json')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'backups')

def ensure_backup_dir():
    """确保备份目录存在"""
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

def create_backup():
    """创建JSON底座备份"""
    try:
        ensure_backup_dir()
        if os.path.exists(JSON_BASE_PATH):
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_path = os.path.join(BACKUP_DIR, f'all_mindmaps_backup_{timestamp}.json')
            shutil.copy2(JSON_BASE_PATH, backup_path)
            logger.info(f'备份创建成功: {backup_path}')
            return backup_path
    except Exception as e:
        logger.error(f'创建备份失败: {e}')
    return None

def validate_json_structure(data):
    """验证JSON结构"""
    required_fields = ['export_time', 'total_count', 'mindmaps']
    
    for field in required_fields:
        if field not in data:
            return False, f'缺少必需字段: {field}'
    
    if not isinstance(data['mindmaps'], list):
        return False, 'mindmaps字段必须是数组'
    
    # 验证脑图数据格式
    for i, mindmap in enumerate(data['mindmaps']):
        if 'id' not in mindmap:
            return False, f'mindmaps[{i}] 缺少id字段'
        if 'data' not in mindmap or 'format' not in mindmap['data']:
            return False, f'mindmaps[{i}] 缺少data.format字段'
    
    return True, 'OK'

@app.route('/api/save-json-base', methods=['POST'])
def save_json_base():
    """保存JSON底座数据"""
    try:
        request_data = request.get_json()
        
        if not request_data:
            return jsonify({'success': False, 'error': '请求数据为空'}), 400
        
        file_path = request_data.get('filePath', 'data/all_mindmaps.json')
        json_data = request_data.get('data')
        
        if not json_data:
            return jsonify({'success': False, 'error': '缺少JSON数据'}), 400
        
        # 验证JSON结构
        is_valid, error_msg = validate_json_structure(json_data)
        if not is_valid:
            return jsonify({'success': False, 'error': f'JSON结构验证失败: {error_msg}'}), 400
        
        # 创建备份
        backup_path = create_backup()
        
        # 保存到指定路径
        target_path = os.path.join(os.path.dirname(__file__), '..', file_path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f'JSON底座保存成功: {target_path}')
        
        return jsonify({
            'success': True,
            'message': 'JSON底座保存成功',
            'backup_path': backup_path,
            'timestamp': json_data['export_time']
        })
        
    except Exception as e:
        logger.error(f'保存JSON底座失败: {e}')
        return jsonify({
            'success': False,
            'error': f'保存失败: {str(e)}'
        }), 500

@app.route('/api/sync-mindmap', methods=['POST'])
def sync_mindmap():
    """增量同步单个脑图到JSON底座"""
    try:
        request_data = request.get_json()
        
        if not request_data:
            return jsonify({'success': False, 'error': '请求数据为空'}), 400
        
        mindmap_data = request_data.get('mindmap')
        sync_mode = request_data.get('sync_mode', 'incremental')
        
        if not mindmap_data:
            return jsonify({'success': False, 'error': '缺少脑图数据'}), 400
        
        # 加载现有JSON底座
        if os.path.exists(JSON_BASE_PATH):
            with open(JSON_BASE_PATH, 'r', encoding='utf-8') as f:
                json_base = json.load(f)
        else:
            # 创建新的JSON底座结构
            json_base = {
                'export_time': datetime.now().isoformat(),
                'total_count': 0,
                'mindmaps': []
            }
        
        # 查找现有脑图
        mindmap_id = mindmap_data.get('id')
        existing_index = -1
        
        for i, existing_mindmap in enumerate(json_base['mindmaps']):
            if existing_mindmap.get('id') == mindmap_id:
                existing_index = i
                break
        
        # 更新或添加脑图
        if existing_index >= 0:
            # 更新现有脑图
            json_base['mindmaps'][existing_index] = mindmap_data
            logger.info(f'更新脑图: {mindmap_id}')
        else:
            # 添加新脑图
            json_base['mindmaps'].append(mindmap_data)
            logger.info(f'添加新脑图: {mindmap_id}')
        
        # 更新元数据
        json_base['export_time'] = datetime.now().isoformat()
        json_base['total_count'] = len(json_base['mindmaps'])
        
        # 创建备份（仅在有实际变更时）
        backup_path = create_backup()
        
        # 保存更新后的JSON底座
        with open(JSON_BASE_PATH, 'w', encoding='utf-8') as f:
            json.dump(json_base, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': f'脑图增量同步成功: {mindmap_data.get("name", mindmap_id)}',
            'sync_mode': sync_mode,
            'mindmap_id': mindmap_id,
            'total_count': json_base['total_count'],
            'backup_path': backup_path
        })
        
    except Exception as e:
        logger.error(f'增量同步失败: {e}')
        return jsonify({
            'success': False,
            'error': f'同步失败: {str(e)}'
        }), 500

@app.route('/api/load-json-base', methods=['GET'])
def load_json_base():
    """加载JSON底座数据"""
    try:
        if not os.path.exists(JSON_BASE_PATH):
            return jsonify({'success': False, 'error': 'JSON底座文件不存在'}), 404
        
        with open(JSON_BASE_PATH, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        return jsonify({
            'success': True,
            'data': json_data
        })
        
    except Exception as e:
        logger.error(f'加载JSON底座失败: {e}')
        return jsonify({
            'success': False,
            'error': f'加载失败: {str(e)}'
        }), 500

@app.route('/api/json-base-status', methods=['GET'])
def get_json_base_status():
    """获取JSON底座状态"""
    try:
        status = {
            'exists': os.path.exists(JSON_BASE_PATH),
            'size': 0,
            'last_modified': None,
            'backup_count': 0
        }
        
        if status['exists']:
            stat = os.stat(JSON_BASE_PATH)
            status['size'] = stat.st_size
            status['last_modified'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
        
        # 统计备份文件数量
        if os.path.exists(BACKUP_DIR):
            backup_files = [f for f in os.listdir(BACKUP_DIR) if f.startswith('all_mindmaps_backup_')]
            status['backup_count'] = len(backup_files)
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        logger.error(f'获取JSON底座状态失败: {e}')
        return jsonify({
            'success': False,
            'error': f'获取状态失败: {str(e)}'
        }), 500

@app.route('/api/restore-backup', methods=['POST'])
def restore_backup():
    """从备份恢复JSON底座"""
    try:
        request_data = request.get_json()
        backup_filename = request_data.get('backup_filename')
        
        if not backup_filename:
            return jsonify({'success': False, 'error': '缺少备份文件名'}), 400
        
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        if not os.path.exists(backup_path):
            return jsonify({'success': False, 'error': '备份文件不存在'}), 404
        
        # 创建当前文件的备份
        current_backup = create_backup()
        
        # 恢复备份
        shutil.copy2(backup_path, JSON_BASE_PATH)
        
        logger.info(f'从备份恢复成功: {backup_path}')
        
        return jsonify({
            'success': True,
            'message': '从备份恢复成功',
            'current_backup': current_backup
        })
        
    except Exception as e:
        logger.error(f'从备份恢复失败: {e}')
        return jsonify({
            'success': False,
            'error': f'恢复失败: {str(e)}'
        }), 500

@app.route('/api/list-backups', methods=['GET'])
def list_backups():
    """列出所有备份文件"""
    try:
        backups = []
        
        if os.path.exists(BACKUP_DIR):
            for filename in os.listdir(BACKUP_DIR):
                if filename.startswith('all_mindmaps_backup_') and filename.endswith('.json'):
                    file_path = os.path.join(BACKUP_DIR, filename)
                    stat = os.stat(file_path)
                    
                    backups.append({
                        'filename': filename,
                        'size': stat.st_size,
                        'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        
        # 按创建时间倒序排列
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'backups': backups
        })
        
    except Exception as e:
        logger.error(f'列出备份失败: {e}')
        return jsonify({
            'success': False,
            'error': f'列出备份失败: {str(e)}'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'service': 'JSON底座API',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    logger.info('启动JSON底座API服务...')
    app.run(host='0.0.0.0', port=5001, debug=True)

# agent-后端Agent API扩展设计

## 📋 概述

本文档详细说明如何在现有的`registry_server.py`中增强`/api/agent/run`端点，以支持完整的Autogen Agent集成。

## 🏗️ 现有代码分析

### 当前状态
```python
# backend/registry_server.py (现有代码)
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
```

### 问题识别
1. **功能简单**: 当前只是返回固定响应，没有实际Agent处理逻辑
2. **缺少验证**: 没有请求数据验证
3. **无错误处理**: 简单的异常捕获，缺少具体错误分类
4. **无状态管理**: 没有Agent状态跟踪和队列管理

## 🔧 扩展方案

### 1. 增强的Agent运行端点

```python
# 新的 /api/agent/run 端点设计
@app.route('/api/agent/run', methods=['POST'])
def run_agent():
    """
    运行Autogen Agent处理脑图节点请求
    支持多种意图：扩展、总结、分析、生成、优化
    """
    try:
        # 1. 请求验证
        data = request.get_json()
        validation_result = validate_agent_request(data)
        if not validation_result['valid']:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': validation_result['error']
                }
            }), 400
        
        # 2. 生成请求ID
        request_id = generate_request_id()
        
        # 3. 记录请求开始
        logger.info(f'Agent请求开始: {request_id}')
        
        # 4. 调用Python Autogen Agent
        agent_result = call_python_autogen_agent(data, request_id)
        
        # 5. 返回处理结果
        return jsonify({
            'success': True,
            'request_id': request_id,
            'result': agent_result['result'],
            'metadata': agent_result['metadata'],
            'error': None
        })
        
    except AgentTimeoutError as e:
        logger.error(f'Agent处理超时: {request_id}, {e}')
        return jsonify({
            'success': False,
            'request_id': request_id,
            'result': None,
            'metadata': {'processing_time': 30.0},
            'error': {
                'code': 'AGENT_TIMEOUT',
                'message': 'Agent处理超时',
                'details': str(e)
            }
        }), 504
        
    except AgentUnavailableError as e:
        logger.error(f'Agent服务不可用: {request_id}, {e}')
        return jsonify({
            'success': False,
            'request_id': request_id,
            'result': None,
            'metadata': {'processing_time': 0.1},
            'error': {
                'code': 'AGENT_UNAVAILABLE',
                'message': 'Agent服务暂时不可用',
                'details': str(e)
            }
        }), 503
        
    except Exception as e:
        logger.error(f'Agent处理异常: {request_id}, {e}')
        return jsonify({
            'success': False,
            'request_id': request_id,
            'result': None,
            'metadata': {'processing_time': 0.1},
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': '内部服务器错误',
                'details': str(e)
            }
        }), 500
```

### 2. 新增Agent状态查询端点

```python
@app.route('/api/agent/status', methods=['GET'])
def get_agent_status():
    """获取Agent服务状态"""
    try:
        status = get_agent_service_status()
        return jsonify({
            'success': True,
            'status': status
        })
    except Exception as e:
        logger.error(f'获取Agent状态失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

### 3. 新增Agent历史记录端点

```python
@app.route('/api/agent/history', methods=['GET'])
def get_agent_history():
    """获取Agent操作历史记录"""
    try:
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        history = get_agent_history_records(limit, offset)
        
        return jsonify({
            'success': True,
            'history': history,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': len(history)
            }
        })
    except Exception as e:
        logger.error(f'获取Agent历史失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

## 🔍 辅助函数设计

### 1. 请求验证函数

```python
def validate_agent_request(data):
    """验证Agent请求数据"""
    required_fields = ['node_data', 'user_intent']
    
    # 检查必需字段
    for field in required_fields:
        if field not in data:
            return {
                'valid': False,
                'error': f'缺少必需字段: {field}'
            }
    
    # 验证用户意图
    valid_intents = ['expand', 'summarize', 'analyze', 'generate', 'optimize']
    if data['user_intent'] not in valid_intents:
        return {
            'valid': False,
            'error': f'无效的用户意图: {data["user_intent"]}'
        }
    
    # 验证节点数据
    if not isinstance(data['node_data'], dict) or 'id' not in data['node_data']:
        return {
            'valid': False,
            'error': '无效的节点数据格式'
        }
    
    # 验证Agent配置（如果提供）
    if 'agent_config' in data:
        config = data['agent_config']
        if 'model' in config and config['model'] not in ['gpt-4', 'gpt-3.5-turbo']:
            return {
                'valid': False,
                'error': f'不支持的模型: {config["model"]}'
            }
    
    return {'valid': True}
```

### 2. Python Agent调用函数

```python
def call_python_autogen_agent(request_data, request_id):
    """
    调用Python Autogen Agent服务
    通过HTTP或进程间通信与独立的Python Agent服务交互
    """
    start_time = time.time()
    
    try:
        # 方式1: HTTP调用（推荐）
        agent_service_url = "http://localhost:8082/process"  # Python Agent服务端口
        
        payload = {
            'request_id': request_id,
            'data': request_data
        }
        
        response = requests.post(
            agent_service_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30  # 30秒超时
        )
        
        if response.status_code == 200:
            result = response.json()
            processing_time = time.time() - start_time
            
            return {
                'result': result,
                'metadata': {
                    'processing_time': round(processing_time, 2),
                    'model_used': result.get('model_used', 'unknown'),
                    'tokens_used': result.get('tokens_used', 0),
                    'timestamp': datetime.now().isoformat()
                }
            }
        else:
            raise AgentUnavailableError(f"Agent服务返回错误: {response.status_code}")
            
    except requests.exceptions.Timeout:
        raise AgentTimeoutError("Agent服务调用超时")
    except requests.exceptions.ConnectionError:
        raise AgentUnavailableError("无法连接到Agent服务")
    except Exception as e:
        raise Exception(f"调用Agent服务失败: {str(e)}")
```

### 3. Agent状态管理函数

```python
class AgentStatusManager:
    """Agent状态管理器"""
    
    def __init__(self):
        self.active_requests = 0
        self.queue_size = 0
        self.last_health_check = None
        self.service_status = 'offline'
        
    def get_status(self):
        """获取Agent服务状态"""
        return {
            'status': self.service_status,
            'active_requests': self.active_requests,
            'queue_size': self.queue_size,
            'last_health_check': self.last_health_check,
            'capabilities': ['expand', 'summarize', 'analyze', 'generate', 'optimize'],
            'models_available': ['gpt-4', 'gpt-3.5-turbo']
        }
    
    def increment_requests(self):
        """增加活跃请求计数"""
        self.active_requests += 1
        
    def decrement_requests(self):
        """减少活跃请求计数"""
        if self.active_requests > 0:
            self.active_requests -= 1
    
    def update_health(self, status):
        """更新健康状态"""
        self.service_status = status
        self.last_health_check = datetime.now().isoformat()

# 全局状态管理器实例
agent_status_manager = AgentStatusManager()

def get_agent_service_status():
    """获取Agent服务状态"""
    return agent_status_manager.get_status()
```

### 4. 历史记录管理函数

```python
def get_agent_history_records(limit=10, offset=0):
    """获取Agent操作历史记录"""
    # 从存储中加载历史记录
    history_data = load_agent_history()
    
    # 分页处理
    start_index = offset
    end_index = offset + limit
    paginated_history = history_data[start_index:end_index]
    
    return paginated_history

def save_agent_history(record):
    """保存Agent操作记录"""
    try:
        # 加载现有历史
        history = load_agent_history()
        
        # 添加新记录
        history.insert(0, record)
        
        # 限制历史记录数量（最多100条）
        if len(history) > 100:
            history = history[:100]
        
        # 保存到存储
        save_to_storage('agent_history', history)
        
    except Exception as e:
        logger.error(f'保存Agent历史记录失败: {e}')

def load_agent_history():
    """加载Agent操作历史"""
    try:
        return load_from_storage('agent_history') or []
    except Exception as e:
        logger.error(f'加载Agent历史记录失败: {e}')
        return []
```

## 🛡️ 错误处理类

```python
class AgentError(Exception):
    """Agent基础异常类"""
    pass

class AgentTimeoutError(AgentError):
    """Agent处理超时异常"""
    pass

class AgentUnavailableError(AgentError):
    """Agent服务不可用异常"""
    pass

class InvalidRequestError(AgentError):
    """无效请求异常"""
    pass
```

## 🔄 存储集成

### 使用现有的AutogenUnifiedStorage

```python
def save_to_storage(key, data):
    """保存数据到统一存储"""
    try:
        # 使用现有的AutogenUnifiedStorage
        if 'AutogenUnifiedStorage' in globals():
            AutogenUnifiedStorage.store('agent_data', key, data)
        else:
            # 降级方案：使用文件存储
            with open(f'data/agent_{key}.json', 'w') as f:
                json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f'保存数据失败: {e}')

def load_from_storage(key):
    """从统一存储加载数据"""
    try:
        if 'AutogenUnifiedStorage' in globals():
            return AutogenUnifiedStorage.retrieve('agent_data', key)
        else:
            # 降级方案：从文件加载
            with open(f'data/agent_{key}.json', 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f'加载数据失败: {e}')
        return None
```

## 📊 监控和日志

### 增强的日志记录

```python
def log_agent_request(request_id, action, details):
    """记录Agent请求日志"""
    log_entry = {
        'level': 'INFO',
        'timestamp': datetime.now().isoformat(),
        'component': 'AgentAPI',
        'request_id': request_id,
        'action': action,
        'details': details
    }
    
    logger.info(json.dumps(log_entry))
```

### 性能监控

```python
def monitor_agent_performance(request_id, processing_time, success):
    """监控Agent性能指标"""
    metrics = {
        'request_id': request_id,
        'processing_time': processing_time,
        'success': success,
        'timestamp': datetime.now().isoformat()
    }
    
    # 保存性能指标
    save_performance_metrics(metrics)
```

## 🚀 部署考虑

### 1. 依赖管理
- 需要安装`requests`库用于HTTP调用
- 需要确保Python Agent服务在8082端口运行

### 2. 配置管理
```python
# 配置常量
AGENT_SERVICE_URL = os.getenv('AGENT_SERVICE_URL', 'http://localhost:8082')
AGENT_TIMEOUT = int(os.getenv('AGENT_TIMEOUT', 30))
MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', 3))
```

### 3. 健康检查
```python
def health_check_agent_service():
    """检查Agent服务健康状态"""
    try:
        response = requests.get(f"{AGENT_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            agent_status_manager.update_health('ready')
            return True
        else:
            agent_status_manager.update_health('unhealthy')
            return False
    except Exception:
        agent_status_manager.update_health('offline')
        return False
```

## 📋 实施步骤

1. **备份现有代码**: 备份当前的`registry_server.py`
2. **逐步实现**: 按照本文档的设计逐步实现各个函数
3. **测试验证**: 在开发环境中测试每个端点
4. **集成测试**: 与前端和Python Agent服务进行集成测试
5. **部署上线**: 在生产环境中部署增强的API

---

**文档版本**: 1.0  
**最后更新**: 2025-10-05  
**维护者**: 架构师团队
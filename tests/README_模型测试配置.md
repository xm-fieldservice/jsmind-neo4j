# 模型性能测试配置指南

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install requests python-dotenv
```

### 2. 配置API密钥

#### 方式1：使用.env文件（推荐）⭐

```bash
# 复制示例文件
copy .env.example .env  # Windows
# 或
cp .env.example .env    # Linux/Mac

# 编辑.env文件，添加以下内容：
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

#### 方式2：直接设置环境变量

**Windows (PowerShell)**:
```powershell
$env:DEEPSEEK_API_KEY="your_deepseek_api_key_here"
$env:DASHSCOPE_API_KEY="your_dashscope_api_key_here"
```

**Linux/Mac**:
```bash
export DEEPSEEK_API_KEY="your_deepseek_api_key_here"
export DASHSCOPE_API_KEY="your_dashscope_api_key_here"
```

### 3. 获取API密钥

#### DeepSeek API密钥
1. 访问：https://platform.deepseek.com/
2. 注册/登录账号
3. 进入"API Keys"页面
4. 创建新的API密钥
5. 复制密钥（格式：sk-xxxxxxxxxxxxxxxx）

**费用**：极低，约$0.14/百万tokens（输入）

#### 阿里云DashScope API密钥
1. 访问：https://dashscope.console.aliyun.com/
2. 登录阿里云账号
3. 开通DashScope服务
4. 进入"API-KEY管理"
5. 创建新的API-KEY
6. 复制密钥

**费用**：低，约¥0.6/百万tokens（qwen-turbo）

### 4. 运行测试

```bash
cd d:\AI-Projects\project_manager(neo4j+d3.jsECHART)
python tests/test_model_performance.py
```

---

## 📊 测试内容

测试脚本会自动：

1. ✅ 检查环境配置
2. ✅ 测试3个模型（DeepSeek Reasoner、DeepSeek Chat、Qwen Turbo）
3. ✅ 运行5个标准查询
4. ✅ 统计成功率和响应时间
5. ✅ 生成性能对比报告
6. ✅ 保存详细结果到JSON文件

---

## 🎯 预期输出

```
================================================================================
🧪 Neo4j Cypher翻译模型性能测试
================================================================================

🔍 环境配置检查
================================================================================
✅ DEEPSEEK_API_KEY: sk-12345...abcd (DeepSeek模型)
✅ DASHSCOPE_API_KEY: sk-67890...efgh (Qwen模型)

📝 测试查询 1/5: 显示张三负责的所有任务
--------------------------------------------------------------------------------

🤖 DeepSeek Reasoner:
   状态: ✅
   响应时间: 1.23秒
   生成的Cypher: MATCH (p:Person {name:"张三"})-[:ASSIGNED_TO]->(t:Task) RETURN t

🤖 DeepSeek Chat:
   状态: ✅
   响应时间: 0.98秒
   生成的Cypher: MATCH (p:Person {name:"张三"})-[:ASSIGNED_TO]->(t:Task) RETURN t

🤖 Qwen Turbo:
   状态: ✅
   响应时间: 1.45秒
   生成的Cypher: MATCH (p:Person {name:"张三"})-[:ASSIGNED_TO]->(t:Task) RETURN t

...

================================================================================
📊 测试结果统计
================================================================================

🤖 DeepSeek Reasoner:
   成功率: 5/5 (100.0%)
   平均响应时间: 1.35秒
   最快响应: 1.12秒
   最慢响应: 1.58秒

🤖 DeepSeek Chat:
   成功率: 5/5 (100.0%)
   平均响应时间: 1.02秒
   最快响应: 0.89秒
   最慢响应: 1.23秒

🤖 Qwen Turbo:
   成功率: 4/5 (80.0%)
   平均响应时间: 1.67秒
   最快响应: 1.34秒
   最慢响应: 2.01秒

================================================================================
🎯 推荐结论
================================================================================
1. DeepSeek Chat: 0.856 ⭐⭐⭐
2. DeepSeek Reasoner: 0.823 ⭐⭐
3. Qwen Turbo: 0.712 ⭐

✅ 推荐使用: DeepSeek Chat

💾 详细结果已保存到: tests/model_performance_results.json
```

---

## 🔧 故障排查

### 问题1：API密钥未配置

**错误信息**：
```
❌ DEEPSEEK_API_KEY: 未配置 (DeepSeek模型)
```

**解决方案**：
按照上面"配置API密钥"步骤配置

### 问题2：API调用失败

**错误信息**：
```
❌ API错误: 401
```

**可能原因**：
- API密钥错误
- API密钥已过期
- 账户余额不足

**解决方案**：
1. 检查API密钥是否正确
2. 登录平台查看密钥状态
3. 充值账户余额

### 问题3：网络连接超时

**错误信息**：
```
❌ 异常: timeout
```

**解决方案**：
1. 检查网络连接
2. 使用代理（如需要）
3. 增加超时时间（修改脚本中的timeout参数）

---

## 📝 自定义测试

### 修改测试查询

编辑 `test_model_performance.py`，修改 `test_queries` 列表：

```python
self.test_queries = [
    "你的自定义查询1",
    "你的自定义查询2",
    # ...
]
```

### 调整模型参数

修改各模型测试函数中的参数：

```python
json={
    'model': 'deepseek-reasoner',
    'temperature': 0.3,  # 调整温度（0-1）
    'max_tokens': 500,   # 调整最大token数
}
```

---

## 💡 使用建议

1. **首次运行**：先测试一个模型，确认配置正确
2. **成本控制**：测试前检查账户余额
3. **结果保存**：测试结果自动保存到JSON文件，可用于后续分析
4. **定期测试**：模型性能可能随时间变化，建议定期测试

---

## 📚 相关文档

- [DeepSeek API文档](https://platform.deepseek.com/docs)
- [阿里云DashScope文档](https://help.aliyun.com/zh/dashscope/)
- [Neo4j Cypher手册](https://neo4j.com/docs/cypher-manual/current/)

---

**最后更新**: 2025-10-03  
**维护者**: 程序员

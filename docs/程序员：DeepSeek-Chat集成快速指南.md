# DeepSeek Chat 集成快速指南

**模型选择**: DeepSeek Chat ⭐⭐⭐  
**决策日期**: 2025-10-03  
**决策依据**: 实测性能 + 性价比分析

---

## 🎯 为什么选择DeepSeek Chat？

### 实测数据（2025-10-03）
- ✅ **成功率**: 100% (5/5查询全部通过)
- ⚡ **平均响应**: 2.49秒
- 💰 **月成本**: ¥7 (1000次查询)
- 🏆 **性价比评分**: 9.5/10

### 对比其他方案
| 指标 | DeepSeek Chat | Qwen Turbo | DeepSeek Reasoner |
|------|--------------|------------|-------------------|
| 成功率 | 100% ✅ | 100% ✅ | 60% ❌ |
| 响应时间 | 2.49秒 | 0.89秒 | 18.63秒 |
| 月成本 | ¥7 ⭐ | ¥12 | ¥28 |
| 推荐度 | ⭐⭐⭐ | ⭐⭐ | ❌ |

---

## 🚀 快速集成（3步）

### 步骤1：配置API密钥

```bash
# 编辑 .env 文件
DEEPSEEK_API_KEY=sk-your_api_key_here
```

获取密钥：https://platform.deepseek.com/

### 步骤2：创建翻译器

```javascript
// src/ai/SemanticTranslator.js
class SemanticTranslator {
    constructor() {
        this.config = {
            model: 'deepseek-chat',
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseUrl: 'https://api.deepseek.com/v1',
            temperature: 0.3,
            maxTokens: 500
        };
    }
    
    async translate(naturalLanguage) {
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [
                    {role: 'system', content: this.getSystemPrompt()},
                    {role: 'user', content: naturalLanguage}
                ],
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens
            })
        });
        
        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
    
    getSystemPrompt() {
        return `你是Neo4j Cypher专家。将自然语言转换为Cypher查询。
        
数据库结构：
- 节点：Project, Task, Person, Resource, Milestone
- 关系：CONTAINS, DEPENDS_ON, ASSIGNED_TO, MANAGES, USES

要求：只输出Cypher，不要解释。`;
    }
}
```

### 步骤3：集成到UI

```javascript
// 在neo4j-d3-demo.js中
const translator = new SemanticTranslator();

async function handleAIQuery() {
    const input = document.getElementById('aiQueryInput').value;
    const cypher = await translator.translate(input);
    
    // 显示生成的Cypher
    document.getElementById('cypherCode').textContent = cypher;
    
    // 执行查询...
}
```

---

## 📊 预期效果

### 输入示例
```
用户输入："显示张三负责的所有任务"
```

### 输出示例
```cypher
MATCH (p:Person {name:"张三"})-[:ASSIGNED_TO]->(t:Task) RETURN t
```

### 性能指标
- 响应时间：2-3秒
- 准确率：100%
- 成本：¥0.007/次

---

## 💰 成本控制

### 基础成本
- 1000次/月：¥7
- 5000次/月：¥35
- 10000次/月：¥70

### 优化策略
1. **查询缓存**：节省80%成本
2. **防抖控制**：避免重复调用
3. **Prompt优化**：减少token消耗

---

## 🔧 故障排查

### 问题1：API密钥错误
```
错误：401 Unauthorized
解决：检查.env中的DEEPSEEK_API_KEY
```

### 问题2：响应超时
```
错误：timeout
解决：增加timeout参数或检查网络
```

### 问题3：生成的Cypher无效
```
错误：语法错误
解决：优化systemPrompt，提供更多示例
```

---

## 📚 相关文档

- [完整集成方案](./程序员：Neo4j-AI语义翻译层集成方案.md)
- [模型性能测试](../tests/README_模型测试配置.md)
- [DeepSeek API文档](https://platform.deepseek.com/docs)

---

**最后更新**: 2025-10-03  
**维护者**: 程序员  
**状态**: ✅ 已确认，可执行

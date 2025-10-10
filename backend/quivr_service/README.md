# Quivr智能问答服务

基于Quivr的智能问答系统后端服务，集成到项目管理应用中。

## 📋 项目结构

```
backend/quivr_service/
├── config.py              # 配置文件（复用 data/config/models/）
├── requirements.txt       # Python依赖
├── env.example           # 环境变量示例
├── README.md             # 本文件
├── routes/               # API路由
└── test_scripts/         # 测试脚本
    └── test_config.py    # 配置测试
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend/quivr_service
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp env.example .env

# 编辑 .env 文件，填入真实的API Key
# DASHSCOPE_API_KEY=sk-your-real-api-key-here
```

### 3. 测试配置

```bash
# 运行配置测试
python test_scripts/test_config.py
```

如果看到 "✅ 所有配置测试通过！"，说明配置正确。

## 📚 可用模型

本服务复用项目现有的模型配置（`data/config/models/`）：

1. **qwen_turbo_latest** ⭐ 推荐
   - 通义千问Turbo
   - 速度快、成本低
   - 需要: `DASHSCOPE_API_KEY`

2. **deepseek_chat_test** ⭐ 推荐
   - DeepSeek Chat
   - 性能好、推理能力强
   - 需要: `DEEPSEEK_API_KEY`

3. **moonshot_kimi_k2**
   - Moonshot Kimi
   - 长上下文（128K）
   - 需要: `MOONSHOT_API_KEY`

4. **qwen2_5_vl_72b_instruct**
   - 通义千问VL
   - 多模态能力
   - 需要: `DASHSCOPE_API_KEY`

## 🧪 测试脚本

### test_config.py
测试配置加载是否正确

```bash
python test_scripts/test_config.py
```

**测试内容**：
- ✅ 项目结构检查
- ✅ 模型配置文件加载
- ✅ LLM配置验证
- ✅ 嵌入模型配置验证

## 📖 技术文档

完整的技术设计方案请参考：
`column-sources/autogen/5-智能问答系统技术设计方案v1.0.md`

## 🎯 开发阶段

### 阶段一：技术验证（当前）
- [x] 创建项目结构
- [x] 配置文件
- [x] 配置测试脚本
- [ ] API连接测试
- [ ] 单文档检索测试
- [ ] 多文档检索测试
- [ ] 数据底座方案对比
- [ ] 第三方应用封装测试

### 阶段二：最小化实现
- [ ] QuestionAnswerColumn工作栏
- [ ] QuivrClient.js API封装
- [ ] 与AutogenEventBus集成
- [ ] 与AutogenUnifiedStorage集成

### 阶段三：服务器部署
- [ ] Docker化
- [ ] 生产环境部署
- [ ] 监控系统

## 🔧 故障排除

### 问题1：模型配置文件不存在
**解决方案**：确保 `data/config/models/` 目录存在且包含模型配置文件

### 问题2：API Key未设置
**解决方案**：
1. 复制 `env.example` 为 `.env`
2. 在 `.env` 中填入真实的API Key
3. 重新运行测试

### 问题3：依赖安装失败
**解决方案**：
```bash
# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

## 📞 联系方式

如有问题，请参考技术设计文档或联系开发团队。

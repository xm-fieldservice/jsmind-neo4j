# 🚀 快速开始指南

## 当前进度：阶段一 - 技术验证

✅ 已完成：
- [x] 创建项目结构
- [x] 配置文件（config.py）
- [x] 依赖文件（requirements.txt）
- [x] 环境变量示例（env.example）
- [x] 配置测试脚本（test_config.py）
- [x] 文档（README.md）

---

## 📝 下一步操作（请按顺序执行）

### Step 1: 安装Python依赖

```bash
cd backend/quivr_service
pip install -r requirements.txt
```

**预计时间**：2-3分钟

---

### Step 2: 配置环境变量

```bash
# 复制环境变量示例文件
cp env.example .env

# 使用编辑器打开 .env 文件
# 填入你的真实API Key
```

**需要的API Key**：
- `DASHSCOPE_API_KEY` - 通义千问API Key（必需）
- `DEEPSEEK_API_KEY` - DeepSeek API Key（可选）
- `MOONSHOT_API_KEY` - Moonshot API Key（可选）

**如何获取API Key**：
1. **通义千问**：https://dashscope.console.aliyun.com/
2. **DeepSeek**：https://platform.deepseek.com/
3. **Moonshot**：https://platform.moonshot.cn/

---

### Step 3: 运行配置测试

```bash
python test_scripts/test_config.py
```

**期望输出**：
```
=== 测试1：项目结构 ===
✓ 项目根目录: ...
✓ 模型配置目录: ...
✅ 项目结构测试通过

=== 测试2：模型配置文件 ===
✓ qwen_turbo_latest: 配置加载成功
✓ deepseek_chat_test: 配置加载成功
...
✅ 模型配置文件测试完成

=== 测试3：LLM配置 ===
✓ LLM配置加载成功
  - API Key: 已设置 ✓
✅ LLM配置测试通过

=== 测试4：嵌入模型配置 ===
✓ 嵌入模型配置加载成功
  - API Key: 已设置 ✓
✅ 嵌入模型配置测试通过

✅ 所有配置测试通过！可以开始下一步。
```

---

### Step 4: 下一个测试脚本（待创建）

配置测试通过后，我们将创建：
- `test_api_connection.py` - 测试API连接
- `test_single_doc.py` - 测试单文档检索
- `test_multi_docs.py` - 测试多文档检索
- `test_compare_bases.py` - 测试数据底座方案对比

---

## ⚠️ 常见问题

### Q1: pip install 很慢？
**A**: 使用国内镜像：
```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Q2: 配置测试失败：API Key未设置？
**A**: 
1. 确保已复制 `env.example` 为 `.env`
2. 在 `.env` 中填入真实的API Key（不是示例值）
3. 重新运行测试

### Q3: 模型配置文件不存在？
**A**: 确保你在正确的分支上：
```bash
git branch  # 应该显示 * feature/intelligent-qa-system
```

---

## 📊 项目结构

```
backend/quivr_service/
├── config.py              # ✅ 配置管理
├── requirements.txt       # ✅ Python依赖
├── env.example           # ✅ 环境变量示例
├── .env                  # ⚠️  需要手动创建
├── README.md             # ✅ 详细文档
├── QUICKSTART.md         # ✅ 本文件
├── routes/               # 📁 API路由（待创建）
└── test_scripts/         # 📁 测试脚本
    └── test_config.py    # ✅ 配置测试
```

---

## 🎯 验证目标

根据技术设计方案，阶段一需要验证4个维度：

1. **网络信息检索准确性** 🌐
   - 网页抓取
   - 检索准确率 ≥ 75%

2. **本地文件检索与内容生成** 📁
   - MD文档批量上传
   - 检索准确率 ≥ 75%
   - 响应时间 ≤ 2秒

3. **数据底座方案对比** 🗄️
   - 小数据底座 vs 大数据底座
   - 性能对比

4. **第三方应用封装能力** 📦
   - REST API完整性
   - 集成示例

---

## 📞 需要帮助？

参考完整的技术设计文档：
`column-sources/autogen/5-智能问答系统技术设计方案v1.0.md`

---

**当前状态**：✅ 基础架构已就绪，等待Step 1-3完成

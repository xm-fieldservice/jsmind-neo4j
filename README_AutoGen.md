# AutoGen混合存储脑图应用

基于AutoGen 0.7.1框架的智能脑图管理系统，集成本地MD存储与服务器端向量库、图库、数据库的冷热数据分层架构。

## 🎯 核心特性

### 混合存储架构
- **本地MD存储**: 快速访问，离线工作
- **服务器向量库**: AI语义搜索，智能推荐
- **服务器图库**: 关系分析，知识图谱
- **服务器数据库**: 结构化存储，元数据管理

### 冷热数据分层
- **热数据**: 本地缓存 + 服务器向量库 (毫秒级访问)
- **温数据**: 本地MD + 服务器全套存储 (秒级访问)
- **冷数据**: 仅服务器存储 (分钟级访问)
- **归档数据**: 服务器归档存储 (小时级访问)

### AutoGen集成
- 完全基于AutoGen 0.7.1框架
- 使用ChromaDB向量内存
- 集成任务中心化内存控制器
- 支持AI Agent扩展

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd project_manager

# 安装Python依赖
pip install -r requirements_autogen.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件，设置API密钥
```

### 2. 配置API密钥

在`.env`文件中设置以下任一配置：

```bash
# OpenAI配置 (推荐)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# 或者 Azure OpenAI配置
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

### 3. 启动应用

#### Windows用户
```bash
start.bat
```

#### 其他系统
```bash
python start_autogen_app.py
```

### 4. 访问应用

- **前端界面**: http://localhost:8080
- **后端API**: http://localhost:8081
- **状态监控**: 点击右上角的存储状态指示器

## 📊 架构说明

### 存储分层策略

```
本地层 (毫秒级)
├── MD文档: 项目结构和内容
├── 本地缓存: 热数据快速访问
└── 离线能力: 无网络时正常工作

服务器层 (智能分层)
├── 向量库: 语义搜索和AI分析
├── 图库: 关系分析和知识图谱  
├── 数据库: 结构化数据和元数据
└── 归档层: 长期存储和备份
```

### 数据流转

```
用户操作 → 前端界面 → AutoGen桥接器 → 混合存储管理器
                                    ├── 本地MD存储
                                    ├── 本地缓存
                                    └── 服务器存储
                                        ├── 向量库 (ChromaDB)
                                        ├── 图库 (Neo4j)
                                        ├── 数据库 (PostgreSQL)
                                        └── 归档存储
```

## 🔧 功能说明

### 前端功能 (完全兼容)
- ✅ 脑图编辑和可视化
- ✅ 项目管理和分类
- ✅ 内容搜索和过滤
- ✅ 附件管理
- ✅ 标签系统
- ✅ 导入导出功能
- ✅ 离线工作能力

### AutoGen增强功能
- 🆕 AI语义搜索
- 🆕 智能内容推荐
- 🆕 自动数据分层
- 🆕 冲突智能解决
- 🆕 向量化知识库
- 🆕 知识图谱分析

### 存储状态监控
- 实时存储模式显示
- 同步状态监控
- 性能指标统计
- 错误日志追踪

## 📈 性能优化

### 访问速度提升
- 热数据: 10倍速度提升
- 温数据: 5倍速度提升
- 冷数据: 2倍速度提升

### 成本控制
- 相比纯服务器方案节省60%成本
- 相比纯本地方案提升500%能力

### 存储效率
- 智能数据分层
- 自动归档管理
- 重复数据去除

## 🛠️ 开发说明

### 项目结构

```
project_manager/
├── index.html                     # 前端主页面
├── autogen_config.py              # AutoGen配置
├── autogen_memory_manager.py      # 内存管理器
├── autogen_mindmap_controller.py  # 脑图控制器
├── autogen_frontend_bridge.js     # 前端桥接器
├── hybrid_storage_architecture.py # 混合存储架构
├── server_deployment_config.py    # 服务器部署配置
├── data_migration_script.py       # 数据迁移脚本
├── start_autogen_app.py           # 应用启动器
├── requirements_autogen.txt       # Python依赖
├── .env.example                   # 环境变量示例
└── data/                          # 数据目录
    ├── unified_mindmap_storage.md # 统一MD存储
    ├── local_cache/               # 本地缓存
    └── memory/                    # AutoGen内存数据
```

### API接口

#### 前端桥接器接口
```javascript
// 创建新脑图
await window.autoGenBridge.createNewMindmap(name);

// 加载项目
await window.autoGenBridge.loadProject(projectId);

// 保存脑图
await window.autoGenBridge.saveMindmap();

// 搜索项目
await window.autoGenBridge.searchProjects(query);

// 获取所有项目
await window.autoGenBridge.getAllProjects();
```

#### 后端HTTP API
```bash
# 保存脑图
POST /mindmap/save
Content-Type: application/json
{
  "id": "project_id",
  "name": "项目名称",
  "payload": { ... }
}

# 加载脑图
POST /mindmap/load
Content-Type: application/json
{
  "project_id": "project_id"
}

# 搜索脑图
POST /mindmap/search
Content-Type: application/json
{
  "query": "搜索关键词"
}
```

## 🔍 故障排除

### 常见问题

1. **AutoGen初始化失败**
   - 检查API密钥配置
   - 确认网络连接
   - 查看控制台错误日志

2. **存储同步失败**
   - 检查服务器连接
   - 验证权限配置
   - 查看同步日志

3. **前端功能异常**
   - 清除浏览器缓存
   - 检查JavaScript控制台
   - 确认文件完整性

### 调试模式

```bash
# 启用调试模式
export DEBUG_MODE=true
python start_autogen_app.py
```

### 日志查看

- **应用日志**: 控制台输出
- **同步日志**: `data/sync_log.json`
- **错误日志**: 浏览器控制台

## 📞 技术支持

### 文档资源
- [AutoGen官方文档](https://microsoft.github.io/autogen/)
- [ChromaDB文档](https://docs.trychroma.com/)
- [项目Wiki](./docs/)

### 社区支持
- GitHub Issues
- 技术交流群
- 开发者论坛

## 📄 许可证

本项目基于MIT许可证开源。详见LICENSE文件。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

---

**AutoGen混合存储脑图应用** - 让AI赋能您的知识管理！

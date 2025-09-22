# 项目迁移包使用说明

本说明文档用于指导将本项目（不含业务数据，但包含数据库代码与配置）迁移到新环境并完成运行验证。

- 项目根目录：`project_manager(neo4j+d3.jsECHART)`
- 主要特性：纯前端静态页面（jsMind 脑图）+ 可选后端（FastAPI/向量库脚本）
- 兼容系统：Windows（PowerShell）
- Git/CI：内置 GitHub Actions CI 工作流（`.github/workflows/ci.yml`）

---

## 1. 迁移包包含内容

- 前端页面与脚本
  - `index.html`、`styles.css`
  - `jsmind-controller.js`（脑图渲染与交互控制）
  - `script.js`（页面集成与事件逻辑）
  - `src/` 下的核心模块：
    - `src/core/mindData.js`
    - `src/services/mindmapStorage.js`
- 后端与脚本
  - `backend/`（FastAPI 应用，含 `requirements.txt`、`app/` 代码与 `start_api.py`）
  - `query_vector_store.py`、`store_documents_to_chroma.py`（向量库相关脚本）
  - 根目录 `requirements.txt`
- 工具、自动化与文档
  - `.github/workflows/ci.yml`（CI/CD）
  - `start_http_server.ps1`、`start_http_server_fixed.ps1`（本地静态服务器）
  - `start_backend.bat`（后端启动脚本）
  - `docs/` 全部文档（含本指南）
  - `autogen_repo/`（AutoGen 本地知识库与脚手架）

> 说明：保留 `autogen_repo/` 以便遵循 AutoGen 本地知识库优先与内生机制使用原则。

## 2. 已排除的数据文件（不随迁移包分发）

以下属于业务数据样本或运行时生成数据，不包含在迁移包中：

- `*.mindmap.json`（如：`mindmap.mindmap.json`、`Mindmap_*.mindmap.json`）
- `拼接脑图.json`
- `*.log`、`*.sqlite`、`*.db`（若存在）
- 任何迁移包 ZIP 自身（避免自包含）

## 3. 目录结构（核心）

```
project_manager(neo4j+d3.jsECHART)/
├─ .github/workflows/ci.yml
├─ autogen_repo/
├─ backend/
│  ├─ app/
│  ├─ requirements.txt
│  └─ start_api.py
├─ docs/
│  ├─ MIGRATION_GUIDE.md  ← 本文档
│  └─ ...
├─ src/
│  ├─ core/mindData.js
│  └─ services/mindmapStorage.js
├─ index.html
├─ styles.css
├─ jsmind-controller.js
├─ script.js
├─ requirements.txt
├─ start_http_server.ps1
├─ start_http_server_fixed.ps1
└─ start_backend.bat
```

## 4. 环境要求

- Windows 10/11，PowerShell 5+（或 PowerShell 7）
- Python 3.9~3.11（建议 3.11）
- 可访问公网（若需使用 CDN 依赖；否则请先做“离线本地化”处理）

> 注意：不做系统信息检查，按用户约定默认环境满足要求。

## 5. 安装与运行（PowerShell）

在项目根目录下执行以下步骤。

1) 初始化 Git 仓库（满足项目要求：必须创建 Git 仓库）

```powershell
# 初始化 Git 仓库（如迁移包内无 .git）
if (-not (Test-Path .git)) {
  git init
  git add .
  git commit -m "chore: init repo from migration package"
}
```

2) 创建与激活虚拟环境，并安装依赖

```powershell
# 创建虚拟环境
py -3.11 -m venv .venv
# 激活（PowerShell）
. .\.venv\Scripts\Activate.ps1

# 安装根依赖（如有）
pip install -r requirements.txt
# 安装后端依赖
pip install -r .\backend\requirements.txt
```

3) 启动后端（可选）

```powershell
# 使用仓库脚本（推荐）
.\start_backend.bat

# 或直接运行（示例）
# uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

4) 启动前端（静态文件服务器）

```powershell
# 使用内置脚本（修正版端口与跨域）
.\start_http_server_fixed.ps1

# 或者简单静态服务（示例，仅供参考）
# py -m http.server 5174
```

5) 访问

- 前端：`http://localhost:5174`（或脚本输出端口）
- 后端：`http://localhost:8000`（如已启动）

## 6. 数据与数据库说明

- 本迁移包不包含 `.mindmap.json` 等业务数据文件。
- 如需导入（或从旧环境恢复）脑图数据：
  - 将现有 `*.mindmap.json` 放置在项目根或通过 UI 导入（`index.html` → 脑图栏 → 导入按钮）。
- 数据库存储：
  - 若后端 `backend/app/database.py` 使用 SQLite 或其它数据库驱动：
    - 首次启动会按代码逻辑自动初始化（如表结构/文件）。
    - 若原环境使用外部 DB（如 Neo4j），请在相应配置中设置连接字符串，并保证目标环境可达。

## 7. CI/CD 配置

- GitHub Actions 工作流：`.github/workflows/ci.yml`
  - 代码风格与构建检查（如需扩展，可在新环境中补充步骤）。
- 迁移后建议：
  - 推送到新仓库：
    ```powershell
    git remote add origin <your_repo_url>
    git branch -M main
    git push -u origin main
    ```
  - 在 GitHub 上启用 Actions

## 8. 离线依赖本地化（可选）

若新环境无法访问 CDN，请将以下依赖改为本地：

- jsMind：
  - `https://cdn.jsdelivr.net/npm/jsmind/style/jsmind.css`
  - `https://cdn.jsdelivr.net/npm/jsmind/js/jsmind.js`
  - `https://cdn.jsdelivr.net/npm/jsmind/js/jsmind.draggable.js`
- Markdown 渲染与样式：
  - `https://cdn.jsdelivr.net/npm/marked/marked.min.js`
  - `https://cdn.jsdelivr.net/npm/github-markdown-css@5.2.0/github-markdown.min.css`
- iconfont：
  - `https://at.alicdn.com/t/font_2616996_po7xxw0dged.css`

将上述文件下载至 `vendor/` 或 `assets/` 目录，并在 `index.html` 中替换为相对路径。

## 9. 验收清单

- [ ] Git 仓库已初始化并首次提交
- [ ] 虚拟环境与依赖安装成功
- [ ] 后端服务可启动并通过健康检查（如提供）
- [ ] 静态前端可访问，jsMind 能正常渲染
- [ ] （如需）导入旧脑图 JSON 后显示正常
- [ ] CI 工作流在新仓库触发成功

## 10. 常见问题与排查

- 端口占用：
  - 前端 5174 / 后端 8000 被占用时，关闭占用进程或修改脚本端口。
- CDN 加载失败：
  - 执行“离线依赖本地化”。
- 拖拽无效/脑图不显示：
  - 确认 `jsmind.draggable.js` 已加载；点击“自检/重渲染”按钮观察提示。
- 数据未持久化：
  - 检查浏览器 IndexedDB 权限与 `src/services/mindmapStorage.js` 的实现状态。

---

如需我为你在新环境中自动本地化依赖或生成“单文件版”打包，请告知你的偏好（是否保留分层/是否移除后端）。

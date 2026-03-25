---
description: 常用开发命令
---

# 开发常用命令

## 快速启动

### 启动后端服务
```bash
# 方式1：直接运行（推荐，支持热重载）
python server/main.py

# 方式2：使用 uvicorn
uvicorn server.main:app --reload --host localhost --port 8000
```

### 启动前端服务
```bash
cd web
npm run dev
# 访问 http://localhost:5173
```

### 同时启动前后端
```bash
# 终端1：启动后端
python server/main.py

# 终端2：启动前端
cd web && npm run dev
```

## 依赖管理

### Python 依赖
```bash
# 使用 uv 安装依赖
uv sync

# 添加新依赖
uv add <package-name>

# 添加开发依赖
uv add --dev <package-name>
```

### Node.js 依赖
```bash
cd web
npm install              # 安装依赖
npm install <package>    # 添加新包
npm update               # 更新依赖
```

## 代码检查

### Python 类型检查
```bash
# 使用 mypy 检查类型（需要先安装）
pip install mypy
mypy src/

# 使用 pyright 检查（VS Code 内置）
# 在 VS Code 中使用 Python 插件
```

### 前端类型检查
```bash
cd web
npm run build    # 构建前会运行 vue-tsc 类型检查
```

## 调试命令

### 查看 Agent 列表
```bash
python -c "from src.agents import agent_manager; print(list(agent_manager._instances.keys()))"
```

### 测试 Agent
```bash
# 测试单个 Agent
curl -X POST http://localhost:8000/api/chat/agent/DesignAgent/run
```

### 查看 API 文档
```bash
# 启动服务后访问
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

## 环境变量

### 复制环境变量模板
```bash
cp .env.template .env
# 然后编辑 .env 文件配置 API keys
```

### 验证环境变量
```bash
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(dict(os.environ))"
```

---
description: 故障排查命令
---

# 故障排查命令

## 服务启动问题

### 后端无法启动
```bash
# 检查端口占用
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Linux/Mac

# 检查 Python 版本
python --version  # 需要 >= 3.13

# 检查依赖安装
uv sync --verbose

# 检查环境变量
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print('API Key:', os.getenv('OPENAI_API_KEY'))"
```

### 前端无法启动
```bash
# 检查 Node 版本
node --version  # 推荐 >= 18

# 清理 node_modules 重新安装
cd web
rm -rf node_modules package-lock.json
npm install

# 检查端口占用
netstat -ano | findstr :5173  # Windows
lsof -i :5173                  # Linux/Mac

# 使用不同端口启动
npm run dev -- --port 3000
```

## Agent 问题

### Agent 未被发现
```bash
# 检查 Agent 文件结构
ls -la src/agents/

# 验证 Agent 类继承
python -c "
from src.agents.designagent import DesignAgent
from src.agents.common import BaseAgent
print(f'Is BaseAgent subclass: {issubclass(DesignAgent, BaseAgent)}')
"

# 检查 AgentManager
python -c "
from src.agents import agent_manager
print(f'Found {len(agent_manager._instances)} agents')
print('Agents:', list(agent_manager._instances.keys()))
"
```

### Agent 运行错误
```bash
# 启用详细日志
export LOG_LEVEL=DEBUG
python server/main.py

# 测试 Agent 导入
python -c "
from src.agents.designagent import DesignAgent
agent = DesignAgent()
print(f'Agent created: {agent.name}')
"

# 检查 Context
python -c "
from src.agents.designagent.context import DesignAgentContext
ctx = DesignAgentContext()
print(f'Context created: {ctx}')
"
```

## API 问题

### API 端点不工作
```bash
# 检查服务是否运行
curl http://localhost:8000/docs

# 查看 API 路由
python -c "
from server.main import app
for route in app.routes:
    print(f'{route.methods} {route.path}')
"

# 测试特定端点
curl -X POST http://localhost:8000/api/chat/agent/DesignAgent/run -v
```

### CORS 错误
```bash
# 检查 CORS 配置
python -c "
from server.main import app
for mw in app.user_middleware:
    print(mw.cls)
"

# 允许的源检查
# 在 server/main.py 中查看 CORSMiddleware 配置
```

## LLM API 问题

### API 连接失败
```bash
# 测试 API 连接
python -c "
from langchain_openai import ChatOpenAI
from src.configs import config as sys_config
llm = ChatOpenAI(api_key=sys_config.OPENAI_API_KEY)
print('API connection test')
"

# 检查 API Key
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
key = os.getenv('OPENAI_API_KEY')
print(f'API Key exists: {bool(key)}')
print(f'API Key length: {len(key) if key else 0}')
"
```

### 模型响应问题
```bash
# 测试模型调用
python -c "
import asyncio
from langchain_openai import ChatOpenAI

async def test_model():
    llm = ChatOpenAI(model='gpt-3.5-turbo')
    response = await llm.ainvoke('Say hello')
    print(response.content)

asyncio.run(test_model())
"
```

## 内存和性能问题

### 检查内存使用
```bash
# Python 内存分析
pip install memory_profiler
python -m memory_profiler server/main.py

# 检查进程内存
ps aux | grep python  # Linux/Mac
tasklist | findstr python  # Windows
```

### 性能分析
```bash
# 使用 cProfile
python -m cProfile -o profile.stats server/main.py

# 分析结果
python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative')
p.print_stats(20)
"
```

## 数据库和存储问题

### 检查存储目录
```bash
# 检查 save/ 目录权限
ls -la save/

# 清理临时文件
find save/ -name "*.tmp" -delete

# 检查磁盘空间
df -h  # Linux/Mac
dir    # Windows
```

## 前端构建问题

### 构建失败
```bash
# 清理构建缓存
cd web
rm -rf dist node_modules/.vite

# 重新构建
npm run build

# 检查 TypeScript 错误
npx vue-tsc --noEmit
```

### 样式问题
```bash
# 检查 Tailwind 配置
cat web/tailwind.config.js

# 清理 CSS 缓存
rm -rf node_modules/.cache
npm run build
```

## 日志和调试

### 启用调试模式
```bash
# 设置环境变量
export DEBUG=1
export LOG_LEVEL=DEBUG

# 运行服务
python server/main.py
```

### 查看详细日志
```bash
# 重定向输出到文件
python server/main.py > app.log 2>&1

# 实时查看日志
tail -f app.log
```

## 常见错误解决

### ImportError
```bash
# 确保项目根目录在 sys.path
python -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
from src.agents import agent_manager
print('Import successful')
"
```

### ModuleNotFoundError
```bash
# 重新安装依赖
uv sync

# 或使用 pip
pip install -e .
```

### TimeoutError
```bash
# 增加超时时间
# 在代码中添加：
import asyncio
await asyncio.wait_for(coro, timeout=30.0)
```

### KeyError
```bash
# 检查环境变量
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
required_vars = ['OPENAI_API_KEY', 'DEFAULT_MODEL']
for var in required_vars:
    if var not in os.environ:
        print(f'Missing: {var}')
"
```

## 获取帮助

### 生成诊断报告
```bash
# 收集系统信息
python -c "
import sys
import platform
print('Python version:', sys.version)
print('Platform:', platform.platform())
print('Architecture:', platform.machine())
"

# 收集依赖信息
pip list | grep -E "(langchain|fastapi|uvicorn)"

# 收集 Git 信息
git remote -v
git branch -a
git log --oneline -5
```

### 重置开发环境
```bash
# 完全清理环境
git clean -fdx
git reset --hard HEAD

# 重新安装
uv sync
cd web && npm install
```

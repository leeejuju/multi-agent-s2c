---
description: 测试相关命令
---

# 测试命令

## 后端测试

### 运行所有测试
```bash
# 基本运行
python -m pytest

# 详细输出
python -m pytest -v

# 显示打印输出
python -m pytest -s
```

### 运行特定测试
```bash
# 运行特定文件
python -m pytest test/test_agent.py

# 运行特定测试函数
python -m pytest test/test_agent.py::test_agent_creation

# 运行特定测试类
python -m pytest test/test_agent.py::TestAgentManager
```

### 覆盖率报告
```bash
# 生成终端覆盖率报告
python -m pytest --cov=src --cov-report=term-missing

# 生成 HTML 覆盖率报告
python -m pytest --cov=src --cov-report=html
# 报告生成在 htmlcov/index.html

# 生成 XML 报告（用于 CI/CD）
python -m pytest --cov=src --cov-report=xml
```

### 按标记运行测试
```bash
# 只运行快速测试
python -m pytest -m "not slow"

# 只运行集成测试
python -m pytest -m integration

# 只运行单元测试
python -m pytest -m unit
```

### 性能测试
```bash
# 运行性能基准测试
python -m pytest test/test_benchmark.py --benchmark-only
```

## 前端测试

### 类型检查
```bash
cd web
npm run build    # 构建包含类型检查
```

### 手动测试
```bash
cd web
npm run dev      # 启动开发服务器进行手动测试
```

## 集成测试

### API 端点测试
```bash
# 测试聊天端点
curl -X POST http://localhost:8000/api/chat/agent/DesignAgent/run \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# 测试流式响应
curl -X POST http://localhost:8000/api/chat/agent/DesignAgent/stream
```

### Agent 通信测试
```bash
# 测试 Agent Manager
python -c "
from src.agents import agent_manager
agents = list(agent_manager._instances.keys())
print(f'Available agents: {agents}')
agent = agent_manager.get_agent('DesignAgent')
print(f'Agent ID: {agent.id()}')
"
```

## 调试测试

### 进入调试模式
```bash
# 使用 pdb 调试
python -m pytest --pdb

# 失败时进入调试
python -m pytest --pdb --trace

# 使用 ipdb 调试（需要安装）
python -m pytest --pdbcls=IPython.terminal.debugger:TerminalPdb --pdb
```

### 查看详细输出
```bash
# 显示 print 输出
python -m pytest -s -v

# 显示本地变量（失败时）
python -m pytest -l
```

## 持续集成

### 运行 CI 测试套件
```bash
# 完整的 CI 测试流程
python -m pytest --cov=src --cov-report=xml --cov-fail-under=80 -v
```

## 测试数据库清理

### 清理测试数据
```bash
# 清理 save/ 目录中的测试生成文件
rm -rf save/test_*

# 清理数据库
python -c "
import sqlite3
import os
if os.path.exists('test.db'):
    os.remove('test.db')
    print('Test database removed')
"
```

---
description: Agent 管理命令
---

# Agent 管理命令

## Agent 发现与注册

### 查看所有已注册的 Agents
```bash
python -c "
from src.agents import agent_manager
print('Registered Agents:')
for name, agent in agent_manager._instances.items():
    print(f'  - {name}: {agent.description}')
"
```

### 查看特定 Agent 详情
```bash
python -c "
from src.agents import agent_manager
agent = agent_manager.get_agent('DesignAgent')
print(f'Name: {agent.name}')
print(f'Description: {agent.description}')
print(f'ID: {agent.id()}')
print(f'Module: {agent.module_name}')
"
```

### 验证 Agent 配置
```bash
python -c "
from src.agents.common import BaseAgent
from src.agents.designagent import DesignAgent
from src.agents.deepagents import DeepAgent
from src.agents.deepsearchagent import DeepSearchAgent

agents = [DesignAgent(), DeepAgent()]
for agent in agents:
    print(f'{agent.__class__.__name__}:')
    print(f'  Has context: {hasattr(agent, \"context\")}')
    print(f'  Has get_agent: {hasattr(agent, \"get_agent\")}')
"
```

## Agent 交互测试

### 直接调用 Agent
```bash
python -c "
import asyncio
from src.agents import agent_manager

async def test_agent():
    agent = agent_manager.get_agent('DesignAgent')
    response = await agent.stream({'messages': 'Hello'})
    print(response)

asyncio.run(test_agent())
"
```

### 测试 Agent 流式输出
```bash
python -c "
import asyncio
from src.agents import agent_manager

async def test_stream():
    agent = agent_manager.get_agent('DeepAgent')
    async for chunk in agent.stream({'messages': 'Tell me a story'}):
        print(chunk, end='', flush=True)
    print()

asyncio.run(test_stream())
"
```

## Agent Context 管理

### 查看 Agent Context 结构
```bash
python -c "
from src.agents.designagent.context import DesignAgentContext
from src.agents.deepagents.context import DeepAgentContext

print('DesignAgentContext fields:')
for field in DesignAgentContext.__annotations__:
    print(f'  - {field}')

print('\nDeepAgentContext fields:')
for field in DeepAgentContext.__annotations__:
    print(f'  - {field}')
"
```

## Agent 性能监控

### 测试 Agent 响应时间
```bash
python -c "
import asyncio
import time
from src.agents import agent_manager

async def benchmark_agent():
    agent = agent_manager.get_agent('DesignAgent')
    start = time.time()
    await agent.stream({'messages': 'Test message'})
    elapsed = time.time() - start
    print(f'Response time: {elapsed:.2f}s')

asyncio.run(benchmark_agent())
"
```

### 批量测试 Agents
```bash
python -c "
import asyncio
from src.agents import agent_manager

async def test_all_agents():
    for name, agent in agent_manager._instances.items():
        try:
            print(f'Testing {name}...')
            await agent.stream({'messages': 'ping'})
            print(f'  ✓ {name} is working')
        except Exception as e:
            print(f'  ✗ {name} failed: {e}')

asyncio.run(test_all_agents())
"
```

## Agent 配置更新

### 重新加载 Agent 配置
```bash
# 重启服务会自动重新发现 Agents
# 或者使用 Python 重新导入
python -c "
import importlib
import src.agents.manager
importlib.reload(src.agents.manager)
from src.agents import agent_manager
print(f'Reloaded {len(agent_manager._instances)} agents')
"
```

## Agent 调试

### 启用 Agent 日志
```bash
# 设置环境变量
export LOG_LEVEL=DEBUG
python server/main.py

# 或在代码中设置
python -c "
import logging
logging.basicConfig(level=logging.DEBUG)
from src.agents import agent_manager
"
```

### 查看 Agent 内部状态
```bash
python -c "
from src.agents import agent_manager

agent = agent_manager.get_agent('DesignAgent')
print(f'Agent state:')
print(f'  Name: {agent.name}')
print(f'  Description: {agent.description}')
if hasattr(agent, 'context'):
    print(f'  Context: {agent.context.__name__}')
"
```

## Agent 通信测试

### 测试 Agent 间消息传递
```bash
python -c "
import asyncio
from src.agents import agent_manager

async def test_communication():
    # 发送消息到 DesignAgent
    design_agent = manager.get_agent('DesignAgent')
    response = await design_agent.stream({
        'messages': 'Create a design for a mobile app'
    })
    print('DesignAgent response:', response)

asyncio.run(test_communication())
"
```

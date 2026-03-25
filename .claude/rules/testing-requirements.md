---
description: 测试要求和规范
---

# 测试要求和规范

## 测试原则

### 1. 测试金字塔
```
        E2E Tests (10%)
       /             \
    Integration Tests (30%)
   /                     \
Unit Tests (60%)
```

- **单元测试**：占 60%，快速、隔离
- **集成测试**：占 30%，验证组件交互
- **E2E 测试**：占 10%，验证完整流程

### 2. 测试覆盖率要求
- 整体代码覆盖率：≥ 80%
- 核心业务逻辑：100%
- Agent 通信模块：≥ 90%
- 工具函数：≥ 70%

## 单元测试规范

### 1. 命名规范
```python
# 测试文件：test_*.py
# test_agent.py

# 测试类：Test<ClassName>
class TestMessageBroker:

    # 测试方法：test_<scenario>_<expected_result>
    def test_send_message_success(self):
        pass

    def test_send_message_with_invalid_data_raises_error(self):
        pass
```

### 2. 测试结构（AAA 模式）
```python
def test_agent_process_message():
    # Arrange (准备)
    agent = Agent(id="test_agent")
    message = {"content": "test"}

    # Act (执行)
    result = agent.process(message)

    # Assert (断言)
    assert result["status"] == "success"
    assert "data" in result
```

### 3. Fixture 使用
```python
import pytest

@pytest.fixture
def sample_agent():
    """创建测试用的 Agent 实例"""
    return Agent(id="test_agent", timeout=5)

@pytest.fixture
def mock_message_queue():
    """模拟消息队列"""
    with patch('utils.MessageQueue') as mock:
        yield mock

def test_agent_send(sample_agent, mock_message_queue):
    """使用 fixture 进行测试"""
    sample_agent.send("test message")
    mock_message_queue.put.assert_called_once()
```

## 集成测试规范

### 1. Agent 通信测试
```python
def test_agent_communication_flow():
    """测试 Agent 之间的消息传递"""
    # 创建多个 Agent
    sender = Agent(id="sender")
    receiver = Agent(id="receiver")

    # 发送消息
    sender.send_to(receiver.id, {"data": "test"})

    # 验证接收
    received = receiver.get_message()
    assert received["data"] == "test"
```

### 2. 消息队列测试
```python
def test_message_queue_integration():
    """测试消息队列的完整流程"""
    queue = MessageQueue()

    # 生产者发送
    producer = ProducerAgent(queue)
    producer.send({"task": "test"})

    # 消费者接收
    consumer = ConsumerAgent(queue)
    result = consumer.consume()

    assert result["task"] == "test"
```

## 测试工具和框架

### 1. Python 测试栈
```python
# pytest - 主测试框架
# pytest-cov - 覆盖率报告
# pytest-asyncio - 异步测试
# pytest-mock - Mock 对象
# unittest.mock - 标准库 mock

# 安装
pip install pytest pytest-cov pytest-asyncio pytest-mock
```

### 2. 配置示例
```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --cov=.
    --cov-report=html
    --cov-report=term-missing
    --verbose
```

## Mock 和 Stub 规范

### 1. 何时使用 Mock
- **外部服务**：数据库、API 调用
- **时间依赖**：定时任务、延时操作
- **随机性**：随机数生成
- **资源密集**：文件 I/O、网络操作

### 2. Mock 示例
```python
from unittest.mock import Mock, patch

def test_with_external_api():
    """Mock 外部 API 调用"""
    agent = Agent()

    # Mock API 响应
    with patch('agent.requests.get') as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"result": "ok"}

        result = agent.call_external_api()
        assert result == {"result": "ok"}
```

## 异步测试规范

### 1. 异步代码测试
```python
import pytest

@pytest.mark.asyncio
async def test_async_agent():
    """测试异步 Agent 方法"""
    agent = AsyncAgent()
    result = await agent.process_async({"data": "test"})
    assert result["status"] == "success"

@pytest.mark.asyncio
async def test_agent_communication_async():
    """测试异步消息传递"""
    sender = AsyncAgent(id="sender")
    receiver = AsyncAgent(id="receiver")

    await sender.send_to_async(receiver.id, {"msg": "test"})
    result = await receiver.receive_async()

    assert result["msg"] == "test"
```

## 性能测试

### 1. 基准测试
```python
def test_agent_performance_benchmark():
    """测试 Agent 处理性能"""
    agent = Agent()
    messages = [{"data": f"test_{i}"} for i in range(1000)]

    start_time = time.time()
    for msg in messages:
        agent.process(msg)
    elapsed = time.time() - start_time

    # 性能要求：1000 条消息 < 5 秒
    assert elapsed < 5.0
```

### 2. 并发测试
```python
def test_concurrent_agent_execution():
    """测试并发场景下的 Agent 行为"""
    import concurrent.futures

    agent = Agent()
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(agent.process, {"data": i})
            for i in range(100)
        ]
        results = [f.result() for f in futures]

    assert len(results) == 100
    assert all(r["status"] == "success" for r in results)
```

## 测试运行命令

### 1. 基本命令
```bash
# 运行所有测试
pytest

# 运行特定文件
pytest tests/test_agent.py

# 运行特定测试
pytest tests/test_agent.py::TestAgent::test_process

# 生成覆盖率报告
pytest --cov=. --cov-report=html

# 快速运行（跳过慢速测试）
pytest -m "not slow"
```

### 2. CI/CD 集成
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -r requirements.txt
      - run: pytest --cov=. --cov-report=xml
      - uses: codecov/codecov-action@v2
```

## 测试最佳实践

### ✅ DO（应该做的）
- 每个测试只验证一个行为
- 使用描述性的测试名称
- 保持测试独立和可重复
- 使用 fixture 复用测试数据
- 测试边界条件和异常情况

### ❌ DON'T（不应该做的）
- 不要测试私有方法
- 不要在测试中包含复杂逻辑
- 不要依赖测试执行顺序
- 不要在测试中使用随机数据（未固定种子）
- 不要忽略失败的测试

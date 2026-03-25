---
description: 项目代码风格规范
---

# 代码风格规范

## Python 代码规范

### 1. 基础规范
- 遵循 PEP 8 标准
- 使用 4 空格缩进，不使用 Tab
- 行长度限制为 100 字符
- 使用 UTF-8 编码

### 2. 命名规范
```python
# 类名：PascalCase
class MessageBroker:
    pass

# 函数/变量：snake_case
def send_message():
    message_queue = []

# 常量：UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3

# 私有成员：前缀单下划线
class Agent:
    def _internal_method(self):
        self._private_var = None
```

### 3. 类型注解
```python
from typing import List, Dict, Optional, Union

# 函数必须添加类型注解
def process_message(
    message: Dict[str, Any],
    timeout: int = 5
) -> Optional[str]:
    """处理消息并返回结果"""
    pass

# 类属性也需要类型注解
class Agent:
    agent_id: str
    status: AgentStatus
```

### 4. 文档字符串
```python
def process_data(data: List[Dict]) -> Dict[str, Any]:
    """
    处理输入数据并返回格式化结果

    Args:
        data: 待处理的原始数据列表

    Returns:
        包含处理结果的字典，包含 'success' 和 'data' 字段

    Raises:
        ValueError: 当数据格式不正确时

    Example:
        >>> result = process_data([{"id": 1}])
        >>> print(result['success'])
        True
    """
    pass
```

### 5. 导入顺序
```python
# 1. 标准库
import os
import sys
from typing import List, Dict

# 2. 第三方库
import numpy as np
from fastapi import FastAPI

# 3. 本地模块
from .agent import BaseAgent
from .utils import helper_func
```

## TypeScript/JavaScript 代码规范

### 1. 基础规范
- 使用 2 空格缩进
- 使用单引号优先
- 使用分号结尾
- 行长度限制为 100 字符

### 2. 命名规范
```typescript
// 类/接口/类型：PascalCase
interface MessageBroker {
  send(): void;
}
class Agent implements MessageBroker {}

// 函数/变量：camelCase
function sendMessage() {}
const messageQueue = [];

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 类型参数：T 前缀或描述性名称
interface Mapper<TInput, TOutput> {}
```

### 3. 类型定义
```typescript
// 必须为所有函数添加参数和返回类型
function processData(
  data: Record<string, unknown>[],
  timeout?: number
): Promise<{ success: boolean; data: unknown }> {
  // ...
}

// 使用 interface 定义对象类型，type 定义联合类型
interface AgentConfig {
  id: string;
  timeout: number;
}

type AgentStatus = 'idle' | 'running' | 'error';
```

## 通用代码质量要求

### 1. 错误处理
```python
# ✅ 具体的异常处理
try:
    result = agent.process()
except ValueError as e:
    logger.error(f"Invalid data: {e}")
    raise
except Exception as e:
    logger.critical(f"Unexpected error: {e}")
    raise

# ❌ 过于宽泛的异常捕获
try:
    result = agent.process()
except:
    pass
```

### 2. 日志规范
```python
# 使用结构化日志
logger.info(
    "Agent started",
    extra={
        "agent_id": agent.id,
        "timestamp": datetime.now().isoformat()
    }
)

# 日志级别选择
logger.debug()   # 调试信息
logger.info()    # 重要事件
logger.warning() # 警告信息
logger.error()   # 错误信息
logger.critical() # 严重错误
```

### 3. 配置管理
```python
# 使用配置文件或环境变量
import os
from pathlib import Path

# 配置项命名要清晰
AGENT_TIMEOUT = int(os.getenv('AGENT_TIMEOUT', '30'))
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
DATA_DIR = Path(os.getenv('DATA_DIR', './data'))
```

## 代码审查清单

- [ ] 所有函数都有类型注解
- [ ] 所有公共函数都有文档字符串
- [ ] 没有硬编码的配置值（使用常量或配置文件）
- [ ] 异常处理具体且合理
- [ ] 日志记录关键操作
- [ ] 单元测试覆盖核心逻辑
- [ ] 代码行长度符合规范
- [ ] 变量和函数命名清晰易懂

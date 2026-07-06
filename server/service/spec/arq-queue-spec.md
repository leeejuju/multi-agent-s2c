# ARQ 队列服务设计说明

状态：草稿 / 样例

归属：backend

相关代码：

- `server/service/arq_queue_servcie.py`
- `server/service/agent_run_service.py`
- `server/worker.py`
- `src/storage/redis/redis_manger.py`
- `src/configs/config.py`

## 1. 定位

这个文档说明 agent run 队列服务的设计边界。

队列层当前只负责两件事：

1. 提供 ARQ 入队能力，把 agent run 放到后台 worker 执行。
2. 读写单个 run 对应的 Redis Stream 事件，用来向外暴露执行进度。

它不决定执行哪个 agent，不负责业务记录怎么持久化，也不负责 agent
最终怎么生成内容。这些职责分别属于 `agent_run_service`、repository 和具体
agent 实现。

## 2. 当前范围

第一版只支持一个后台任务：

```text
process_agent_run(run_id: str)
```

预期流程：

1. API/service 在 PostgreSQL 创建一条 `agent_run` 记录。
2. `agent_run_service.enqueue_agent_run(run_id)` 把 `run_id` 放入 ARQ 队列。
3. ARQ 把队列状态存到 Redis。
4. 独立的 ARQ worker 进程执行 `server.worker.process_agent_run`。
5. worker 或 service 把执行进度写入 Redis Stream。
6. 前端后续通过 SSE 接口读取这些事件。

## 3. 分层边界

队列相关代码保持三层，不要混在一起。

| 层 | 文件 | 负责 | 不负责 |
| --- | --- | --- | --- |
| Redis 运行时 | `src/storage/redis/redis_manger.py` | Redis client 创建、ARQ pool 创建、async Redis client 关闭 | run 事件含义、agent 状态、业务判断 |
| 队列服务 | `server/service/arq_queue_servcie.py` | ARQ pool 获取、队列级操作、Redis Stream key/read/write | repository CRUD、agent 执行、HTTP/SSE 格式 |
| Agent run 服务 | `server/service/agent_run_service.py` | run 编排、run 事件语义、对外 run API | 导入 redis_manger 创建的方法 |

这个边界比具体 helper 名字更重要。

如果一个 helper 只是包了一层 `redis.xadd(...)` 或 `redis.xread(...)`，
没有增加真正的策略，那就不要为了“封装”再包一层。直接在
`arq_queue_servcie.py` 里调用 Redis 命令即可。

## 4. 对外接口契约

队列服务应该暴露少量 async helper。

```python
async def get_arq_pool():
    ...

def queue_event_stream_key(run_id: str) -> str:
    ...

async def write_queue_event(run_id: str, event: dict[str, Any]) -> str:
    ...

async def read_queue_events(
    run_id: str,
    *,
    after_id: str = "0-0",
    count: int | None = None,
):
    ...
```

预期行为：

- `get_arq_pool()` 懒加载并复用 ARQ 入队 pool。
- `queue_event_stream_key(run_id)` 生成稳定的 Redis Stream key。
- `write_queue_event(...)` 把 JSON 事件写到 Redis Stream 的 `event` 字段。
- `read_queue_events(...)` 从指定事件 ID 之后读取 stream 事件。

## 5. Redis Key 和 ID 设计

ARQ job id：

```text
run:{run_id}
```

队列事件 stream key：

```text
queue:events:{run_id}
```

ARQ job id 和 Redis Stream event id 是两个不同概念。

| ID | 示例 | 创建方 | 用途 |
| --- | --- | --- | --- |
| `run_id` | `a6d4...` | PostgreSQL/service 层 | 持久业务运行 ID |
| ARQ job id | `run:a6d4...` | 入队调用 | Redis 队列去重和查询 |
| Redis Stream event id | `1710000000000-0` | Redis `XADD` | SSE 游标和断点续读 |

不要把 Redis Stream event id 当成 run 状态的事实来源。

持久 run 状态应该在 PostgreSQL 里。Redis Stream event id 只是事件投递游标。

## 6. 事件 Payload 形状

队列事件必须保持小而稳定，并且可以 JSON 序列化。

推荐形状：

```json
{
  "scope": "agent_run",
  "type": "status",
  "run_id": "run_123",
  "status": "running",
  "message": "Agent run started.",
  "created_at": "2026-07-06T22:30:00Z"
}
```

常见事件类型：

| `type` | 必填字段 | 含义 |
| --- | --- | --- |
| `status` | `run_id`, `status` | 粗粒度生命周期更新 |
| `token` | `run_id`, `content` | assistant 文本流片段 |
| `tool_call` | `run_id`, `tool_call_id`, `name`, `status` | 工具调用进度 |
| `error` | `run_id`, `error_type`, `message` | 可恢复或终止错误 |
| `done` | `run_id`, `status` | 终态完成事件 |

不要把大 payload、上传文件、生成资产、完整消息历史塞进 Redis Stream。

这些内容应该放在对应的 storage/repository 里，事件里只放引用或摘要。

## 7. 配置项

相关配置在 `src/configs/config.py`。

| 配置 | 含义 |
| --- | --- |
| `redis_url` | ARQ 和 Redis Stream 共用的 Redis 连接地址 |
| `arq_queue_name` | ARQ worker 使用的队列名 |
| `arq_max_jobs` | ARQ worker 最大并发任务数 |
| `enable_run_queue` | 是否启用基于 ARQ/Redis 的 run 执行 |
| `run_stream_poll_timeout_ms` | Redis `XREAD` 阻塞等待时间 |
| `run_stream_max_len` | 单个 run stream 近似保留长度 |

FastAPI 进程负责 API 侧资源生命周期。

ARQ worker 是独立进程，通过 `server.worker.WorkerSettings` 启动，不应该混在
uvicorn 进程里执行。

## 8. 错误处理

队列层错误不要静默吞掉。

预期行为：

1. Redis/ARQ 连接失败时，异常直接抛给调用方。
2. 调用方决定是否把 agent run 标记为失败。
3. worker 执行失败时，尽量发布 `error` 事件。
4. 持久状态更新写 PostgreSQL，不只依赖 Redis 事件。

队列服务不应该把所有异常都转成一个普通字符串。

日志和上层服务需要足够的异常上下文来定位问题。

## 9. 幂等设计

入队时使用稳定的 ARQ job id：

```python
await queue.enqueue_job("process_agent_run", run_id, _job_id=f"run:{run_id}")
```

这可以避免同一个 `run_id` 被重复入队。

但这只解决队列层重复任务，不等于数据库层幂等。

数据库层幂等应该在创建 agent run 的路径上处理，业务身份可以是：

```text
uid + conversation_id/thread_id + request_id + agent_id
```

worker 执行时也要防御性地抢占任务。

例如只允许把 `queued` 状态的 run 更新成 `running`。如果更新行数为 0，说明
这个 run 已经被其他 worker 抢走、执行过，或者已经结束。

## 10. Worker 契约

第一版只有一个 ARQ job 函数：

```text
server.worker.process_agent_run(ctx, run_id)
```

目标行为：

1. 通过 `run_id` 读取 `agent_run` 记录。
2. 如果这个 run 已经不可执行，直接返回。
3. 把 run 状态更新为 `running`。
4. 解析目标 agent。
5. 执行 agent，并持续发布进度事件。
6. 保存最终 assistant 输出和终态 run 状态。
7. 发布 `done` 或 `error` 事件。

worker 不应该通过 ARQ 参数接收完整 prompt、附件 payload 或历史消息。

ARQ 参数只传 `run_id`，worker 再从 PostgreSQL 和 storage 里恢复执行上下文。

## 11. 不做的事

这些职责不放进队列服务：

- 创建 conversation
- 保存 user/assistant message
- 选择 agent
- 解析附件
- MinIO 上传下载
- PostgreSQL schema 创建
- 前端 SSE 响应格式化
- 长期事件归档
- 超出 ARQ 入队能力之外的复杂重试策略

## 12. 待定问题

这些问题先记录，不急着提前实现。

1. stream key 保持 `queue:events:{run_id}`，还是改成更贴近业务的
   `run:events:{run_id}`？
2. FastAPI shutdown 时是否需要显式关闭 ARQ pool，还是只关闭 raw async
   Redis client？
3. `enable_run_queue=false` 时，是保留旧的进程内执行路径，还是 run 接口直接返回
   “queue disabled”？
4. `agent_run` 表到底允许哪些状态值？
5. Redis Stream 事件在 run 完成后应该保留多久？

## 13. 最小落地版本

下一步最小实现只需要打通一条链路：

1. 修复 `agent_run_service.enqueue_agent_run`，确保它能拿到 `get_arq_pool`。
2. 入队时继续使用 `_job_id=f"run:{run_id}"`。
3. 把 `process_agent_run(ctx, run_id)` 实现成一个薄 worker 入口。
4. 在 repository 里补 run 的 claim/start/finish/fail 状态更新方法。
5. 用 Redis Stream 实现 `stream_agent_run_event(...)`。
6. 对改动过的后端模块跑一次 compile check。

在只有一个 job 类型、一个队列后端的情况下，不要提前加更大的队列抽象。

# Agent Run Service 设计说明

状态：草稿

归属：backend

相关代码：

- `server/service/agent_run_service.py`
- `server/service/arq_queue_servcie.py`
- `server/worker.py`
- `src/storage/redis/redis_manger.py`

## 1. 定位

`Agent Run Service` 只封装 `AgentRun` 运行过程中实际需要的最小 Redis 能力：

1. ARQ 入队：把 `run_id` 投递给后台 worker。
2. Run event：写入和读取 `run:events:{run_id}` Redis Stream。
3. 取消信号：写入和读取 `run:cancel:{run_id}` Redis key。

它不是原始 Redis 连接管理器。Redis client 和 ARQ pool 的底层创建仍然属于
`src/storage/redis/redis_manger.py`。

## 2. 第一版范围

第一版只打通这条链路：

```text
create run -> enqueue run -> worker execute -> publish events -> frontend read events
```

需要实现的接口：

```python
async def enqueue_agent_run(run_id: str) -> None: ...
async def publish_agent_run_event(run_id: str, event: dict[str, Any]) -> str: ...
async def read_agent_run_events(...) -> list[tuple[str, dict[str, Any]]]: ...
async def stream_agent_run_event(...) -> AsyncIterator[str]: ...
async def cancel_agent_run(run_id: str, *, reason: str | None = None) -> None: ...
async def is_agent_run_cancelled(run_id: str) -> bool: ...
```

不做的事：

- 不做 Redis pub/sub。
- 不做 `run:result:{run_id}`。
- 不做后台等待结果接口。
- 不做最近事件查询接口。
- 不做长期事件归档。

这些等 worker、SSE 和取消链路真的跑通后再加。

## 3. Redis Key

| 用途 | Key | 说明 |
| --- | --- | --- |
| ARQ job id | `run:{run_id}` | 入队去重 |
| run event stream | `run:events:{run_id}` | SSE 游标续读 |
| cancel flag | `run:cancel:{run_id}` | worker 轮询取消 |

Redis Stream event id 和 ARQ job id 是两个概念。

`run:events:{run_id}` 里的 Redis Stream event id 只作为 SSE 游标，不是持久业务状态。

## 4. Event Payload

Service 写事件时统一补齐基础字段：

```json
{
  "scope": "agent_run",
  "run_id": "run_123",
  "type": "status",
  "created_at": "2026-07-06T22:50:00+00:00"
}
```

事件字段只放小 payload。完整消息、附件、生成资产放 PostgreSQL 或 storage。

终态事件：

- `done`
- `error`
- `cancelled`

`stream_agent_run_event(...)` 读到终态事件后结束。

## 5. TTL

第一版用一个模块常量：

```python
RUN_REDIS_TTL_SECONDS = 24 * 60 * 60
```

每次写 `run:events:{run_id}` 或 `run:cancel:{run_id}` 时刷新 TTL。

先不加配置项。等 TTL 真的需要按环境调整时再提到 `config.py`。

## 6. PostgreSQL 和 Redis 边界

PostgreSQL 保存事实状态：

- run 基本记录
- run 当前状态
- final message / error

Redis 只保存临时运行能力：

- ARQ 队列状态
- run event stream
- cancel flag

如果 Redis Stream 过期，前端只能回退到 PostgreSQL 最终状态和持久消息。

## 7. Worker 使用方式

worker 只接收 `run_id`：

```python
async def process_agent_run(ctx, run_id: str) -> None:
    ...
```

worker 执行时：

1. 从 PostgreSQL 读取 run。
2. 发布 `started`。
3. 执行过程中定期调用 `is_agent_run_cancelled(run_id)`。
4. 输出 token/status/tool 时调用 `publish_agent_run_event(...)`。
5. 成功发布 `done`。
6. 失败发布 `error`。
7. 取消发布 `cancelled`。

worker 不直接拼 Redis key。

## 8. 当前代码差距

已完成第一版 service 后，剩余工作是：

1. router 调用 `enqueue_agent_run(run_id)`。
2. router 把 `/runs/{run_id}/events` 接到 `stream_agent_run_event(...)`。
3. worker 实现真正的 `process_agent_run(ctx, run_id)`。
4. repository 补 run claim/start/finish/fail 状态更新。

不要提前加更大的 queue/event 抽象。

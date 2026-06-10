# multi-agent-s2c
Script-driven image/video editing and generation. 基于剧本/文字，驱动的图像/视频编辑与生成。

## Contributing

See commit and PR conventions in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Database migrations

Run migrations without a checked-in Alembic ini file:

```bash
uv run --no-sync python scripts/migrate.py upgrade
```

The FastAPI startup path also applies pending migrations before serving requests.

---
description: 部署相关命令
---

# 部署命令

## 构建准备

### 构建前端
```bash
cd web
npm run build
# 构建产物在 web/dist/ 目录
```

### 构建后端
```bash
# 后端是纯 Python，无需特殊构建
# 但需要确保所有依赖已安装
uv sync
```

## Docker 部署

### 构建 Docker 镜像
```bash
# 查看可用的 Docker 配置
ls docker/

# 构建镜像（根据实际 Dockerfile）
docker build -t multi-agent-s2c:latest -f docker/Dockerfile .

# 或使用 docker-compose
docker-compose build
```

### 运行 Docker 容器
```bash
# 基本运行
docker run -p 8000:8000 --env-file .env multi-agent-s2c:latest

# 挂载卷以持久化数据
docker run -p 8000:8000 \
  -v $(pwd)/save:/app/save \
  --env-file .env \
  multi-agent-s2c:latest

# 后台运行
docker run -d -p 8000:8000 --env-file .env multi-agent-s2c:latest
```

### 使用 Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

## 生产环境配置

### 环境变量设置
```bash
# 创建生产环境配置
cat > .env.production << EOF
# API 配置
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
DEFAULT_MODEL=gpt-4

# 服务配置
HOST=0.0.0.0
PORT=8000
WORKERS=4
LOG_LEVEL=INFO

# 前端配置（如果需要）
VITE_API_BASE_URL=https://your-domain.com/api
EOF
```

### 使用 Uvicorn 生产部署
```bash
# 启动生产服务器
uvicorn server.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --log-level info \
  --access-log

# 或使用配置文件
uvicorn server.main:app --config uvicorn.conf
```

### 使用 Gunicorn（推荐）
```bash
# 安装 Gunicorn
pip install gunicorn

# 启动 Gunicorn
gunicorn server.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

## 前端部署

### 静态文件部署
```bash
cd web

# 构建生产版本
npm run build

# dist/ 目录可以部署到任何静态文件服务器
# 例如：Nginx、Apache、CDN 等
```

### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/multi-agent-s2c/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 健康检查

### 检查后端服务
```bash
# 检查服务是否运行
curl http://localhost:8000/docs

# 健康检查端点（如果已实现）
curl http://localhost:8000/health
```

### 检查前端服务
```bash
# 检查前端是否可访问
curl http://localhost:5173

# 或检查构建产物
ls -la web/dist/
```

## 日志管理

### 查看应用日志
```bash
# 如果使用 systemd
journalctl -u multi-agent-s2c -f

# 如果使用 Docker
docker logs -f <container_id>

# 直接运行时
tail -f logs/app.log
```

### 配置日志轮转
```bash
# 创建 logrotate 配置
cat > /etc/logrotate.d/multi-agent-s2c << EOF
/var/log/multi-agent-s2c/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
```

## 备份与恢复

### 备份数据
```bash
# 备份生成的文件
tar -czf backup-$(date +%Y%m%d).tar.gz save/

# 备份配置文件
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env pyproject.toml
```

### 恢复数据
```bash
# 恢复生成的文件
tar -xzf backup-20240325.tar.gz
```

## 性能优化

### 监控资源使用
```bash
# 检查进程资源使用
ps aux | grep python

# 检查内存使用
free -h

# 检查磁盘使用
df -h
```

### 压力测试
```bash
# 使用 Apache Bench
ab -n 1000 -c 10 http://localhost:8000/api/chat/agent/DesignAgent/run

# 使用 wrk
wrk -t4 -c100 -d30s http://localhost:8000/api/chat/agent/DesignAgent/run
```

## 安全加固

### 设置适当的文件权限
```bash
# 限制 .env 文件权限
chmod 600 .env

# 限制日志目录权限
chmod 750 logs/
```

### 配置防火墙
```bash
# 只允许特定端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

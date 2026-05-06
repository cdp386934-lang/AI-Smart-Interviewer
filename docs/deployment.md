# 部署文档

## 阿里云 / 腾讯云

### 1. 服务器准备
- 2 vCPU / 4GB 内存起步
- 安装 Docker 与 Docker Compose
- 开放端口：3000、3001、5432、6379

### 2. 部署步骤
```bash
git clone <repo>
cd "AI Smart Interviewer"
docker compose up -d --build
```

### 3. 环境变量
- `OPENAI_API_KEY`
- `JWT_SECRET`
- `DATABASE_URL`
- `REDIS_URL`

### 4. 监控
- Sentry：捕获前后端异常
- 日志：接入云日志服务
- 资源：CPU、内存、连接数

### 5. 回滚
- 保留上一版本镜像
- `docker compose down && docker compose up -d`

# 部署文档

## 开发环境

1. 复制环境文件

```bash
cp .env.example .env.development
```

2. 启动依赖

```bash
docker compose up -d postgres redis
```

3. 运行迁移

```bash
chmod +x scripts/migrate.sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_interviewer ./scripts/migrate.sh
```

4. 启动应用

```bash
npm install
npm run dev
```

## 生产环境

### 1. 阿里云开通指南
- 开通 ECS、RDS PostgreSQL、Redis、OSS
- 为应用分配安全组
- 仅开放 80/443/3000 端口到公网

### 2. 域名配置
- 将域名解析到 ECS 公网 IP
- 为 API 和 WebSocket 配置子域名，如 `api.example.com`、`ws.example.com`

### 3. SSL 证书申请
- 使用阿里云证书服务或 Let's Encrypt
- 将证书挂载到 Nginx

### 4. Nginx 配置
```nginx
server {
  listen 80;
  server_name api.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}
```

### 5. 启动
- 准备 `.env.production`
- `docker compose -f docker-compose.prod.yml up -d --build`
## 生产环境

### 1. 阿里云开通指南
- 开通 ECS、RDS PostgreSQL、Redis、OSS
- 为应用分配安全组
- 仅开放 80/443/3000 端口到公网

### 2. 域名配置
- 将域名解析到 ECS 公网 IP
- 为 API 和 WebSocket 配置子域名，如 `api.example.com`、`ws.example.com`

### 3. SSL 证书申请
- 使用阿里云证书服务或 Let's Encrypt
- 将证书挂载到 Nginx

### 4. Nginx 配置
```nginx
server {
  listen 80;
  server_name api.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}
```

### 5. 启动
- 准备 `.env.production`
- `docker compose -f docker-compose.prod.yml up -d --build`

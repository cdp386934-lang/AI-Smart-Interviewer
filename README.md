# AI Smart Interviewer

## 本地最小闭环启动步骤

### 1. 准备环境变量
```bash
cp .env.example .env.development
```
填写以下关键值：
- `LLM_API_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_PASSWORD`
- `REDIS_HOST` / `REDIS_PORT`

### 2. 启动数据库和 Redis
```bash
docker compose up -d postgres redis
```

### 3. 迁移数据库
```bash
chmod +x scripts/migrate.sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_interviewer ./scripts/migrate.sh
```

### 4. 安装依赖并启动
```bash
npm install
npm run dev
```

### 5. 前端流程
1. 打开 `http://localhost:5173/upload`
2. 上传简历文件
3. 可选输入公司需求 / JD
4. 选择“上传优化”或“直接面试”
5. 系统会根据简历 + 公司需求出题

## 说明
- 上传简历是必须步骤
- 公司需求是可选项
- 不需要手工格式化简历
- 后续面试问题会优先结合公司需求和简历生成

# AI Agent 智能面试官系统

一个基于 AI 的智能面试系统，覆盖简历上传、问题生成、实时追问、评分、报告与前端交互。

## 核心能力

- 简历解析与结构化存储
- 智能面试引擎：问题生成、追问策略、回答评分、报告生成
- WebSocket 实时面试对话与反馈
- 前端 React 面试界面
- Docker 容器化部署
- 集成测试与端到端验证

## 技术栈

- 后端：Node.js + TypeScript + Express
- AI：LangChain + Zod 结构化输出
- 实时通信：WebSocket
- 状态管理：Zustand
- 前端：React 18 + TypeScript
- 测试：Vitest + Playwright
- 部署：Docker + Docker Compose

## 项目结构

```
ai-smart-interviewer/
├── Dockerfile
├── docker-compose.yml
├── e2e/
├── docs/
├── playwright.config.ts
├── scripts/
├── src/
│   ├── components/
│   ├── gateway/
│   ├── hooks/
│   ├── modules/
│   ├── pages/
│   ├── store/
│   └── tests/
└── README.frontend.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interviewer
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

### 启动开发环境

```bash
npm run dev
```

### 构建与运行

```bash
npm run build
npm start
```

## 功能模块

### 1. 简历解析

支持 PDF、Word、TXT，完成结构化提取、缓存与降级处理。

### 2. 面试引擎

负责：
- 问题生成
- 回答评分
- 追问决策
- 面试报告
- 难度动态调整

### 3. WebSocket 网关

支持：
- 认证
- 心跳
- 会话恢复
- 实时题目与评分推送

### 4. 前端 React 应用

页面包括：
- Landing
- Upload
- Optimize
- Interview
- Report

核心交互：
- 三栏面试布局
- 实时反馈
- 对话气泡
- 技能雷达图

## 测试

### 单元测试

```bash
npm test
```

### 集成测试

```bash
npm run test:e2e
```

### Playwright 端到端测试

```bash
npm run test:playwright
```

## Docker 部署

### 本地启动

```bash
docker compose up -d --build
```

### 服务说明

- App：`3000`
- WebSocket：`3001`
- PostgreSQL：`5432`
- Redis：`6379`

## 集成与优化

### 测试场景

- 上传简历 → 解析 → 优化建议 → 开始面试 → 生成报告
- 上传损坏 PDF
- AI 返回格式错误降级
- 网络中断恢复
- 并发面试

### 性能优化

- Redis 缓存常见问题与简历解析结果
- 分页查询对话历史
- 索引优化
- Sentry 错误监控
- Token 用量监控
- 面试转化率统计

## 部署文档

- `docs/deployment.md`：阿里云 / 腾讯云部署说明
- `README.frontend.md`：前端启动说明

## 许可证

MIT

# AI Agent 智能面试官系统

## 启动

```bash
npm install
npm run dev
```

## 环境变量

- `VITE_WS_URL`：WebSocket 地址
- `VITE_API_BASE_URL`：API 地址
- `NODE_ENV`：运行环境

## 项目结构

- `src/pages` 页面
- `src/components` 组件
- `src/hooks` 交互 Hooks
- `src/store` 全局状态
- `src/api` HTTP 客户端
- `src/types/shared.ts` 前后端共享类型

## 测试

```bash
npm test
npm run test:e2e
npm run test:playwright
```

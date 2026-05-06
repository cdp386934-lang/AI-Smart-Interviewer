# API 文档

## WebSocket

### 连接
`ws://localhost:<port>/ws`

### 客户端事件
- `auth`：连接认证
- `interview:start`：启动面试
- `interview:answer`：提交文本回答
- `interview:voice`：提交语音回答
- `interview:pause`：暂停面试
- `interview:resume`：恢复面试
- `interview:end`：结束面试

### 服务端事件
- `auth:result`
- `interview:started`
- `interviewer:question`
- `interviewer:typing`
- `evaluation:realtime`
- `interview:stage_change`
- `interview:ended`
- `error`

## REST API

### POST `/api/auth/login`
简化登录。

### POST `/api/resume/upload`
上传简历，`multipart/form-data`。

### GET `/api/resume/:id`
获取简历详情。

### POST `/api/resume/:id/optimize`
简历优化。

### GET `/api/jobs`
岗位列表。

### GET `/api/interview/history`
面试历史。

### GET `/api/interview/:id/report`
面试报告。

## 前端 Hook

```tsx
const { status, send } = useWebSocket({ url, token });
```

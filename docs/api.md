# API 文档

## 认证
### POST `/api/auth/login`
Request:
```json
{ "email": "demo@example.com", "password": "secret" }
```
Response:
```json
{ "token": "mock-token", "user": { "id": "u1", "email": "demo@example.com", "name": "Demo User" } }
```

### POST `/api/auth/refresh`
Response:
```json
{ "token": "mock-token" }
```

## 简历
### POST `/api/resume/upload`
Response:
```json
{ "id": "r1", "status": "completed", "structured": { "basicInfo": { "name": "Demo" } } }
```

### GET `/api/resume/:id`
### POST `/api/resume/:id/optimize`
### GET `/api/resume/:id/download`

## 岗位
### GET `/api/jobs`
### GET `/api/jobs/:id`

## 面试
### GET `/api/interview/history`
### GET `/api/interview/:id`
### GET `/api/interview/:id/report`
### DELETE `/api/interview/:id`

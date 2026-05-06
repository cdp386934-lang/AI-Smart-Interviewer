# AI Agent 智能面试官系统

一个基于AI的智能面试系统，能够自动生成面试问题、评估候选人回答、生成面试报告。

## 🚀 功能特性

- **简历解析**: 支持PDF/Word简历解析为结构化数据
- **智能面试**: 基于简历和岗位要求生成个性化面试问题
- **实时评估**: 多维度评估候选人回答（技术、沟通、逻辑、经验）
- **动态调整**: 根据回答质量动态调整问题难度
- **面试报告**: 生成详细的面试评估报告和录用建议
- **实时通信**: WebSocket支持实时面试对话

## 📁 项目结构

```
ai-smart-interviewer/
├── .env.example                    # 环境变量示例
├── .gitignore                      # Git忽略文件
├── package.json                    # 项目依赖
├── tsconfig.json                   # TypeScript配置
├── vitest.config.ts                # 测试配置
└── src/
    ├── index.ts                    # 应用入口
    ├── server.ts                   # HTTP服务器
    ├── container.ts                # 依赖注入容器
    ├── config/
    │   └── index.ts                # 配置管理
    ├── gateway/
    │   ├── interfaces.ts           # WebSocket接口定义
    │   └── websocket.gateway.ts    # WebSocket网关实现
    ├── modules/
    │   ├── ai-layer/               # AI能力层
    │   │   ├── interfaces.ts       # AI接口定义
    │   │   ├── langchain.service.ts # LangChain服务实现
    │   │   ├── model-factory.ts    # 模型工厂
    │   │   ├── prompt-manager.ts   # Prompt管理器
    │   │   ├── config.ts           # AI配置
    │   │   └── prompts/            # Prompt模板
    │   │       ├── answer-evaluate.ts  # 回答评分Prompt
    │   │       ├── follow-up-decide.ts # 追问决策Prompt
    │   │       ├── question-generate.ts # 问题生成Prompt
    │   │       └── report-generate.ts  # 报告生成Prompt
    │   ├── interview-engine/       # 面试引擎
    │   │   ├── interfaces.ts       # 面试引擎接口
    │   │   └── interview.engine.ts # 面试引擎实现
    │   ├── resume-parser/          # 简历解析模块
    │   │   ├── interfaces.ts       # 简历解析接口
    │   │   ├── resume.parser.ts    # 简历解析实现
    │   │   └── schemas/
    │   │       └── resume-schema.ts # 简历Schema定义
    │   └── session-manager/        # 会话管理模块
    │       ├── interfaces.ts       # 会话管理接口
    │       ├── session.manager.ts  # 会话管理实现
    │       └── schemas/            # 会话Schema
    ├── tests/                      # 测试文件
    │   ├── setup.ts                # 测试配置
    │   └── ai-layer.test.ts        # AI层测试
    ├── types/                      # 全局类型定义
    │   ├── index.ts                # 类型导出
    │   ├── errors.ts               # 错误类型
    │   └── validation.ts           # 验证类型
    └── utils/                      # 工具函数
        ├── index.ts                # 工具导出
        ├── errors.ts               # 错误处理工具
        └── logger.ts               # 日志工具
```

## 🛠️ 技术栈

- **后端**: Node.js + TypeScript + Express
- **AI框架**: LangChain.js
- **数据库**: PostgreSQL + Redis
- **实时通信**: WebSocket
- **测试**: Vitest
- **代码质量**: TypeScript + ESLint

## 📦 安装与运行

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd ai-smart-interviewer

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件，配置以下信息：

```env
# 应用配置
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interviewer
REDIS_URL=redis://localhost:6379

# AI 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# 文件存储
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760 # 10MB

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

### 3. 运行项目

```bash
# 开发模式
npm run dev

# 构建项目
npm run build

# 生产模式
npm start

# 类型检查
npm run type-check
```

## 🔧 模块说明

### AI能力层 (`src/modules/ai-layer/`)

封装LangChain，提供统一的LLM调用能力：
- 基础对话和流式对话
- 结构化输出（JSON Schema约束）
- Prompt模板管理
- Token用量监控

### 简历解析模块 (`src/modules/resume-parser/`)

解析简历文件为结构化数据：
- 支持PDF/Word格式
- AI结构化提取
- 简历优化建议
- 文件存储管理

### 面试引擎模块 (`src/modules/interview-engine/`)

核心面试逻辑：
- 问题生成（技术、行为、项目、代码）
- 回答评估（多维度评分）
- 难度动态调整
- 面试报告生成

### 会话管理模块 (`src/modules/session-manager/`)

管理面试会话生命周期：
- 状态机管理
- 对话历史存储
- 候选人画像更新
- 并发控制

### WebSocket网关 (`src/gateway/`)

实时通信支持：
- 连接管理和认证
- 消息路由
- 错误处理
- 心跳检测

## 📊 面试流程

1. **简历上传**: 候选人上传简历文件
2. **简历解析**: 系统解析简历为结构化数据
3. **面试配置**: 选择岗位和面试难度
4. **面试开始**: 系统生成第一个问题
5. **实时对话**: 候选人回答，系统评估并生成下一个问题
6. **动态调整**: 根据回答质量调整问题难度
7. **面试结束**: 生成详细面试报告
8. **报告查看**: 查看评估结果和录用建议

## 🧪 测试

```bash
# 运行测试
npm test

# 运行特定测试
npm test -- ai-layer.test.ts
```

## 🔒 安全注意事项

1. **敏感信息保护**:
   - `.env` 文件已添加到 `.gitignore`
   - 使用 `.env.example` 作为模板
   - 不要提交API密钥和数据库密码

2. **文件上传安全**:
   - 文件类型验证
   - 文件大小限制
   - 病毒扫描（建议）

3. **API安全**:
   - JWT认证
   - 输入验证
   - 速率限制

## 📈 性能优化

- **缓存策略**: Redis缓存常用数据和会话状态
- **数据库优化**: 索引优化，查询分页
- **AI调用优化**: 批量处理，结果缓存
- **并发控制**: 连接池，消息队列

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📄 许可证

MIT License

## 📞 支持

如有问题，请提交Issue或联系项目维护者。

---

**注意**: 本项目为AI智能面试系统原型，实际生产环境需要根据具体需求进行调整和优化。
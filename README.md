---

## 一、项目整体架构（Kiro 全局上下文）

```markdown
# AI Agent 智能面试官 - 全局架构

## 技术栈
- 前端：React + WebSocket 客户端
- 服务端：Node.js + TypeScript + Express/Fastify
- AI 层：LangChain（优先）/ CrewAI（复杂多 Agent 场景）
- 数据库：PostgreSQL（主库）+ Redis（会话缓存）
- 文件存储：本地/MinIO（简历文件）

## 核心模块
1. resume-parser     - 简历解析（PDF/Word → 结构化 JSON）
2. interview-engine - 面试引擎（问题生成、评分反馈）
3. session-manager  - 会话管理（状态机、记忆、多轮对话）
4. ai-layer         - AI 能力层（LangChain 封装 LLM 调用）
5. websocket-gateway- WebSocket 网关（实时通信）

## 目录结构规范
```
/src
  /modules
    /resume-parser      # 简历解析模块
    /interview-engine   # 面试引擎模块
    /session-manager    # 会话管理模块
    /ai-layer           # AI 能力层（LangChain 封装）
  /gateway              # WebSocket 网关
  /types                # 全局类型定义
  /config               # 配置文件
  /utils                # 工具函数
/tests                  # 测试文件
```

## 编码规范
- 所有模块必须：接口先行（interface → 实现 → 测试）
- 使用依赖注入，禁止直接实例化
- 错误处理统一使用自定义 BusinessError
- 日志使用 pino，禁止 console.log
```

---

## 二、分阶段提示词（先框架后功能）

### 阶段 1：项目骨架与基础设施

```markdown
# 任务：搭建项目基础框架

## 目标
搭建完整的 TypeScript Node.js 项目骨架，包含：
1. 项目初始化（package.json、tsconfig、目录结构）
2. 基础依赖安装（Express、TypeScript、LangChain、Redis、PostgreSQL 等）
3. 全局类型定义（/src/types）
4. 配置管理（/src/config，支持 env 文件）
5. 错误处理中间件
6. 日志系统（pino）
7. 基础 WebSocket 网关（只建立连接，不实现业务）

## 要求
- 所有代码必须可编译通过（npm run build 无报错）
- 每个模块必须有 index.ts 导出
- 提供 .env.example 模板
- WebSocket 使用 ws 库，实现基础连接管理（连接、断开、心跳）

## 输出
- 完整的 /src 目录代码
- package.json 依赖清单
- README.md 启动说明
```

---

### 阶段 2：AI 能力层（LangChain 封装）

```markdown
# 任务：实现 AI 能力层（/src/modules/ai-layer）

## 目标
封装 LangChain，为上层模块提供统一的 LLM 调用能力。

## 接口定义（先实现这些接口）
```typescript
// /src/modules/ai-layer/interfaces.ts
export interface IAILayer {
  // 基础对话
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
  
  // 结构化输出（JSON Schema）
  structuredOutput<T>(messages: ChatMessage[], schema: ZodSchema<T>): Promise<T>;
  
  // 工具调用
  toolCall(messages: ChatMessage[], tools: Tool[]): Promise<ToolCallResult>;
  
  // Embedding（简历相似度匹配）
  embed(text: string): Promise<number[]>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;           // 模型选择
  temperature?: number;     // 温度
  maxTokens?: number;       // 最大 token
  callbacks?: Callbacks;    // 回调（用于日志、监控）
}
```

## 实现要求
1. 使用 LangChain.js（@langchain/core、@langchain/openai 等）
2. 支持多模型切换（OpenAI、Claude、通义千问等通过配置切换）
3. 实现 Prompt 模板管理（/src/modules/ai-layer/prompts/）
   - 每个业务 Prompt 单独文件
   - 支持变量注入 {{variable}}
4. 实现 Token 用量监控（回调记录输入/输出 token）
5. 实现重试机制（失败自动重试 3 次，指数退避）

## Prompt 模板目录结构
```
/src/modules/ai-layer/prompts/
  resume-extract.ts      # 简历结构化提取
  question-generate.ts   # 面试问题生成
  answer-evaluate.ts     # 回答评分
  resume-optimize.ts     # 简历优化建议
```

## 输出
- 完整的 ai-layer 模块代码
- 包含单元测试（mock LLM 调用）
- 提供使用示例
```

---

### 阶段 3：简历解析模块

```markdown
# 任务：实现简历解析模块（/src/modules/resume-parser）

## 目标
实现简历上传、解析、结构化存储。

## 接口定义
```typescript
// /src/modules/resume-parser/interfaces.ts
export interface IResumeParser {
  // 解析简历文件 → 原始文本
  extractText(file: ResumeFile): Promise<string>;
  
  // 原始文本 → 结构化 JSON（调用 AI 层）
  parseToStructured(text: string, options?: ParseOptions): Promise<StructuredResume>;
  
  // 简历优化建议（基于目标岗位）
  optimize(resume: StructuredResume, jobDescription: string): Promise<OptimizationResult>;
}

export interface StructuredResume {
  basicInfo: BasicInfo;
  education: Education[];
  workExperience: WorkExperience[];
  projects: Project[];
  skills: Skills;
  rawText: string;  // 保留原始文本用于后续匹配
}

export interface ResumeFile {
  buffer: Buffer;
  filename: string;
  mimetype: 'application/pdf' | 'application/msword' | 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
```

## 实现要求
1. **文件解析**
   - PDF：使用 pdf-parse 或 pdfjs-dist
   - Word：使用 mammoth
   - 文件大小限制 10MB，格式校验
   
2. **结构化提取**
   - 调用 ai-layer.structuredOutput()
   - 使用 Zod Schema 严格校验 AI 返回结构
   - 提取失败时回退到关键词匹配（兜底方案）

3. **简历优化**
   - 输入：结构化简历 + 目标岗位 JD
   - 输出：优化建议列表（按优先级排序）
   - 每项建议包含：问题描述、修改建议、示例

4. **存储**
   - 原始文件：本地磁盘 /uploads/resumes/{userId}/
   - 结构化数据：PostgreSQL（表结构由你设计）
   - 缓存：Redis（解析结果缓存 24h）

## 数据库表结构（需要你设计）
- resumes（原始文件信息）
- resume_structured（结构化数据，JSONB 存储）
- resume_optimizations（优化历史）

## 输出
- 完整的 resume-parser 模块
- 数据库 migration 文件
- 单元测试（mock 文件解析和 AI 调用）
```

---

### 阶段 4：会话管理模块（状态机 + 记忆）

```markdown
# 任务：实现会话管理模块（/src/modules/session-manager）

## 目标
管理面试会话生命周期、状态机、多轮对话记忆。

## 接口定义
```typescript
// /src/modules/session-manager/interfaces.ts
export interface ISessionManager {
  // 创建会话
  create(config: InterviewConfig): Promise<InterviewSession>;
  
  // 获取会话状态
  get(sessionId: string): Promise<InterviewSession | null>;
  
  // 状态推进
  transition(sessionId: string, event: InterviewEvent): Promise<void>;
  
  // 记录对话（用户/AI）
  addMessage(sessionId: string, message: Message): Promise<void>;
  
  // 获取对话历史（用于 LLM 上下文）
  getHistory(sessionId: string, limit?: number): Promise<Message[]>;
  
  // 更新候选人画像
  updateProfile(sessionId: string, update: ProfileUpdate): Promise<void>;
  
  // 结束会话
  end(sessionId: string): Promise<InterviewReport>;
}

// 状态机定义
export enum InterviewStage {
  IDLE = 'idle',                    // 初始
  RESUME_CONFIRM = 'resume_confirm', // 简历确认
  SELF_INTRO = 'self_intro',        // 自我介绍
  TECHNICAL = 'technical',           // 技术面试
  PROJECT_DEEP = 'project_deep',     // 项目深挖
  BEHAVIORAL = 'behavioral',         // 行为面试
  CODING = 'coding',                // 代码考核
  Q_AND_A = 'q_and_a',              // 反问环节
  ENDED = 'ended'                    // 结束
}

export interface InterviewSession {
  id: string;
  stage: InterviewStage;
  config: InterviewConfig;           // 面试配置（岗位、难度等）
  resume: StructuredResume;          // 候选人简历
  messages: Message[];               // 对话历史
  profile: CandidateProfile;         // 动态画像
  metadata: SessionMetadata;         // 时间、IP 等
}

export interface CandidateProfile {
  skills: Map<string, number>;      // 技能掌握度 0-1
  weakAreas: string[];              // 薄弱点
  strongAreas: string[];            // 优势点
  personalityHints: string[];       // 性格特征（沟通中观察）
  overallScore: number;             // 综合得分（动态更新）
}
```

## 实现要求
1. **状态机**
   - 定义合法的状态转移矩阵（如 TECHNICAL → PROJECT_DEEP 允许，TECHNICAL → SELF_INTRO 不允许）
   - 每个状态进入/退出时触发钩子（记录日志、更新统计）
   - 非法转移抛出 BusinessError

2. **记忆管理**
   - 短期记忆：Redis 存储最近 20 轮对话
   - 长期记忆：PostgreSQL 持久化完整对话
   - 上下文压缩：对话超过 20 轮时，调用 AI 生成摘要替换早期对话

3. **候选人画像更新**
   - 每次回答后，由 interview-engine 评估并更新 profile
   - 画像实时影响问题生成（如 weakAreas 优先考察）

4. **并发控制**
   - 一个用户同时只能有一个活跃会话
   - 会话超时机制（30 分钟无操作自动结束）

## Redis Key 设计
```
session:{sessionId}:state        -> 当前状态
session:{sessionId}:messages       -> 消息列表（LRU）
session:{sessionId}:profile        -> 候选人画像
session:{userId}:active            -> 当前活跃会话ID
```

## 输出
- 完整的 session-manager 模块
- 状态机转移图（文档）
- 单元测试（状态转移、并发场景）
```

---

### 阶段 5：面试引擎模块

```markdown
# 任务：实现面试引擎模块（/src/modules/interview-engine）

## 目标
核心 AI 逻辑：问题生成、追问策略、回答评分、面试报告。

## 接口定义
```typescript
// /src/modules/interview-engine/interfaces.ts
export interface IInterviewEngine {
  // 生成下一个问题（核心）
  generateQuestion(session: InterviewSession): Promise<Question>;
  
  // 评估候选人回答
  evaluateAnswer(session: InterviewSession, answer: string): Promise<Evaluation>;
  
  // 决定状态转移（是否进入下一阶段）
  decideTransition(session: InterviewSession, evaluation: Evaluation): Promise<InterviewStage>;
  
  // 生成面试报告
  generateReport(session: InterviewSession): Promise<InterviewReport>;
  
  // 实时反馈（回答后的即时点评）
  generateRealtimeFeedback(evaluation: Evaluation): Promise<string>;
}

export interface Question {
  id: string;
  type: 'technical' | 'behavioral' | 'project' | 'coding' | 'follow_up';
  content: string;           // 问题内容
  difficulty: number;        // 难度 1-5
  expectedPoints: string[];   // 期望回答要点（评分用）
  context?: string;           // 上下文（如基于哪个项目提问）
  timeout?: number;           // 建议回答时间（秒）
}

export interface Evaluation {
  questionId: string;
  score: number;             // 0-100
  dimensions: {
    technical: number;       // 技术深度
    communication: number;   // 沟通表达
    logic: number;           // 逻辑思维
    experience: number;      // 经验匹配
  };
  feedback: string;          // 详细反馈
  missingPoints: string[];   // 遗漏要点
  followUpNeeded: boolean;   // 是否需要追问
  skillUpdates: Map<string, number>; // 技能掌握度更新
}
```

## 实现要求
1. **问题生成策略**
   - 技术题：基于简历技能栈 + 岗位 JD，使用 RAG 从题库匹配
   - 行为题：宝洁八大问变体，结合候选人经历定制
   - 项目深挖：链式追问（先问项目背景 → 架构 → 难点 → 优化）
   - 追问：当回答模糊时，用 5Why 法追问细节

2. **评分体系**
   - 多维度评分（技术、沟通、逻辑、经验）
   - 使用 AI 结构化输出（Zod Schema 约束）
   - 评分标准分级：优秀(85+)、良好(70-84)、一般(60-69)、差(<60)

3. **难度动态调整**
   - 连续答对 2 题 → 难度 +1
   - 连续答错 2 题 → 难度 -1
   - 达到最高难度且答对 → 标记为 strongArea
   - 最低难度仍答错 → 标记为 weakArea

4. **面试报告**
   - 技能雷达图数据
   - 各阶段表现总结
   - 优势与不足分析
   - 录用建议（强烈推荐/推荐/待定/不推荐）

## Prompt 模板要求
每个功能需要独立的 Prompt 文件（放在 ai-layer/prompts/，由 interview-engine 调用）：

1. `question-generate.ts` - 问题生成 Prompt
2. `answer-evaluate.ts` - 回答评分 Prompt  
3. `report-generate.ts` - 报告生成 Prompt
4. `follow-up-decide.ts` - 追问决策 Prompt

## 输出
- 完整的 interview-engine 模块
- 所有 Prompt 模板（中文，专业面试场景）
- 单元测试（mock AI 返回，测试评分逻辑）
```

---

### 阶段 6：WebSocket 网关 + API 路由

```markdown
# 任务：实现 WebSocket 网关和 REST API

## 目标
打通前后端通信，实现完整的用户交互流程。

## WebSocket 事件设计
```typescript
// 客户端 → 服务端
interface ClientEvents {
  'auth': { token: string };                    // 连接后认证
  'interview:start': { resumeId: string, jobId: string };
  'interview:answer': { content: string };       // 文本回答
  'interview:voice': { audioBase64: string };   // 语音回答（预留）
  'interview:pause': {};
  'interview:resume': {};
  'interview:end': {};
}

// 服务端 → 客户端
interface ServerEvents {
  'auth:result': { success: boolean };
  'interview:started': { sessionId: string, firstQuestion: Question };
  'interviewer:question': { question: Question };
  'interviewer:typing': { duration: number };    // AI 正在思考（UI 展示）
  'evaluation:realtime': { feedback: string, score: number };
  'interview:stage_change': { from: string, to: string };
  'interview:ended': { report: InterviewReport };
  'error': { code: string, message: string };
}
```

## REST API 设计
```
POST /api/auth/login          # 登录（简化版）
POST /api/resume/upload       # 上传简历（multipart/form-data）
GET  /api/resume/:id          # 获取简历详情
POST /api/resume/:id/optimize # 简历优化
GET  /api/jobs                # 岗位列表（模拟数据）
GET  /api/interview/history   # 面试历史
GET  /api/interview/:id/report # 面试报告
```

## 实现要求
1. **WebSocket 连接管理**
   - 连接时 JWT 认证
   - 心跳检测（30s ping/pong）
   - 断线重连恢复（Redis 恢复会话状态）
   - 消息队列（高并发时削峰）

2. **消息处理管道**
   ```
   接收消息 → 验证 → 反序列化 → 路由到对应 Handler → 
   调用业务模块 → 生成响应 → 序列化 → 发送
   ```

3. **流式输出**
   - AI 回答支持流式返回（WebSocket 分片发送）
   - 前端实现打字机效果

4. **错误处理**
   - 业务错误：统一格式返回，不断开连接
   - 系统错误：记录日志，优雅降级

## 输出
- 完整的 gateway 模块
- WebSocket Handler 实现
- REST API 路由
- 前端 React Hook（useWebSocket）示例
- API 文档（Markdown）
```

---

### 阶段 7：前端 React 实现

```markdown
# 任务：实现前端 React 应用

## 目标
构建用户界面，支持简历上传、面试对话、实时反馈。

## 技术栈
- React 18 + TypeScript
- WebSocket 客户端（原生 WebSocket API）
- UI 组件：Tailwind CSS + Headless UI（或 shadcn/ui）
- 状态管理：Zustand（轻量）
- 音频：Web Speech API（预留语音接口）

## 页面结构
```
/App
  /pages
    /Landing       # 首页（介绍 + 开始按钮）
    /Upload        # 简历上传页
    /Optimize      # 简历优化结果页
    /Interview     # 面试页（核心）
    /Report        # 面试报告页
  /components
    /ChatBubble    # 对话气泡（用户/AI）
    /TypingIndicator # AI 思考中
    /SkillRadar    # 技能雷达图（报告页）
    /ResumeViewer  # 简历预览
  /hooks
    /useWebSocket  # WebSocket 封装
    /useInterview  # 面试状态管理
  /types           # 类型定义（与服务端共享）
```

## 面试页（/Interview）功能
1. **三栏布局**
   - 左侧：简历预览（高亮当前考察的技能点）
   - 中间：对话区域（滚动自动到底部）
   - 右侧：实时评分面板（动态更新）

2. **交互细节**
   - AI 提问时显示 "面试官正在输入..."
   - 用户回答支持文本输入 + 语音输入（预留）
   - 发送后禁用输入，等待 AI 响应
   - 支持快捷键（Enter 发送，Shift+Enter 换行）

3. **状态显示**
   - 当前面试阶段标签（技术面试/项目深挖...）
   - 进度条（已回答 / 总问题数）
   - 计时器（单题用时）

## WebSocket Hook 要求
```typescript
// /src/hooks/useWebSocket.ts
interface UseWebSocketReturn {
  connected: boolean;
  send: (event: string, payload: any) => void;
  messages: Message[];
  interviewState: InterviewState | null;
  realtimeScore: number;
  isTyping: boolean;
  startInterview: (resumeId: string, jobId: string) => void;
  sendAnswer: (content: string) => void;
  endInterview: () => void;
}
```

## 输出
- 完整的前端 React 代码
- 类型定义与服务端保持一致
- 模拟数据（用于 UI 开发阶段）
- README（启动说明）
```

---

### 阶段 8：集成测试与优化

```markdown
# 任务：端到端集成与优化

## 目标
整合所有模块，实现完整流程，性能优化。

## 测试场景
1. **完整流程测试**
   - 用户上传简历 → 解析成功 → 优化建议 → 开始面试
   - 技术面试 5 轮 → 项目深挖 3 轮 → 行为面试 2 轮 → 结束
   - 生成报告 → 查看报告

2. **异常场景**
   - 上传损坏的 PDF
   - AI 返回格式错误（测试降级策略）
   - 网络中断恢复
   - 并发面试（多个用户同时）

3. **性能测试**
   - AI 响应时间 < 3s（90% 分位）
   - 支持 100 并发会话

## 优化项
1. **Prompt 优化**
   - 根据测试结果调整 Prompt，减少幻觉
   - 添加 few-shot 示例

2. **缓存策略**
   - 常见问题预生成（Redis 缓存）
   - 简历解析结果缓存

3. **数据库优化**
   - 对话历史分页查询
   - 索引优化

4. **监控**
   - 接入 Sentry 错误监控
   - AI Token 用量监控
   - 面试转化率统计

## 输出
- 集成测试脚本
- Dockerfile + docker-compose.yml
- 部署文档（阿里云/腾讯云）
- 项目总结文档
```

---

## 三、Kiro 提示词使用建议

### 给 Kiro 的标准指令模板

```
【角色】
你是一位资深 Node.js 后端架构师，精通 TypeScript、LangChain、WebSocket 开发。

【当前任务】
<选择上面某一阶段，如"阶段 3：简历解析模块">

【约束条件】
1. 严格遵循接口先行原则，先写 interface，再写实现
2. 所有 AI 调用必须通过 ai-layer 模块，禁止直接调用 OpenAI API
3. 错误处理必须使用 BusinessError，包含 errorCode
4. 代码必须包含 JSDoc 注释
5. 每个 public 方法必须有对应的单元测试

【参考上下文】
<粘贴之前已生成的相关接口定义>

【输出要求】
1. 完整可运行的代码
2. 必要的 SQL migration
3. 单元测试（使用 vitest）
4. 简要说明关键设计决策
```

### 迭代优化提示词

当 Kiro 生成代码后，你可以用这些提示词细化：

```
【优化要求】
1. 为 generateQuestion 方法添加 RAG 支持：从 PostgreSQL 题库中检索相似问题作为 few-shot 示例
2. 添加面试防作弊机制：检测回答是否直接复制简历原文（相似度 > 80% 时提示"请用自己的话回答"）
3. 优化 Token 使用：对话历史超过 4000 token 时，自动调用 ai-layer 生成摘要
```

---

## 四、LangChain vs CrewAI 选择建议

| 场景 | 推荐 | 理由 |
|-----|------|------|
| **当前项目（单 Agent 多任务）** | **LangChain** | 足够灵活，社区成熟，TypeScript 支持好 |
| 未来扩展（多 Agent 协作：技术面试官 + HR 面试官 + 代码评测员） | CrewAI | 多 Agent 编排更自然 |

**建议**：先用 LangChain 实现，后续如果需要多 Agent 协作面试，再迁移到 CrewAI 或 LangGraph。

---

需要我现在就帮你生成**阶段 1（项目骨架）**的完整代码吗？或者你希望我调整某个阶段的提示词细节？
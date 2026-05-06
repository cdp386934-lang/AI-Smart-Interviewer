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
实现要求
状态机
定义合法的状态转移矩阵（如 TECHNICAL → PROJECT_DEEP 允许，TECHNICAL → SELF_INTRO 不允许）
每个状态进入/退出时触发钩子（记录日志、更新统计）
非法转移抛出 BusinessError
记忆管理
短期记忆：Redis 存储最近 20 轮对话
长期记忆：PostgreSQL 持久化完整对话
上下文压缩：对话超过 20 轮时，调用 AI 生成摘要替换早期对话
候选人画像更新
每次回答后，由 interview-engine 评估并更新 profile
画像实时影响问题生成（如 weakAreas 优先考察）
并发控制
一个用户同时只能有一个活跃会话
会话超时机制（30 分钟无操作自动结束）
Redis Key 设计
plain
复制
session:{sessionId}:state        -> 当前状态
session:{sessionId}:messages       -> 消息列表（LRU）
session:{sessionId}:profile        -> 候选人画像
session:{userId}:active            -> 当前活跃会话ID
输出
完整的 session-manager 模块
状态机转移图（文档）
单元测试（状态转移、并发场景）
=====================================================

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
实现要求
问题生成策略
技术题：基于简历技能栈 + 岗位 JD，使用 RAG 从题库匹配
行为题：宝洁八大问变体，结合候选人经历定制
项目深挖：链式追问（先问项目背景 → 架构 → 难点 → 优化）
追问：当回答模糊时，用 5Why 法追问细节
评分体系
多维度评分（技术、沟通、逻辑、经验）
使用 AI 结构化输出（Zod Schema 约束）
评分标准分级：优秀(85+)、良好(70-84)、一般(60-69)、差(<60)
难度动态调整
连续答对 2 题 → 难度 +1
连续答错 2 题 → 难度 -1
达到最高难度且答对 → 标记为 strongArea
最低难度仍答错 → 标记为 weakArea
面试报告
技能雷达图数据
各阶段表现总结
优势与不足分析
录用建议（强烈推荐/推荐/待定/不推荐）
Prompt 模板要求
每个功能需要独立的 Prompt 文件（放在 ai-layer/prompts/，由 interview-engine 调用）：
question-generate.ts - 问题生成 Prompt
answer-evaluate.ts - 回答评分 Prompt
report-generate.ts - 报告生成 Prompt
follow-up-decide.ts - 追问决策 Prompt
输出
完整的 interview-engine 模块
所有 Prompt 模板（中文，专业面试场景）
单元测试（mock AI 返回，测试评分逻辑）


=====================================================

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
REST API 设计
plain
复制
POST /api/auth/login          # 登录（简化版）
POST /api/resume/upload       # 上传简历（multipart/form-data）
GET  /api/resume/:id          # 获取简历详情
POST /api/resume/:id/optimize # 简历优化
GET  /api/jobs                # 岗位列表（模拟数据）
GET  /api/interview/history   # 面试历史
GET  /api/interview/:id/report # 面试报告
实现要求
WebSocket 连接管理
连接时 JWT 认证
心跳检测（30s ping/pong）
断线重连恢复（Redis 恢复会话状态）
消息队列（高并发时削峰）
消息处理管道
plain
复制
接收消息 → 验证 → 反序列化 → 路由到对应 Handler → 
调用业务模块 → 生成响应 → 序列化 → 发送
流式输出
AI 回答支持流式返回（WebSocket 分片发送）
前端实现打字机效果
错误处理
业务错误：统一格式返回，不断开连接
系统错误：记录日志，优雅降级
输出
完整的 gateway 模块
WebSocket Handler 实现
REST API 路由
前端 React Hook（useWebSocket）示例
API 文档（Markdown）


=====================================================

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
plain
复制

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
输出
完整的前端 React 代码
类型定义与服务端保持一致
模拟数据（用于 UI 开发阶段）
README（启动说明）
plain
复制

=====================================================

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
三、Kiro 提示词使用建议
给 Kiro 的标准指令模板
plain
复制
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
迭代优化提示词
当 Kiro 生成代码后，你可以用这些提示词细化：
plain
复制
【优化要求】
1. 为 generateQuestion 方法添加 RAG 支持：从 PostgreSQL 题库中检索相似问题作为 few-shot 示例
2. 添加面试防作弊机制：检测回答是否直接复制简历原文（相似度 > 80% 时提示"请用自己的话回答"）
3. 优化 Token 使用：对话历史超过 4000 token 时，自动调用 ai-layer 生成摘要
四、LangChain vs CrewAI 选择建议
表格
场景	推荐	理由
当前项目（单 Agent 多任务）	LangChain	足够灵活，社区成熟，TypeScript 支持好
未来扩展（多 Agent 协作：技术面试官 + HR 面试官 + 代码评测员）	CrewAI	多 Agent 编排更自然
建议：先用 LangChain 实现，后续如果需要多 Agent 协作面试，再迁移到 CrewAI 或 LangGraph。
需要我现在就帮你生成阶段 1（项目骨架）的完整代码吗？或者你希望我调整某个阶段的提示词细节？



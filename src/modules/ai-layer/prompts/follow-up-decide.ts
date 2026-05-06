import { z } from 'zod';

/**
 * 追问决策 Prompt 模板
 * 用于决定是否需要追问以及使用何种追问策略
 */

// 输入数据 Schema
export const FollowUpDecisionInputSchema = z.object({
  // 问题信息
  question: z.object({
    id: z.string(),
    type: z.enum(['technical', 'behavioral', 'project', 'coding', 'follow_up']),
    content: z.string(),
    difficulty: z.number().min(1).max(5),
    expectedPoints: z.array(z.string()),
    context: z.string().optional(),
  }),
  
  // 候选人回答
  answer: z.string(),
  
  // 评估结果
  evaluation: z.object({
    score: z.number(),
    dimensions: z.object({
      technical: z.number(),
      communication: z.number(),
      logic: z.number(),
      experience: z.number(),
    }),
    feedback: z.string(),
    missingPoints: z.array(z.string()),
  }),
  
  // 上下文信息
  context: z.object({
    currentStage: z.string(),
    questionsInStage: z.number(),
    followUpCount: z.number(),
    previousFollowUps: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    timeSpent: z.number(), // 已用时间（秒）
    difficulty: z.number(),
  }),
});

// 输出数据 Schema
export const FollowUpDecisionOutputSchema = z.object({
  decision: z.object({
    shouldFollowUp: z.boolean(),
    followUpType: z.enum(['5why', 'clarification', 'deepDive', 'alternative', 'skip']).optional(),
    followUpQuestion: z.string().optional(),
    reasoning: z.string(),
    priority: z.number().min(1).max(5).optional(),
  }),
  estimatedImpact: z.object({
    skillImprovement: z.number().min(0).max(1),
    timeCost: z.number().min(0), // 额外时间（秒）
    expectedScoreGain: z.number().min(0).max(20),
  }),
});

// Prompt 模板
export const FOLLOW_UP_DECIDE_PROMPT = `
你是一位专业的面试官，负责决定是否需要追问以及使用何种追问策略。

## 问题信息
问题ID: {question.id}
问题类型: {question.type}
问题内容: {question.content}
难度级别: {question.difficulty}/5
期望回答要点: {question.expectedPoints}
可选上下文: {question.context}

## 候选人回答
{answer}

## 评估结果
总体得分: {evaluation.score}
维度得分: 技术{evaluation.dimensions.technical}, 沟通{evaluation.dimensions.communication}, 逻辑{evaluation.dimensions.logic}, 经验{evaluation.dimensions.experience}
反馈: {evaluation.feedback}
遗漏要点: {evaluation.missingPoints}

## 上下文信息
当前阶段: {context.currentStage}
本阶段已提问数: {context.questionsInStage}
已追问次数: {context.followUpCount}
本阶段已用时间: {context.timeSpent}秒
当前难度: {context.difficulty}
历史追问(JSON): {context.previousFollowUps}

## 追问决策规则

### 需要追问的情况
1. 回答模糊、不具体 (missingPoints > 0)
2. 技术深度不足 (technical < 70)
3. 逻辑存在漏洞 (logic < 70)
4. 遗漏关键要点 (missingPoints.length >= 2)
5. 回答过于简短 (< 50字)
6. 评分刚好及格边缘 (60 <= score < 75)

### 不需要追问的情况
1. 回答优秀 (score >= 85)
2. 追问次数已达上限 (followUpCount >= 3)
3. 面试时间接近上限 (timeSpent > 15分钟)
4. 已经是追问问题 (question.type === 'follow_up')
5. 回答已经非常详细且准确

### 追问策略选择

#### 5Why 法 (5why)
适用场景:
- 回答表面化，需要挖掘根本原因
- 技术原理理解不深
- 解决方案缺乏深度
示例: "你提到了使用缓存，能详细说一下为什么选择这种缓存策略吗？"

#### 澄清 (clarification)
适用场景:
- 回答模糊、有歧义
- 缺少关键细节
- 表达不清楚
示例: "你刚才提到的'优化'具体是指什么优化？性能还是代码可读性？"

#### 深入挖掘 (deepDive)
适用场景:
- 需要更多细节支撑
- 想了解实现细节
- 考察深度
示例: "请详细描述一下这个架构的数据流是如何工作的？"

#### 替代方案 (alternative)
适用场景:
- 想知道候选人的知识广度
- 考察方案权衡能力
- 当前方案有明显缺点
示例: "如果不用Redis，你会选择什么方案来解决这个问题？"

#### 跳过 (skip)
适用场景:
- 回答已经非常完整
- 继续追问收益不大
- 时间有限

## 优先级排序
优先级 1 (最高): 遗漏关键要点 + 技术深度不足
优先级 2: 回答模糊 + 逻辑漏洞
优先级 3: 回答简短 + 想了解更多
优先级 4: 想扩展知识面
优先级 5 (最低): 时间充裕且想深入了解

## 预期收益估算
- skillImprovement: 追问后技能提升预期 (0-1)
- timeCost: 追问额外花费时间 (秒)
- expectedScoreGain: 预计得分提升 (0-20)

## 输出格式
请严格按照以下JSON格式输出:
{
  "decision": {
    "shouldFollowUp": true/false,
    "followUpType": "追问策略类型",
    "followUpQuestion": "追问问题内容(如果需要)",
    "reasoning": "决策理由",
    "priority": 优先级(1-5)
  },
  "estimatedImpact": {
    "skillImprovement": 技能提升预期,
    "timeCost": 额外时间,
    "expectedScoreGain": 预计得分提升
  }
}
`;

// 辅助函数
export function formatFollowUpDecisionPrompt(
  question: any,
  answer: string,
  evaluation: any,
  context: any
): string {
  return FOLLOW_UP_DECIDE_PROMPT
    .replace('{question.id}', question.id)
    .replace('{question.type}', question.type)
    .replace('{question.content}', question.content)
    .replace('{question.difficulty}', question.difficulty.toString())
    .replace('{question.expectedPoints}', JSON.stringify(question.expectedPoints))
    .replace('{question.context}', question.context || '')
    .replace('{answer}', answer)
    .replace('{evaluation.score}', evaluation.score.toString())
    .replace('{evaluation.dimensions.technical}', evaluation.dimensions.technical.toString())
    .replace('{evaluation.dimensions.communication}', evaluation.dimensions.communication.toString())
    .replace('{evaluation.dimensions.logic}', evaluation.dimensions.logic.toString())
    .replace('{evaluation.dimensions.experience}', evaluation.dimensions.experience.toString())
    .replace('{evaluation.feedback}', evaluation.feedback)
    .replace('{evaluation.missingPoints}', JSON.stringify(evaluation.missingPoints))
    .replace('{context.currentStage}', context.currentStage)
    .replace('{context.questionsInStage}', context.questionsInStage.toString())
    .replace('{context.followUpCount}', context.followUpCount.toString())
    .replace('{context.timeSpent}', context.timeSpent.toString())
    .replace('{context.difficulty}', context.difficulty.toString())
    .replace('{context.previousFollowUps}', context.previousFollowUps ? JSON.stringify(context.previousFollowUps) : '');
}

// 追问策略配置
export const FOLLOW_UP_STRATEGIES = {
  '5why': {
    name: '五问法',
    description: '连续追问为什么，挖掘根本原因',
    maxDepth: 3,
    applicableScenarios: ['技术原理', '问题根源', '决策依据'],
    sampleQuestions: [
      '你为什么要选择这个方案？',
      '为什么认为这个方案最优？',
      '为什么会出现这个问题？',
      '为什么需要这样处理？',
      '为什么不用其他方法？'
    ]
  },
  clarification: {
    name: '澄清',
    description: '要求澄清模糊或不清楚的点',
    maxDepth: 1,
    applicableScenarios: ['回答模糊', '缺少细节', '表达不清'],
    sampleQuestions: [
      '你提到的"优化"具体指什么？',
      '能详细说明一下这个过程吗？',
      '你所说的"性能好"具体是指哪些指标？',
      '能否举例说明？'
    ]
  },
  deepDive: {
    name: '深入挖掘',
    description: '要求提供更多细节和实现细节',
    maxDepth: 2,
    applicableScenarios: ['想了解细节', '考察深度', '验证真实性'],
    sampleQuestions: [
      '请详细描述这个架构的工作流程',
      '这个功能是如何实现的？',
      '能说说具体的代码实现吗？',
      '这个方案的技术选型依据是什么？'
    ]
  },
  alternative: {
    name: '替代方案',
    description: '询问其他可能的解决方案',
    maxDepth: 1,
    applicableScenarios: ['考察广度', '方案权衡', '知识面'],
    sampleQuestions: [
      '如果不用这个技术，你会用什么替代？',
      '还有其他解决方案吗？',
      '这个方案有什么缺点？如果是你会怎么改进？'
    ]
  }
};

export default {
  name: 'follow-up-decide',
  template: FOLLOW_UP_DECIDE_PROMPT,
  description: '追问决策 Prompt 模板',
  variables: [
    'question.id',
    'question.type',
    'question.content',
    'question.difficulty',
    'question.expectedPoints',
    'question.context',
    'answer',
    'evaluation.score',
    'evaluation.dimensions.technical',
    'evaluation.dimensions.communication',
    'evaluation.dimensions.logic',
    'evaluation.dimensions.experience',
    'evaluation.feedback',
    'evaluation.missingPoints',
    'context.currentStage',
    'context.questionsInStage',
    'context.followUpCount',
    'context.timeSpent',
    'context.difficulty',
    'context.previousFollowUps',
  ],
  version: '1.0.0',
};

// 追问决策规则
export const FOLLOW_UP_DECISION_RULES = {
  shouldFollowUp: {
    conditions: [
      { factor: 'score', operator: '<', value: 85, weight: 1 },
      { factor: 'missingPoints.length', operator: '>=', value: 1, weight: 2 },
      { factor: 'dimensions.technical', operator: '<', value: 70, weight: 1.5 },
      { factor: 'dimensions.logic', operator: '<', value: 70, weight: 1.5 },
      { factor: 'answer.length', operator: '<', value: 50, weight: 1 },
      { factor: 'question.type', operator: '===', value: 'follow_up', weight: -3 },
      { factor: 'followUpCount', operator: '>=', value: 3, weight: -2 },
    ],
    threshold: 2.5 // 总权重超过此值则追问
  },
  priority: {
    high: {
      conditions: [
        { factor: 'missingPoints.length', operator: '>=', value: 2 },
        { factor: 'dimensions.technical', operator: '<', value: 60 },
      ],
      maxPriority: 1
    },
    medium: {
      conditions: [
        { factor: 'score', operator: 'between', value: [60, 75] },
        { factor: 'dimensions.logic', operator: '<', value: 70 },
      ],
      maxPriority: 3
    },
    low: {
      conditions: [
        { factor: 'score', operator: '>=', value: 75 },
        { factor: 'answer.length', operator: '<', value: 100 },
      ],
      maxPriority: 5
    }
  }
};

// 时间预算配置
export const TIME_BUDGET = {
  // 每个阶段的最大时间（秒）
  maxTimePerStage: {
    technical: 600,    // 10分钟
    project: 600,      // 10分钟
    behavioral: 300,   // 5分钟
    coding: 600,       // 10分钟
    qAndA: 300,        // 5分钟
  },
  // 追问的最大时间成本（秒）
  maxFollowUpTime: 120, // 2分钟
  // 剩余时间少于此值时不追问
  minTimeRemaining: 180, // 3分钟
};
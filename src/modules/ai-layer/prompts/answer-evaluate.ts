import { z } from 'zod';

/**
 * 回答评分 Prompt 模板
 * 用于评估候选人回答的质量
 */

// 输入数据 Schema
export const AnswerEvaluationInputSchema = z.object({
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
  
  // 候选人信息
  candidate: z.object({
    name: z.string(),
    skills: z.array(z.object({
      name: z.string(),
      level: z.number().min(0).max(1).optional(),
    })),
    experience: z.array(z.object({
      role: z.string(),
      duration: z.string(),
      description: z.string(),
    })),
  }),
  
  // 当前技能掌握度
  currentSkills: z.record(z.string(), z.number().min(0).max(1)),
  
  // 面试上下文
  context: z.object({
    stage: z.string(),
    previousEvaluations: z.array(z.object({
      questionId: z.string(),
      score: z.number(),
      feedback: z.string(),
    })).optional(),
  }),
});

// 输出数据 Schema
export const AnswerEvaluationOutputSchema = z.object({
  evaluation: z.object({
    questionId: z.string(),
    score: z.number().min(0).max(100),
    dimensions: z.object({
      technical: z.number().min(0).max(100),
      communication: z.number().min(0).max(100),
      logic: z.number().min(0).max(100),
      experience: z.number().min(0).max(100),
    }),
    feedback: z.string(),
    missingPoints: z.array(z.string()),
    followUpNeeded: z.boolean(),
    skillUpdates: z.record(z.string(), z.number().min(0).max(1)),
  }),
  reasoning: z.string(),
  difficultyAdjustment: z.enum(['increase', 'decrease', 'maintain']).optional(),
  areaClassification: z.enum(['strongArea', 'weakArea', 'neutral']).optional(),
});

// Prompt 模板
export const ANSWER_EVALUATION_PROMPT = `
你是一位专业的面试官，负责评估候选人的回答质量。

## 问题信息
问题ID: {question.id}
问题类型: {question.type}
问题内容: {question.content}
难度级别: {question.difficulty}/5
期望回答要点: {question.expectedPoints}
可选上下文: {question.context}

## 候选人回答
{answer}

## 候选人信息
姓名: {candidate.name}
技能: {candidate.skills}
经验: {candidate.experience}

## 当前技能掌握度
{currentSkills}

## 面试上下文
当前阶段: {context.stage}
历史评估(JSON): {context.previousEvaluations}

## 评估要求
请从以下四个维度进行评估:

### 1. 技术深度 (technical: 0-100分)
- 技术准确性: 概念、原理、实现是否正确
- 技术深度: 是否深入理解底层原理
- 技术广度: 是否了解相关技术和最佳实践
- 实际应用: 能否结合实际场景应用

### 2. 沟通表达 (communication: 0-100分)
- 表达清晰度: 回答是否清晰、有条理
- 结构化思维: 是否有逻辑结构
- 重点突出: 是否抓住关键点
- 语言表达: 用词是否准确、专业

### 3. 逻辑思维 (logic: 0-100分)
- 逻辑严密性: 推理是否严密
- 问题分析: 分析问题的能力
- 解决方案: 解决方案的合理性
- 批判性思维: 是否有独立思考和判断

### 4. 经验匹配 (experience: 0-100分)
- 经验相关性: 回答是否体现相关经验
- 案例质量: 案例是否具体、有代表性
- 经验总结: 是否从经验中总结学习
- 成长潜力: 是否展示学习和成长能力

## 评分标准
### 优秀 (85-100分)
- 完全覆盖期望要点，且有深入见解
- 回答清晰、有条理、有深度
- 展示出色的技术能力和经验

### 良好 (70-84分)
- 基本覆盖期望要点
- 回答较为清晰，有一定深度
- 展示良好的技术能力和经验

### 一般 (60-69分)
- 部分覆盖期望要点
- 回答基本清晰，但深度不足
- 技术能力和经验一般

### 差 (0-59分)
- 未覆盖关键要点
- 回答模糊、混乱
- 技术能力和经验不足

## 技能更新规则
根据回答质量，更新技能掌握度 (0-1):
- 优秀回答: 技能掌握度 +0.2 (上限1.0)
- 良好回答: 技能掌握度 +0.1 (上限1.0)
- 一般回答: 技能掌握度不变
- 差回答: 技能掌握度 -0.1 (下限0.0)

## 追问决策
需要追问的情况:
1. 回答模糊、不具体
2. 遗漏关键要点
3. 逻辑存在明显漏洞
4. 需要进一步澄清

追问策略:
- 5Why法: 连续追问为什么，挖掘根本原因
- 澄清: 要求澄清模糊点
- 深入挖掘: 要求提供更多细节
- 替代方案: 询问是否有其他解决方案

## 输出格式
请严格按照以下JSON格式输出:
{
  "evaluation": {
    "questionId": "问题ID",
    "score": 总体得分(0-100),
    "dimensions": {
      "technical": 技术深度得分(0-100),
      "communication": 沟通表达得分(0-100),
      "logic": 逻辑思维得分(0-100),
      "experience": 经验匹配得分(0-100)
    },
    "feedback": "详细反馈",
    "missingPoints": ["遗漏要点1", "遗漏要点2", ...],
    "followUpNeeded": true/false,
    "skillUpdates": {"技能名称": 新掌握度, ...}
  },
  "reasoning": "评估理由",
  "difficultyAdjustment": "难度调整建议",
  "areaClassification": "区域分类"
}
`;

// 辅助函数
export function formatAnswerEvaluationPrompt(
  question: any,
  answer: string,
  candidate: any,
  currentSkills: Record<string, number>,
  context: any
): string {
  return ANSWER_EVALUATION_PROMPT
    .replace('{question.id}', question.id)
    .replace('{question.type}', question.type)
    .replace('{question.content}', question.content)
    .replace('{question.difficulty}', question.difficulty.toString())
    .replace('{question.expectedPoints}', JSON.stringify(question.expectedPoints))
    .replace('{question.context}', question.context || '')
    .replace('{answer}', answer)
    .replace('{candidate.name}', candidate.name || '候选人')
    .replace('{candidate.skills}', JSON.stringify(candidate.skills, null, 2))
    .replace('{candidate.experience}', JSON.stringify(candidate.experience, null, 2))
    .replace('{currentSkills}', JSON.stringify(currentSkills, null, 2))
    .replace('{context.stage}', context.stage)
    .replace('{context.previousEvaluations}', context.previousEvaluations ? JSON.stringify(context.previousEvaluations) : '');
}

// 评分维度权重配置
export const SCORING_WEIGHTS = {
  technical: {
    weight: 0.4,
    subDimensions: {
      accuracy: 0.3,
      depth: 0.3,
      breadth: 0.2,
      application: 0.2,
    }
  },
  communication: {
    weight: 0.2,
    subDimensions: {
      clarity: 0.3,
      structure: 0.3,
      focus: 0.2,
      language: 0.2,
    }
  },
  logic: {
    weight: 0.2,
    subDimensions: {
      rigor: 0.3,
      analysis: 0.3,
      solution: 0.2,
      criticalThinking: 0.2,
    }
  },
  experience: {
    weight: 0.2,
    subDimensions: {
      relevance: 0.3,
      caseQuality: 0.3,
      summary: 0.2,
      growth: 0.2,
    }
  }
};

// 难度调整规则
export const DIFFICULTY_ADJUSTMENT_RULES = {
  increase: {
    conditions: [
      '连续2题得分≥85',
      '当前难度<5且表现优秀',
      '技能掌握度显著提升'
    ],
    amount: 1
  },
  decrease: {
    conditions: [
      '连续2题得分<60',
      '当前难度>1且表现差',
      '技能掌握度显著下降'
    ],
    amount: 1
  },
  maintain: {
    conditions: [
      '得分在60-84之间',
      '表现稳定',
      '无需调整'
    ]
  }
};

// 区域分类规则
export const AREA_CLASSIFICATION_RULES = {
  strongArea: {
    conditions: [
      '难度=5且得分≥85',
      '技能掌握度≥0.8',
      '连续优秀表现'
    ]
  },
  weakArea: {
    conditions: [
      '难度=1且得分<60',
      '技能掌握度≤0.3',
      '连续差表现'
    ]
  },
  neutral: {
    conditions: [
      '其他情况'
    ]
  }
};

export default {
  name: 'answer-evaluate',
  template: ANSWER_EVALUATION_PROMPT,
  description: '回答评分 Prompt 模板',
  variables: ['question.id', 'question.type', 'question.content', 'question.difficulty', 'question.expectedPoints', 'question.context', 'answer', 'candidate.name', 'candidate.skills', 'candidate.experience', 'currentSkills', 'context.stage', 'context.previousEvaluations'],
  version: '1.0.0',
};

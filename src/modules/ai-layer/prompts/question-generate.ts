import { z } from 'zod';

/**
 * 问题生成 Prompt 模板
 * 用于生成面试问题，基于简历技能栈和岗位要求
 */

// 输入数据 Schema
export const QuestionGenerationInputSchema = z.object({
  // 候选人信息
  candidate: z.object({
    name: z.string(),
    skills: z.array(z.object({
      name: z.string(),
      level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      years: z.number().optional(),
    })),
    workExperience: z.array(z.object({
      company: z.string(),
      position: z.string(),
      duration: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
    })),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      role: z.string(),
    })),
  }),
  
  // 岗位要求
  job: z.object({
    title: z.string(),
    level: z.enum(['junior', 'mid', 'senior', 'lead']),
    requiredSkills: z.array(z.string()),
    description: z.string(),
  }),
  
  // 面试阶段
  stage: z.enum([
    'technical',
    'behavioral', 
    'project',
    'coding',
    'follow_up'
  ]),
  
  // 难度级别 (1-5)
  difficulty: z.number().min(1).max(5),
  
  // 上下文信息
  context: z.object({
    previousQuestion: z.string().optional(),
    previousAnswer: z.string().optional(),
    currentProject: z.string().optional(),
    currentSkill: z.string().optional(),
  }).optional(),
});

// 输出数据 Schema
export const QuestionGenerationOutputSchema = z.object({
  question: z.object({
    id: z.string(),
    type: z.enum(['technical', 'behavioral', 'project', 'coding', 'follow_up']),
    content: z.string(),
    difficulty: z.number().min(1).max(5),
    expectedPoints: z.array(z.string()),
    context: z.string().optional(),
    timeout: z.number().optional(),
  }),
  reasoning: z.string(),
  followUpStrategy: z.enum(['5why', 'clarification', 'deepDive', 'alternative']).optional(),
});

// Prompt 模板
export const QUESTION_GENERATION_PROMPT = `
你是一位专业的面试官，负责为技术岗位生成面试问题。

## 候选人信息
姓名: {candidate.name}
技能栈: {candidate.skills}
工作经验: {candidate.workExperience}
项目经历: {candidate.projects}

## 岗位要求
职位: {job.title}
级别: {job.level}
必备技能: {job.requiredSkills}
岗位描述: {job.description}

## 面试阶段
当前阶段: {stage}
难度级别: {difficulty}/5

## 上下文信息
上一个问题: {context.previousQuestion}
上一个回答: {context.previousAnswer}
当前讨论项目: {context.currentProject}
当前考察技能: {context.currentSkill}

## 生成要求
1. 问题类型: {stage}
2. 难度级别: {difficulty}/5
3. 问题内容: 清晰、具体、有针对性
4. 期望回答要点: 列出3-5个关键考察点
5. 上下文: 如果基于特定项目或技能，请说明
6. 建议回答时间: 根据难度设置合理时间

## 不同类型问题的生成策略
### 技术问题 (technical)
- 基于候选人的技能栈和岗位要求
- 考察深度和广度
- 结合实际应用场景

### 行为问题 (behavioral)
- 基于宝洁八大问变体
- 结合候选人经历定制
- 考察软技能和价值观

### 项目深挖 (project)
- 链式追问: 背景 → 架构 → 难点 → 优化
- 考察项目经验和解决问题的能力
- 关注技术选型和决策过程

### 代码考核 (coding)
- 提供具体编码场景
- 考察算法、数据结构、代码质量
- 包含边界条件和异常处理

### 追问问题 (follow_up)
- 当回答模糊时使用5Why法
- 深入挖掘细节
- 澄清理解偏差

## 输出格式
请严格按照以下JSON格式输出:
{
  "question": {
    "id": "生成唯一ID",
    "type": "问题类型",
    "content": "问题内容",
    "difficulty": 难度级别,
    "expectedPoints": ["期望回答要点1", "期望回答要点2", ...],
    "context": "上下文说明",
    "timeout": 建议回答时间(秒)
  },
  "reasoning": "生成这个问题的理由",
  "followUpStrategy": "追问策略(如果需要)"
}
`;

// 辅助函数
export function formatQuestionGenerationPrompt(
  candidate: any,
  job: any,
  stage: string,
  difficulty: number,
  context?: any
): string {
  return QUESTION_GENERATION_PROMPT
    .replace('{candidate.name}', candidate.name || '候选人')
    .replace('{candidate.skills}', JSON.stringify(candidate.skills, null, 2))
    .replace('{candidate.workExperience}', JSON.stringify(candidate.workExperience, null, 2))
    .replace('{candidate.projects}', JSON.stringify(candidate.projects, null, 2))
    .replace('{job.title}', job.title)
    .replace('{job.level}', job.level)
    .replace('{job.requiredSkills}', JSON.stringify(job.requiredSkills))
    .replace('{job.description}', job.description)
    .replace('{stage}', stage)
    .replace('{difficulty}', difficulty.toString())
    .replace('{context.previousQuestion}', context?.previousQuestion || '')
    .replace('{context.previousAnswer}', context?.previousAnswer || '')
    .replace('{context.currentProject}', context?.currentProject || '')
    .replace('{context.currentSkill}', context?.currentSkill || '');
}

// 问题生成策略配置
export const QUESTION_GENERATION_STRATEGIES = {
  technical: {
    description: '技术问题生成策略',
    focusAreas: ['核心技能', '技术深度', '实际应用'],
    difficultyMapping: {
      1: '基础概念和语法',
      2: '常见应用场景',
      3: '复杂问题解决',
      4: '系统设计',
      5: '架构决策和优化'
    }
  },
  behavioral: {
    description: '行为问题生成策略',
    focusAreas: ['沟通能力', '团队合作', '问题解决', '领导力'],
    templates: [
      '请分享一个你遇到的最具挑战性的项目，你是如何解决的？',
      '描述一次你与团队成员发生冲突的经历，你是如何处理的？',
      '当你面对一个不可能完成的任务时，你会如何应对？',
      '请分享一次你成功说服他人的经历。'
    ]
  },
  project: {
    description: '项目深挖策略',
    phases: ['背景', '架构', '难点', '优化'],
    depthLevels: {
      1: '项目概述和职责',
      2: '技术选型和架构',
      3: '挑战和解决方案',
      4: '性能优化和扩展',
      5: '架构演进和反思'
    }
  },
  coding: {
    description: '代码考核策略',
    types: ['算法', '数据结构', '系统设计', '代码重构'],
    difficultyMapping: {
      1: '基础语法和简单算法',
      2: '中等难度算法',
      3: '复杂算法和数据结构',
      4: '系统设计和架构',
      5: '性能优化和并发处理'
    }
  }
};

export default {
  name: 'question-generate',
  template: QUESTION_GENERATION_PROMPT,
  description: '问题生成 Prompt 模板',
  variables: ['candidate.name', 'candidate.skills', 'candidate.workExperience', 'candidate.projects', 'job.title', 'job.level', 'job.requiredSkills', 'job.description', 'stage', 'difficulty', 'context.previousQuestion', 'context.previousAnswer', 'context.currentProject', 'context.currentSkill'],
  version: '1.0.0',
};

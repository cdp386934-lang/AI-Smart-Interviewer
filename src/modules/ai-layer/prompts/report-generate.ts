import { z } from 'zod';

/**
 * 面试报告生成 Prompt 模板
 * 用于生成完整的面试评估报告
 */

// 输入数据 Schema
export const ReportGenerationInputSchema = z.object({
  // 会话信息
  session: z.object({
    id: z.string(),
    config: z.object({
      jobTitle: z.string(),
      jobLevel: z.string(),
      difficulty: z.string(),
      focusAreas: z.array(z.string()),
    }),
    resume: z.any(),
    profile: z.object({
      skills: z.record(z.string(), z.number()),
      weakAreas: z.array(z.string()),
      strongAreas: z.array(z.string()),
      personalityHints: z.array(z.string()),
      overallScore: z.number(),
    }),
    metadata: z.object({
      createdAt: z.string(),
      timeSpent: z.number(),
      totalMessages: z.number(),
    }),
  }),
  
  // 评估历史
  evaluations: z.array(z.object({
    questionId: z.string(),
    question: z.object({
      type: z.string(),
      content: z.string(),
      difficulty: z.number(),
    }),
    answer: z.string(),
    score: z.number(),
    dimensions: z.object({
      technical: z.number(),
      communication: z.number(),
      logic: z.number(),
      experience: z.number(),
    }),
    feedback: z.string(),
    timestamp: z.string(),
  })),
  
  // 问题列表
  questions: z.array(z.object({
    id: z.string(),
    type: z.string(),
    content: z.string(),
    difficulty: z.number(),
  })),
});

// 输出数据 Schema
export const ReportGenerationOutputSchema = z.object({
  report: z.object({
    sessionId: z.string(),
    summary: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recommendations: z.array(z.string()),
    overallScore: z.number(),
    hiringRecommendation: z.enum(['strongly_recommend', 'recommend', 'pending', 'not_recommend']),
    skillRadar: z.record(z.string(), z.number()),
    stagePerformance: z.record(z.string(), z.object({
      averageScore: z.number(),
      questionCount: z.number(),
      feedback: z.string(),
    })),
    detailedAnalysis: z.object({
      technical: z.string(),
      communication: z.string(),
      logic: z.string(),
      experience: z.string(),
    }),
  }),
  reasoning: z.string(),
});

// Prompt 模板
export const REPORT_GENERATION_PROMPT = `
你是一位专业的面试评估专家，负责生成完整的面试评估报告。

## 会话信息
会话ID: {session.id}
岗位: {session.config.jobTitle}
级别: {session.config.jobLevel}
难度: {session.config.difficulty}
重点考察领域: {session.config.focusAreas}

## 候选人画像
技能掌握度: {session.profile.skills}
优势领域: {session.profile.strongAreas}
薄弱领域: {session.profile.weakAreas}
性格特征: {session.profile.personalityHints}
综合得分: {session.profile.overallScore}

## 面试时长
开始时间: {session.metadata.createdAt}
总耗时: {session.metadata.timeSpent}秒
总消息数: {session.metadata.totalMessages}

## 评估历史
{evaluations}

## 问题列表
{questions}

## 报告要求

### 1. 总结 (summary)
- 简要概括候选人整体表现
- 突出亮点和不足
- 100-200字

### 2. 优势 (strengths)
列出3-5个优势领域:
- 技术能力优势
- 经验匹配优势
- 软技能优势
- 发展潜力

### 3. 不足 (weaknesses)
列出2-4个需要改进的领域:
- 技术短板
- 经验不足
- 软技能待提升
- 具体建议

### 4. 建议 (recommendations)
- 培训建议
- 岗位匹配建议
- 发展路径建议

### 5. 综合得分 (overallScore)
根据所有评估维度计算加权平均分:
- 技术深度 (40%)
- 沟通表达 (20%)
- 逻辑思维 (20%)
- 经验匹配 (20%)

### 6. 录用建议 (hiringRecommendation)
强烈推荐 (strongly_recommend):
- 综合得分≥85
- 各维度表现优秀
- 完全匹配岗位要求

推荐 (recommend):
- 综合得分70-84
- 各维度表现良好
- 基本匹配岗位要求

待定 (pending):
- 综合得分60-69
- 部分维度表现一般
- 需要进一步评估

不推荐 (not_recommend):
- 综合得分<60
- 多个维度表现较差
- 不匹配岗位要求

### 7. 技能雷达图数据 (skillRadar)
为每个技能生成0-100的分数:
{skillRadarTemplate}

### 8. 阶段表现 (stagePerformance)
按面试阶段统计:
- 技术面试: 平均分、问题数、阶段评价
- 项目深挖: 平均分、问题数、阶段评价
- 行为面试: 平均分、问题数、阶段评价
- 代码考核: 平均分、问题数、阶段评价

### 9. 详细分析 (detailedAnalysis)
- 技术维度分析
- 沟通维度分析
- 逻辑维度分析
- 经验维度分析

## 输出格式
请严格按照以下JSON格式输出:
{
  "report": {
    "sessionId": "会话ID",
    "summary": "总结内容",
    "strengths": ["优势1", "优势2", ...],
    "weaknesses": ["不足1", "不足2", ...],
    "recommendations": ["建议1", "建议2", ...],
    "overallScore": 综合得分,
    "hiringRecommendation": "录用建议",
    "skillRadar": {"技能名": 分数, ...},
    "stagePerformance": {
      "技术面试": {"averageScore": 分数, "questionCount": 数量, "feedback": 评价},
      ...
    },
    "detailedAnalysis": {
      "technical": "技术维度详细分析",
      "communication": "沟通维度详细分析",
      "logic": "逻辑维度详细分析",
      "experience": "经验维度详细分析"
    }
  },
  "reasoning": "生成报告的理由"
}
`;

// 辅助函数
export function formatReportGenerationPrompt(
  session: any,
  evaluations: any[],
  questions: any[]
): string {
  // 计算技能雷达图模板
  const skillRadarTemplate = Object.entries(session.profile.skills || {})
    .map(([skill, level]) => `${skill}: ${Math.round(level * 100)}`)
    .join(', ');
  
  // 格式化评估历史
  const evaluationsStr = evaluations.map((evalItem, index) => `
=== 问题 ${index + 1} ===
类型: ${evalItem.question.type}
问题: ${evalItem.question.content}
难度: ${evalItem.question.difficulty}/5
回答: ${evalItem.answer}
得分: ${evalItem.score}
维度得分: 技术${evalItem.dimensions.technical}, 沟通${evalItem.dimensions.communication}, 逻辑${evalItem.dimensions.logic}, 经验${evalItem.dimensions.experience}
反馈: ${evalItem.feedback}
时间: ${evalItem.timestamp}
`).join('\n');
  
  // 格式化问题列表
  const questionsStr = questions.map((q, index) => `
${index + 1}. [${q.type}] ${q.content} (难度: ${q.difficulty}/5)
`).join('\n');
  
  return REPORT_GENERATION_PROMPT
    .replace('{session.id}', session.id)
    .replace('{session.config.jobTitle}', session.config.jobTitle)
    .replace('{session.config.jobLevel}', session.config.jobLevel)
    .replace('{session.config.difficulty}', session.config.difficulty)
    .replace('{session.config.focusAreas}', JSON.stringify(session.config.focusAreas))
    .replace('{session.profile.skills}', JSON.stringify(session.profile.skills, null, 2))
    .replace('{session.profile.strongAreas}', JSON.stringify(session.profile.strongAreas))
    .replace('{session.profile.weakAreas}', JSON.stringify(session.profile.weakAreas))
    .replace('{session.profile.personalityHints}', JSON.stringify(session.profile.personalityHints))
    .replace('{session.profile.overallScore}', session.profile.overallScore?.toString() || '0')
    .replace('{session.metadata.createdAt}', session.metadata.createdAt)
    .replace('{session.metadata.timeSpent}', session.metadata.timeSpent?.toString() || '0')
    .replace('{session.metadata.totalMessages}', session.metadata.totalMessages?.toString() || '0')
    .replace('{evaluations}', evaluationsStr)
    .replace('{questions}', questionsStr)
    .replace('{skillRadarTemplate}', skillRadarTemplate);
}

// 报告模板配置
export const REPORT_TEMPLATES = {
  summary: {
    template: '该候选人在{jobTitle}岗位面试中总体表现{performance}。{highlight}。建议{h recommendation}。',
    variables: ['jobTitle', 'performance', 'highlight', 'recommendation']
  },
  strengths: {
    categories: [
      '技术能力',
      '项目经验', 
      '问题解决',
      '沟通表达',
      '学习能力',
      '团队协作'
    ]
  },
  weaknesses: {
    categories: [
      '技术深度',
      '经验广度',
      '系统设计',
      '沟通技巧',
      '项目管理'
    ]
  },
  recommendations: {
    highPriority: [
      '建议参加公司内部技术培训',
      '建议进行系统设计专项提升',
      '建议加强代码规范学习'
    ],
    mediumPriority: [
      '建议扩大技术知识面',
      '建议提升项目管理能力',
      '建议加强沟通技巧'
    ],
    lowPriority: [
      '建议保持学习热情',
      '建议多参与技术分享',
      '建议积累更多项目经验'
    ]
  }
};

// 评分分级定义
export const SCORING_GRADES = {
  excellent: {
    min: 85,
    max: 100,
    label: '优秀',
    description: '完全满足岗位要求，表现卓越'
  },
  good: {
    min: 70,
    max: 84,
    label: '良好',
    description: '基本满足岗位要求，表现良好'
  },
  average: {
    min: 60,
    max: 69,
    label: '一般',
    description: '部分满足岗位要求，需要改进'
  },
  poor: {
    min: 0,
    max: 59,
    label: '较差',
    description: '不满足岗位要求'
  }
};

// 技能雷达图配置
export const SKILL_RADAR_CONFIG = {
  categories: [
    '前端开发',
    '后端开发',
    '数据库',
    '系统设计',
    '算法能力',
    'DevOps',
    '软技能',
    '项目管理'
  ],
  maxScore: 100,
  minScore: 0,
  gridLevels: [20, 40, 60, 80, 100]
};

export default {
  name: 'report-generate',
  template: REPORT_GENERATION_PROMPT,
  description: '面试报告生成 Prompt 模板',
  variables: ['session.id', 'session.config.jobTitle', 'session.config.jobLevel', 'session.config.difficulty', 'session.config.focusAreas', 'session.profile.skills', 'session.profile.strongAreas', 'session.profile.weakAreas', 'session.profile.personalityHints', 'session.profile.overallScore', 'session.metadata.createdAt', 'session.metadata.timeSpent', 'session.metadata.totalMessages', 'evaluations', 'questions', 'skillRadarTemplate'],
  version: '1.0.0',
};
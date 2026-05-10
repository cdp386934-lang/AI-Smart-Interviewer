import { v4 as uuidv4 } from 'uuid';
import type { ZodSchema } from 'zod';

import type { IAIService } from '../ai-layer/interfaces';
import type { InterviewSession, InterviewStage } from '../session-manager/interfaces';
import logger from '@/utils/logger';
import type { Evaluation, IInterviewEngine, InterviewEngineConfig, InterviewReport, Question } from './interfaces';
import { generateQuestionPrompt } from '../ai-layer/prompts/question-generate';
import { evaluateAnswerPrompt } from '../ai-layer/prompts/answer-evaluate';
import { generateReportPrompt } from '../ai-layer/prompts/report-generate';
import { generateRealtimeFeedbackPrompt } from '../ai-layer/prompts/real-time-feedback';

const DEFAULT_CONFIG: InterviewEngineConfig = {
  defaultDifficulty: 3,
  maxQuestionsPerStage: 5,
  difficultyAdjustment: { correctStreak: 3, wrongStreak: 3, maxDifficulty: 5, minDifficulty: 1 },
  scoring: { excellentThreshold: 85, goodThreshold: 70, averageThreshold: 60 },
  timeout: { questionTimeout: 120, sessionTimeout: 30 },
};

function normalizeContent(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '').replace(/[，。？！,.!?；;:：]/g, '');
}
function similarity(a: string, b: string): number {
  const x = new Set(normalizeContent(a).split(''));
  const y = new Set(normalizeContent(b).split(''));
  const inter = [...x].filter((c) => y.has(c)).length;
  const union = new Set([...x, ...y]).size || 1;
  return inter / union;
}

export class InterviewEngine implements IInterviewEngine {
  constructor(private readonly ai: IAIService, private readonly config: InterviewEngineConfig = DEFAULT_CONFIG) {}

  async generateQuestion(session: InterviewSession): Promise<Question> {
    const prompt = generateQuestionPrompt({
      stage: session.stage,
      resume: session.resume,
      profile: session.profile,
      history: session.messages,
      difficulty: 3,
      jobDescription: (session.config as any).jobDescription || (session.config as any).companyRequirements || '',
      companyName: (session.config as any).companyName || '',
      focusSkills: (session.config as any).focusSkills || session.config.focusSkills || [],
      similarQuestions: [],
    });

    const content = await this.ai.chat([{ role: 'system', content: prompt }]);
    return {
      id: uuidv4(),
      type: this.resolveQuestionType(session.stage),
      content,
      difficulty: 3,
      expectedPoints: ['结合简历', '结合岗位需求', '给出具体案例'],
      context: (session.config as any).jobDescription || (session.config as any).companyName || session.resume.basicInfo.targetPosition,
      timeout: this.config.timeout.questionTimeout,
      stage: session.stage,
    };
  }

  async evaluateAnswer(session: InterviewSession, answer: string): Promise<Evaluation> {
    const question = this.getLastQuestion(session);
    const prompt = evaluateAnswerPrompt({ question, answer, resume: session.resume });
    const parsed = await this.safeStructuredOutput(prompt, this.evaluationSchema());
    const antiCheat = similarity(answer, session.resume.rawText || '');
    const communication = Math.max(0, parsed.dimensions.communication - (antiCheat > 0.75 ? 10 : 0));
    const score = Math.round((parsed.dimensions.technical + communication + parsed.dimensions.logic + parsed.dimensions.experience) / 4);
    return {
      ...parsed,
      dimensions: { ...parsed.dimensions, communication },
      score,
      feedback: antiCheat > 0.75 ? `${parsed.feedback} 检测到回答与简历内容较为相似，请尽量补充真实思考和具体经历。` : parsed.feedback,
      internalFeedback: antiCheat > 0.75 ? `${parsed.internalFeedback} 回答与简历相似度偏高，需关注真实性。` : parsed.internalFeedback,
      followUpNeeded: parsed.followUpNeeded || score < 75,
      suggestedDifficulty: Math.max(1, Math.min(5, parsed.suggestedDifficulty || 3)),
    };
  }

  async decideTransition(session: InterviewSession, evaluation: Evaluation): Promise<InterviewStage> {
    const technicalCount = session.messages.filter((m) => m.role === 'assistant').length;
    if (session.stage === 'self_intro') return 'technical';
    if (session.stage === 'technical') {
      if (technicalCount >= 5) return 'project_deep';
      if (evaluation.score < 40 && session.profile.weakAreas.length >= 2) return 'behavioral';
      return 'technical';
    }
    if (session.stage === 'project_deep') return evaluation.score >= 75 ? 'coding' : 'behavioral';
    if (session.stage === 'behavioral') return 'q_and_a';
    if (session.stage === 'coding') return 'q_and_a';
    if (session.stage === 'q_and_a') return 'ended';
    return session.stage;
  }

  async generateRealtimeFeedback(evaluation: Evaluation): Promise<string> {
    const prompt = generateRealtimeFeedbackPrompt({ evaluation });
    return this.ai.chat([{ role: 'system', content: prompt }]).catch(() => '回答整体可接受，但还可以补充更多细节。');
  }

  async generateReport(session: InterviewSession): Promise<InterviewReport> {
    const prompt = generateReportPrompt({ report: this.fallbackReport(session) });
    await this.ai.chat([{ role: 'system', content: prompt }]).catch(() => undefined);
    return this.fallbackReport(session);
  }

  async initializeInterview(session: InterviewSession): Promise<Question> {
    return this.generateQuestion(session);
  }

  private resolveQuestionType(stage: InterviewStage): Question['type'] {
    if (stage === 'behavioral') return 'behavioral';
    if (stage === 'project_deep') return 'project';
    if (stage === 'coding') return 'coding';
    if (stage === 'q_and_a') return 'follow_up';
    return 'technical';
  }

  private getLastQuestion(session: InterviewSession): Question {
    const q = [...session.messages].reverse().find((m) => m.role === 'assistant');
    return { id: q?.id || uuidv4(), type: this.resolveQuestionType(session.stage), content: q?.content || '请介绍一下你最近负责的一个项目。', difficulty: 3, expectedPoints: ['背景', '职责', '结果'], timeout: 120, stage: session.stage };
  }

  private evaluationSchema(): ZodSchema<Evaluation> {
    return {
      parse: (value: any) => ({
        questionId: value.questionId || uuidv4(),
        score: Number(value.score || 0),
        dimensions: value.dimensions || { technical: 0, communication: 0, logic: 0, experience: 0 },
        feedback: String(value.feedback || '回答已收到。'),
        internalFeedback: String(value.internalFeedback || '内部评价。'),
        missingPoints: Array.isArray(value.missingPoints) ? value.missingPoints : [],
        followUpNeeded: Boolean(value.followUpNeeded),
        skillUpdates: value.skillUpdates || {},
        suggestedDifficulty: Number(value.suggestedDifficulty || 3),
      }),
    } as ZodSchema<Evaluation>;
  }

  private async safeStructuredOutput<T>(prompt: string, schema: ZodSchema<T>): Promise<T> {
    try {
      return await this.ai.structuredOutput([{ role: 'system', content: prompt }], schema);
    } catch (error) {
      logger.warn('structuredOutput failed, using fallback');
      return schema.parse({});
    }
  }

  private fallbackReport(session: InterviewSession): InterviewReport {
    const evaluations = session.messages.map((m) => (m.metadata as any)?.evaluation).filter(Boolean) as Array<{ score: number; feedback: string }>;
    const overallScore = evaluations.length ? Math.round(evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length) : session.profile.overallScore || 0;
    return {
      sessionId: session.id,
      overallScore,
      stageScores: { [session.stage]: overallScore },
      skillRadar: Array.from(session.profile.skills.entries()).map(([skill, level]) => ({ skill, score: Math.round(level * 100), fullMark: 100 })),
      strengths: session.profile.strongAreas.length ? session.profile.strongAreas : ['学习能力'],
      weaknesses: session.profile.weakAreas.length ? session.profile.weakAreas : ['案例深度不足'],
      detailedFeedback: '综合评语：候选人整体表现符合当前阶段预期。',
      recommendation: overallScore > 85 && session.profile.weakAreas.length < 2 ? 'strong_recommend' : overallScore >= 70 ? 'recommend' : overallScore >= 60 ? 'neutral' : 'not_recommend',
      questionDetails: session.messages.filter((m) => m.role === 'assistant').map((m) => ({ question: m.content, answer: '', score: 0, feedback: '' })),
      duration: 0,
    };
  }
}

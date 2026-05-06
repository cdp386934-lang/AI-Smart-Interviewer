import { v4 as uuidv4 } from 'uuid';
import type { ZodSchema } from 'zod';

import type { IAIService } from '../ai-layer/interfaces';
import type { InterviewSession, InterviewStage } from '../session-manager/interfaces';
import type { StructuredResume } from '../resume-parser/interfaces';
import logger from '@/utils/logger';
import { InterviewEngineError } from './interfaces';
import type { Evaluation, IInterviewEngine, InterviewEngineConfig, InterviewReport, Question } from './interfaces';
import {
  evaluateAnswerPrompt,
  generateFollowUpPrompt,
} from '../ai-layer/prompts/answer-evaluate';
import { generateQuestionPrompt } from '../ai-layer/prompts/question-generate';
import { generateReportPrompt } from '../ai-layer/prompts/report-generate';
import { generateRealtimeFeedbackPrompt } from '../ai-layer/prompts/real-time-feedback';

const DEFAULT_CONFIG: InterviewEngineConfig = {
  defaultDifficulty: 3,
  maxQuestionsPerStage: 5,
  difficultyAdjustment: { correctStreak: 3, wrongStreak: 3, maxDifficulty: 5, minDifficulty: 1 },
  scoring: { excellentThreshold: 85, goodThreshold: 70, averageThreshold: 60 },
  timeout: { questionTimeout: 120, sessionTimeout: 30 },
};

export function calculateDifficulty(profile: InterviewSession['profile'], skillTarget: string): number {
  const currentLevel = profile.skills.get(skillTarget) || 0.5;
  if (profile.strongAreas.includes(skillTarget)) return Math.min(currentLevel * 5 + 1, 5);
  if (profile.weakAreas.includes(skillTarget)) return Math.max(currentLevel * 5 - 1, 1);
  return Math.round(currentLevel * 5);
}

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

function scoreBand(score: number): Evaluation['answerQuality'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 60) return 'average';
  return 'poor';
}

export class InterviewEngine implements IInterviewEngine {
  constructor(private readonly ai: IAIService, private readonly config: InterviewEngineConfig = DEFAULT_CONFIG) {}

  async generateQuestion(session: InterviewSession): Promise<Question> {
    const difficulty = this.clampDifficulty(calculateDifficulty(session.profile, this.pickSkillTarget(session)));
    const prompt = generateQuestionPrompt({
      stage: session.stage,
      resume: session.resume,
      profile: session.profile,
      history: session.messages,
      difficulty,
    });

    const content = await this.ai.chat([{ role: 'system', content: prompt }]);
    const finalContent = this.deduplicateQuestion(session, content);
    return {
      id: uuidv4(),
      type: this.resolveQuestionType(session.stage),
      content: finalContent,
      difficulty,
      expectedPoints: this.expectedPointsFor(session.stage, finalContent),
      context: this.contextFor(session),
      timeout: this.config.timeout.questionTimeout,
      skillTarget: this.pickSkillTarget(session),
    };
  }

  async evaluateAnswer(session: InterviewSession, answer: string): Promise<Evaluation> {
    const question = this.getLastQuestion(session);
    const prompt = evaluateAnswerPrompt({ question, answer, resume: session.resume });
    const parsed = await this.safeStructuredOutput(prompt, this.evaluationSchema());

    const antiCheat = similarity(answer, session.resume.rawText || '');
    const communicationPenalty = antiCheat > 0.75 ? 10 : 0;
    const communication = Math.max(0, parsed.dimensions.communication - communicationPenalty);
    const score = Math.round((parsed.dimensions.technical + communication + parsed.dimensions.logic + parsed.dimensions.experience) / 4);

    return {
      ...parsed,
      dimensions: { ...parsed.dimensions, communication },
      score,
      feedback: antiCheat > 0.75 ? `${parsed.feedback} 检测到回答与简历内容高度相似，请尽量结合真实思考过程作答。` : parsed.feedback,
      followUpNeeded: parsed.followUpNeeded || score < 75,
      answerQuality: scoreBand(score),
    };
  }

  async decideTransition(session: InterviewSession, evaluation: Evaluation): Promise<InterviewStage> {
    const counters = this.stageCounters(session);
    switch (session.stage) {
      case 'self_intro': return 'technical';
      case 'technical':
        if (counters.correct >= 3) return 'project_deep';
        if (counters.wrong >= 3) return 'behavioral';
        return 'technical';
      case 'project_deep': return evaluation.score >= 75 ? 'coding' : 'behavioral';
      case 'behavioral': return 'q_and_a';
      case 'coding': return 'q_and_a';
      case 'q_and_a': return 'ended';
      default: return session.stage;
    }
  }

  async generateRealtimeFeedback(evaluation: Evaluation): Promise<string> {
    const prompt = generateRealtimeFeedbackPrompt({ evaluation });
    const base = await this.ai.chat([{ role: 'system', content: prompt }]);
    return base || this.fallbackRealtimeFeedback(evaluation);
  }

  async generateReport(session: InterviewSession): Promise<InterviewReport> {
    const prompt = generateReportPrompt({ report: this.fallbackReport(session) });
    await this.ai.chat([{ role: 'system', content: prompt }]).catch(() => undefined);
    return this.fallbackReport(session);
  }

  private clampDifficulty(n: number): number { return Math.max(this.config.difficultyAdjustment.minDifficulty, Math.min(this.config.difficultyAdjustment.maxDifficulty, Math.round(n))); }
  private pickSkillTarget(session: InterviewSession) { return session.profile.weakAreas[0] || session.profile.strongAreas[0] || [...session.profile.skills.keys()][0] || '通用能力'; }
  private contextFor(session: InterviewSession) { return session.resume.projects?.[0]?.name || session.resume.workExperience?.[0]?.company || session.resume.basicInfo?.targetPosition || ''; }
  private resolveQuestionType(stage: InterviewStage): Question['type'] { return stage === 'behavioral' ? 'behavioral' : stage === 'project_deep' ? 'project' : stage === 'coding' ? 'coding' : stage === 'follow_up' ? 'follow_up' : 'technical'; }
  private expectedPointsFor(stage: InterviewStage, content: string) { return stage === 'behavioral' ? ['STAR结构', '具体案例', '结果反思'] : ['问题分析', '方案设计', '边界条件']; }

  private deduplicateQuestion(session: InterviewSession, content: string) {
    const recent = session.messages.slice(-20).filter((m) => m.role === 'assistant').map((m) => m.content);
    if (recent.some((q) => similarity(q, content) > 0.7)) return `${content}（请从不同业务场景重新作答）`;
    return content;
  }

  private getLastQuestion(session: InterviewSession): Question {
    const q = [...session.messages].reverse().find((m) => m.role === 'assistant');
    return { id: q?.id || uuidv4(), type: this.resolveQuestionType(session.stage), content: q?.content || '请介绍一下你最近负责的一个项目。', difficulty: 3, expectedPoints: ['背景', '职责', '结果'], timeout: 120 };
  }

  private evaluationSchema(): ZodSchema<Evaluation> {
    return {
      parse: (value: any) => ({
        questionId: value.questionId || uuidv4(),
        score: Number(value.score || 0),
        dimensions: value.dimensions || { technical: 0, communication: 0, logic: 0, experience: 0 },
        feedback: String(value.feedback || ''),
        missingPoints: Array.isArray(value.missingPoints) ? value.missingPoints : [],
        followUpNeeded: Boolean(value.followUpNeeded),
        skillUpdates: Array.isArray(value.skillUpdates) ? value.skillUpdates : [],
        answerQuality: (value.answerQuality || 'average') as Evaluation['answerQuality'],
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

  private stageCounters(session: InterviewSession) {
    const correct = session.messages.filter((m) => m.role === 'assistant' && (m.metadata as any)?.evaluation?.score >= 85).length;
    const wrong = session.messages.filter((m) => m.role === 'assistant' && (m.metadata as any)?.evaluation?.score < 60).length;
    return { correct, wrong };
  }

  private fallbackRealtimeFeedback(evaluation: Evaluation) {
    if (evaluation.score >= 85) return '回答思路很清晰，继续补充一个具体案例会更有说服力。';
    if (evaluation.score >= 70) return '整体方向正确，但可以再补充一些实现细节和权衡。';
    return '思路有一定基础，建议先把关键步骤和实际案例讲完整。';
  }

  private fallbackReport(session: InterviewSession): InterviewReport {
    const evaluations = session.messages.map((m) => (m.metadata as any)?.evaluation).filter(Boolean) as Array<{ score: number; feedback: string }>;
    const overallScore = evaluations.length ? Math.round(evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length) : session.profile.overallScore || 0;
    const stageScores: Record<string, number> = {
      self_intro: 0,
      technical: overallScore,
      project_deep: overallScore,
      behavioral: overallScore,
      coding: overallScore,
      q_and_a: overallScore,
      ended: overallScore,
    };
    const skillRadar = Array.from(session.profile.skills.entries()).map(([skill, level]) => ({ skill, score: Math.round(level * 100), fullMark: 100 }));
    const hiringRecommendation: InterviewReport['hiringRecommendation'] = overallScore > 85 && session.profile.weakAreas.length < 2 ? 'strong_recommend' : overallScore >= 70 ? 'recommend' : overallScore >= 60 ? 'neutral' : 'reject';
    const history = session.messages.filter((m) => m.role === 'assistant' && (m.metadata as any)?.evaluation);
    return {
      sessionId: session.id,
      overallScore,
      stageScores,
      skillRadar,
      strengths: session.profile.strongAreas.length ? session.profile.strongAreas : ['学习能力', '沟通意愿'],
      weaknesses: session.profile.weakAreas.length ? session.profile.weakAreas : ['需要更多案例支撑'],
      detailedFeedback: history.map((m) => `${m.content}：${(m.metadata as any).evaluation.feedback}`).join('\n'),
      hiringRecommendation,
      questionHistory: history.map((m) => ({ question: m.content, answer: (m.metadata as any).evaluation.answer || '', score: (m.metadata as any).evaluation.score || 0, feedback: (m.metadata as any).evaluation.feedback || '' })),
    };
  }
}

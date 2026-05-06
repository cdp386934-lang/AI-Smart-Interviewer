import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import type { IAILayer, ChatMessage } from '../ai-layer/interfaces';
import { getPromptManager } from '../ai-layer/prompt-manager';
import {
  AnswerEvaluationInputSchema,
  AnswerEvaluationOutputSchema,
  formatAnswerEvaluationPrompt,
} from '../ai-layer/prompts/answer-evaluate';
import {
  FollowUpDecisionInputSchema,
  FollowUpDecisionOutputSchema,
  formatFollowUpDecisionPrompt,
} from '../ai-layer/prompts/follow-up-decide';
import {
  QuestionGenerationInputSchema,
  QuestionGenerationOutputSchema,
  formatQuestionGenerationPrompt,
} from '../ai-layer/prompts/question-generate';
import {
  ReportGenerationInputSchema,
  ReportGenerationOutputSchema,
  formatReportGenerationPrompt,
} from '../ai-layer/prompts/report-generate';
import type { StructuredResume } from '../resume-parser/interfaces';
import type { InterviewSession, InterviewReport, InterviewStage } from '../session-manager/interfaces';
import type {
  Evaluation,
  IInterviewEngine,
  InterviewEngineConfig,
  Question,
} from './interfaces';

const DEFAULT_CONFIG: InterviewEngineConfig = {
  defaultDifficulty: 3,
  maxQuestionsPerStage: 5,
  difficultyAdjustment: { correctStreak: 2, wrongStreak: 2, maxDifficulty: 5, minDifficulty: 1 },
  scoring: { excellentThreshold: 85, goodThreshold: 70, averageThreshold: 60 },
  timeout: { questionTimeout: 120, sessionTimeout: 30 },
};

const questionSchema = QuestionGenerationOutputSchema.shape.question;

type DifficultyTrend = { correctStreak: number; wrongStreak: number };

export class ModularInterviewEngine implements IInterviewEngine {
  private readonly config: InterviewEngineConfig;
  private readonly promptManager = getPromptManager();
  private readonly trendBySession = new Map<string, DifficultyTrend>();

  constructor(private readonly ai: IAILayer, config: Partial<InterviewEngineConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      difficultyAdjustment: { ...DEFAULT_CONFIG.difficultyAdjustment, ...(config.difficultyAdjustment || {}) },
      scoring: { ...DEFAULT_CONFIG.scoring, ...(config.scoring || {}) },
      timeout: { ...DEFAULT_CONFIG.timeout, ...(config.timeout || {}) },
    };
  }

  async generateQuestion(session: InterviewSession): Promise<Question> {
    const payload = this.buildQuestionPayload(session);
    const prompt = formatQuestionGenerationPrompt(payload.candidate, payload.job, payload.stage, payload.difficulty, payload.context);

    const result = await this.tryStructured<Question>(
      prompt,
      questionSchema,
      payload,
      () => this.fallbackQuestion(session)
    );

    return {
      ...result,
      id: result.id || uuidv4(),
      timeout: result.timeout || this.config.timeout.questionTimeout,
    };
  }

  async evaluateAnswer(session: InterviewSession, answer: string): Promise<Evaluation> {
    const question = this.getLastQuestion(session);
    const payload = this.buildEvaluationPayload(session, question, answer);
    const prompt = formatAnswerEvaluationPrompt(payload.question, answer, payload.candidate, payload.currentSkills, payload.context);

    const result = await this.tryStructured<Evaluation>(
      prompt,
      AnswerEvaluationOutputSchema.shape.evaluation,
      payload,
      () => this.fallbackEvaluation(question, answer)
    );

    return result;
  }

  async decideTransition(session: InterviewSession, evaluation: Evaluation): Promise<InterviewStage> {
    const question = this.getLastQuestion(session);
    const payload = this.buildFollowUpPayload(session, question, evaluation);
    const prompt = formatFollowUpDecisionPrompt(payload.question, payload.answer, payload.evaluation, payload.context);

    const result = await this.tryStructured(
      prompt,
      FollowUpDecisionOutputSchema.shape.decision,
      payload,
      () => ({ shouldFollowUp: evaluation.followUpNeeded, followUpType: evaluation.followUpNeeded ? 'clarification' : 'skip', reasoning: '基于评分结果的规则化决策', priority: evaluation.followUpNeeded ? 2 : 5 })
    );

    if (result.shouldFollowUp) return 'follow_up' as InterviewStage;
    return this.nextStage(session, evaluation);
  }

  async generateReport(session: InterviewSession): Promise<InterviewReport> {
    const evaluations = this.getEvaluations(session);
    const questions = this.getQuestions(session);
    const prompt = formatReportGenerationPrompt(session, evaluations, questions);

    const result = await this.tryStructured(
      prompt,
      ReportGenerationOutputSchema.shape.report,
      { session, evaluations, questions },
      () => this.fallbackReport(session, evaluations, questions)
    );

    return {
      sessionId: result.sessionId,
      stage: session.stage,
      config: session.config,
      profile: session.profile,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      recommendations: result.recommendations,
      totalQuestions: questions.length,
      averageScore: this.averageScore(evaluations),
      timeSpent: session.metadata.timeSpent,
      createdAt: session.metadata.createdAt,
      endedAt: new Date(),
    };
  }

  async generateRealtimeFeedback(evaluation: Evaluation): Promise<string> {
    const band = this.scoreBand(evaluation.score);
    const followUp = evaluation.followUpNeeded ? '建议继续追问，澄清关键细节。' : '当前回答足够完整，可进入下一题。';
    return `${band}。${evaluation.feedback}${followUp}`;
  }

  private buildQuestionPayload(session: InterviewSession) {
    const stage = session.stage;
    const difficulty = this.clampDifficulty(this.estimateDifficulty(session));
    const candidate = this.resumeToCandidate(session.resume);
    const job = { title: session.config.jobTitle, level: session.config.jobLevel, requiredSkills: session.config.focusAreas, description: session.config.jobTitle };
    return { candidate, job, stage, difficulty, context: { currentProject: candidate.projects[0]?.name, currentSkill: session.config.focusAreas[0] } };
  }

  private buildEvaluationPayload(session: InterviewSession, question: Question, answer: string) {
    const currentSkills = Object.fromEntries(Array.from(session.profile.skills.entries()));
    return { question, answer, candidate: this.resumeToCandidate(session.resume), currentSkills, context: { stage: session.stage, previousEvaluations: this.getEvaluations(session).map(e => ({ questionId: e.questionId, score: e.score, feedback: e.feedback })) } };
  }

  private buildFollowUpPayload(session: InterviewSession, question: Question, evaluation: Evaluation) {
    return { question, answer: '', evaluation, context: { currentStage: session.stage, questionsInStage: this.getQuestions(session).length, followUpCount: this.countFollowUps(session), previousFollowUps: [], timeSpent: session.metadata.timeSpent, difficulty: question.difficulty } };
  }

  private getLastQuestion(session: InterviewSession): Question {
    return this.getQuestions(session).at(-1) ?? this.fallbackQuestion(session);
  }

  private getQuestions(session: InterviewSession): Question[] {
    return (session.messages || [])
      .filter(m => m.role === 'assistant' && m.metadata?.questionType)
      .map(m => ({ id: m.id, type: m.metadata?.questionType as Question['type'], content: m.content, difficulty: this.config.defaultDifficulty, expectedPoints: [] }));
  }

  private getEvaluations(session: InterviewSession): Evaluation[] {
    return (session.messages || [])
      .filter(m => m.role === 'assistant' && m.metadata?.evaluation)
      .map(m => ({ questionId: m.id, score: m.metadata!.evaluation!.score, dimensions: { technical: 0, communication: 0, logic: 0, experience: 0 }, feedback: m.metadata!.evaluation!.feedback, missingPoints: [], followUpNeeded: false, skillUpdates: new Map() }));
  }

  private countFollowUps(session: InterviewSession): number {
    return this.getQuestions(session).filter(q => q.type === 'follow_up').length;
  }

  private estimateDifficulty(session: InterviewSession): number {
    const trend = this.trendBySession.get(session.id);
    const base = this.config.defaultDifficulty;
    if (!trend) return base;
    return this.clampDifficulty(base + (trend.correctStreak >= 2 ? 1 : 0) - (trend.wrongStreak >= 2 ? 1 : 0));
  }

  private nextStage(session: InterviewSession, evaluation: Evaluation): InterviewStage {
    this.updateTrend(session.id, evaluation.score >= 70);
    return session.stage;
  }

  private updateTrend(sessionId: string, correct: boolean) {
    const trend = this.trendBySession.get(sessionId) || { correctStreak: 0, wrongStreak: 0 };
    if (correct) { trend.correctStreak += 1; trend.wrongStreak = 0; } else { trend.wrongStreak += 1; trend.correctStreak = 0; }
    this.trendBySession.set(sessionId, trend);
  }

  private scoreBand(score: number) { return score >= 85 ? '优秀' : score >= 70 ? '良好' : score >= 60 ? '一般' : '较差'; }
  private clampDifficulty(n: number) { return Math.max(this.config.difficultyAdjustment.minDifficulty, Math.min(this.config.difficultyAdjustment.maxDifficulty, n)); }
  private averageScore(evaluations: Evaluation[]) { return evaluations.length ? Math.round(evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length) : 0; }

  private resumeToCandidate(resume: StructuredResume) {
    return {
      name: resume.name,
      skills: (resume.skills || []).map(s => ({ name: s.name, level: s.level, years: (s as any).years })),
      workExperience: (resume.experience || []).map(exp => ({ company: exp.company, position: exp.position, duration: `${exp.startDate} - ${exp.endDate || '至今'}`, description: exp.description, technologies: exp.skills || [] })),
      projects: (resume.projects || []).map(project => ({ name: project.name, description: project.description, technologies: project.technologies || [], role: project.role })),
    };
  }

  private fallbackQuestion(session: InterviewSession): Question {
    return { id: uuidv4(), type: 'technical', content: `请结合你的经历，说明你最熟悉的 ${session.config.focusAreas[0] || '核心技术'} 是什么？`, difficulty: this.config.defaultDifficulty, expectedPoints: ['基础概念', '实际应用', '项目经验'], timeout: this.config.timeout.questionTimeout };
  }

  private fallbackEvaluation(question: Question, answer: string): Evaluation {
    const coverage = question.expectedPoints.filter(p => answer.includes(p)).length;
    const score = Math.min(100, 40 + coverage * 20 + Math.min(20, Math.floor(answer.length / 20)));
    const followUpNeeded = score < 75 || coverage < Math.ceil(question.expectedPoints.length / 2);
    return { questionId: question.id, score, dimensions: { technical: score, communication: 70, logic: 68, experience: 60 }, feedback: followUpNeeded ? '回答覆盖不够完整，建议补充关键细节。' : '回答较完整，表现良好。', missingPoints: question.expectedPoints.filter(p => !answer.includes(p)), followUpNeeded, skillUpdates: new Map() };
  }

  private fallbackReport(session: InterviewSession, evaluations: Evaluation[], questions: Question[]) {
    const avg = this.averageScore(evaluations);
    const rec = avg >= 85 ? 'strongly_recommend' : avg >= 70 ? 'recommend' : avg >= 60 ? 'pending' : 'not_recommend';
    return { sessionId: session.id, summary: `候选人整体表现${this.scoreBand(avg)}，技术与表达能力${avg >= 70 ? '较为均衡' : '仍需提升'}。`, strengths: ['学习能力', '表达意愿'], weaknesses: ['技术深度', '案例细节'], recommendations: ['建议补充项目细节', '加强知识体系梳理'], overallScore: avg, hiringRecommendation: rec as any, skillRadar: Object.fromEntries(Array.from(session.profile.skills.entries()).map(([k, v]) => [k, Math.round(v * 100)])), stagePerformance: { [session.stage]: { averageScore: avg, questionCount: questions.length, feedback: '当前阶段整体表现正常' } }, detailedAnalysis: { technical: '技术维度需要更具体的实现细节。', communication: '沟通较清晰。', logic: '逻辑基本完整。', experience: '经验匹配度中等。' } };
  }

  private async tryStructured<T>(prompt: string, schema: z.ZodType<T>, payload: unknown, fallback: () => T): Promise<T> {
    try {
      const missing = this.promptManager.validateVariables('non-existent', {});
      void missing;
      if (!this.ai.structuredOutput) return fallback();
      return await this.ai.structuredOutput([ { role: 'system', content: prompt } as ChatMessage ], schema);
    } catch {
      return fallback();
    }
  }
}

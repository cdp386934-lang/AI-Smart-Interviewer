import type { InterviewSession, InterviewStage } from '../session-manager/interfaces';
import type { StructuredResume } from '../resume-parser/interfaces';

export interface IInterviewEngine {
  generateQuestion(session: InterviewSession): Promise<Question>;
  evaluateAnswer(session: InterviewSession, answer: string): Promise<Evaluation>;
  decideTransition(session: InterviewSession, evaluation: Evaluation): Promise<InterviewStage>;
  generateReport(session: InterviewSession): Promise<InterviewReport>;
  generateRealtimeFeedback(evaluation: Evaluation): Promise<string>;
  initializeInterview(session: InterviewSession): Promise<Question>;
}

export interface Question {
  id: string;
  type: 'technical' | 'behavioral' | 'project' | 'coding' | 'follow_up' | 'self_intro';
  content: string;
  difficulty: number;
  expectedPoints: string[];
  context?: string;
  timeout?: number;
  stage: InterviewStage;
}

export interface Evaluation {
  questionId: string;
  score: number;
  dimensions: { technical: number; communication: number; logic: number; experience: number };
  feedback: string;
  internalFeedback: string;
  missingPoints: string[];
  followUpNeeded: boolean;
  skillUpdates: Record<string, number>;
  suggestedDifficulty: number;
}

export interface InterviewReport {
  sessionId: string;
  overallScore: number;
  stageScores: Record<string, number>;
  skillRadar: Array<{ skill: string; score: number; fullMark: number }>;
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  recommendation: 'strong_recommend' | 'recommend' | 'neutral' | 'not_recommend';
  questionDetails: Array<{ question: string; answer: string; score: number; feedback: string }>;
  duration: number;
}

export interface QuestionBankEntry {
  id: string;
  type: Question['type'];
  content: string;
  difficulty: number;
  expectedPoints: string[];
  relatedSkills: string[];
  stage: InterviewStage;
  embedding?: number[];
}

export interface InterviewEngineConfig {
  defaultDifficulty: number;
  maxQuestionsPerStage: number;
  difficultyAdjustment: { correctStreak: number; wrongStreak: number; maxDifficulty: number; minDifficulty: number };
  scoring: { excellentThreshold: number; goodThreshold: number; averageThreshold: number };
  timeout: { questionTimeout: number; sessionTimeout: number };
}

export enum InterviewEngineErrorCode {
  QUESTION_GENERATION_FAILED = 'IE001',
  EVALUATION_FAILED = 'IE002',
  INVALID_STAGE_TRANSITION = 'IE003',
  REPORT_GENERATION_FAILED = 'IE004',
  RAG_RETRIEVAL_FAILED = 'IE005',
  SKILL_UPDATE_INVALID = 'IE006',
}

export class InterviewEngineError extends Error {
  constructor(public code: InterviewEngineErrorCode, message: string, public statusCode = 400) {
    super(message);
    this.name = 'InterviewEngineError';
  }
}

export type { InterviewSession, InterviewStage, StructuredResume };

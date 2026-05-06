import { StructuredResume } from '../resume-parser/interfaces';
import {
  CandidateProfile,
  InterviewSession,
  InterviewStage,
  Message,
  SessionMetadata,
} from './interfaces';

export function resumeDataToStructuredResume(input: {
  id: string;
  name: string;
  email: string;
  rawText: string;
  createdAt: Date;
}): StructuredResume {
  return {
    id: input.id,
    basicInfo: {
      name: input.name,
      email: input.email,
    },
    education: [],
    workExperience: [],
    projects: [],
    skills: {
      programming: [],
      frameworks: [],
      tools: [],
      languages: [],
      softSkills: [],
      certifications: [],
    },
    rawText: input.rawText,
    extractedAt: input.createdAt,
  };
}

export function serializeProfile(profile: CandidateProfile): string {
  return JSON.stringify({
    skills: Object.fromEntries(profile.skills),
    weakAreas: profile.weakAreas,
    strongAreas: profile.strongAreas,
    personalityHints: profile.personalityHints,
    overallScore: profile.overallScore,
  });
}

export function deserializeProfile(json: string): CandidateProfile {
  const o = JSON.parse(json) as {
    skills?: Record<string, number>;
    weakAreas?: string[];
    strongAreas?: string[];
    personalityHints?: string[];
    overallScore?: number;
  };
  return {
    skills: new Map(Object.entries(o.skills ?? {})),
    weakAreas: o.weakAreas ?? [],
    strongAreas: o.strongAreas ?? [],
    personalityHints: o.personalityHints ?? [],
    overallScore: o.overallScore ?? 0,
  };
}

export function defaultProfile(): CandidateProfile {
  return {
    skills: new Map(),
    weakAreas: [],
    strongAreas: [],
    personalityHints: [],
    overallScore: 0,
  };
}

export interface SessionCorePayload {
  id: string;
  stage: InterviewStage;
  config: unknown;
  resume: StructuredResume;
  metadata: SessionMetadata;
}

export function serializeSessionCore(session: InterviewSession): string {
  const { messages: _m, profile: _p, ...rest } = session;
  return JSON.stringify({
    ...rest,
    resume: {
      ...session.resume,
      extractedAt:
        session.resume.extractedAt instanceof Date
          ? session.resume.extractedAt.toISOString()
          : session.resume.extractedAt,
    },
    metadata: {
      ...session.metadata,
      createdAt: session.metadata.createdAt.toISOString(),
      updatedAt: session.metadata.updatedAt.toISOString(),
      lastActivityAt: session.metadata.lastActivityAt.toISOString(),
    },
  });
}

export function deserializeSessionCore(
  json: string,
  messages: Message[],
  profile: CandidateProfile
): InterviewSession {
  const o = JSON.parse(json) as SessionCorePayload & {
    resume: StructuredResume & { extractedAt: string };
    metadata: Omit<SessionMetadata, 'createdAt' | 'updatedAt' | 'lastActivityAt'> & {
      createdAt: string;
      updatedAt: string;
      lastActivityAt: string;
    };
  };
  return {
    id: o.id,
    stage: o.stage,
    config: o.config as InterviewSession['config'],
    resume: {
      ...o.resume,
      extractedAt: new Date(o.resume.extractedAt),
    },
    messages,
    profile,
    metadata: {
      ...o.metadata,
      createdAt: new Date(o.metadata.createdAt),
      updatedAt: new Date(o.metadata.updatedAt),
      lastActivityAt: new Date(o.metadata.lastActivityAt),
    },
  };
}

export function serializeMessage(m: Message): string {
  return JSON.stringify({
    ...m,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
  });
}

export function deserializeMessage(json: string): Message {
  const o = JSON.parse(json) as Message & { timestamp: string };
  return {
    ...o,
    timestamp: new Date(o.timestamp),
  };
}

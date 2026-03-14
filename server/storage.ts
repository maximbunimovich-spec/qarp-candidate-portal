import { Candidate, ProfileData, QuestionnaireData, CandidateCV } from "@shared/schema";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function calculateCompleteness(candidate: Candidate): number {
  let totalFields = 0;
  let filledFields = 0;

  // Profile fields (5 required)
  const profileFields = ['fullName', 'namePrefix', 'email', 'phone', 'cityCountry'] as const;
  totalFields += profileFields.length;
  profileFields.forEach(f => {
    if (candidate.profile[f]) filledFields++;
  });

  // CV
  totalFields += 1;
  if (candidate.cv) filledFields++;

  // Questionnaire required fields (12 required questions total)
  const requiredQFields: (keyof QuestionnaireData)[] = [
    'privacyConsent', 'fullName', 'email', 'phone', 'cityCountry',
    'auditTypes', 'branchExpertise', 'auditsPerformed', 'qualificationAuditing',
    'languages', 'onsiteAuditRate', 'remoteAuditRate', 'onsiteLocations',
    'interestedConsulting', 'trainingInterest'
  ];
  totalFields += requiredQFields.length;
  requiredQFields.forEach(f => {
    const val = candidate.questionnaire[f];
    if (val !== undefined && val !== null && val !== '' && val !== false) {
      if (Array.isArray(val) && val.length === 0) return;
      filledFields++;
    }
  });

  return Math.round((filledFields / totalFields) * 100);
}

export interface IStorage {
  createCandidate(email: string, password: string): Candidate;
  getCandidateByEmail(email: string): Candidate | undefined;
  getCandidateById(id: string): Candidate | undefined;
  updateProfile(id: string, profile: ProfileData): Candidate | undefined;
  uploadCV(id: string, cv: CandidateCV): Candidate | undefined;
  updateQuestionnaire(id: string, data: QuestionnaireData): Candidate | undefined;
  getAllCandidates(): Candidate[];
  getCandidateCV(id: string): CandidateCV | null;
}

export class MemStorage implements IStorage {
  private candidates: Map<string, Candidate> = new Map();

  createCandidate(email: string, password: string): Candidate {
    const id = generateId();
    const candidate: Candidate = {
      id,
      email,
      passwordHash: hashPassword(password),
      profile: { email },
      profileCompleted: false,
      cv: null,
      questionnaire: {},
      questionnaireCompleted: false,
      completenessScore: 0,
      registeredAt: new Date().toISOString(),
    };
    candidate.completenessScore = calculateCompleteness(candidate);
    this.candidates.set(id, candidate);
    return candidate;
  }

  getCandidateByEmail(email: string): Candidate | undefined {
    for (const c of this.candidates.values()) {
      if (c.email.toLowerCase() === email.toLowerCase()) return c;
    }
    return undefined;
  }

  getCandidateById(id: string): Candidate | undefined {
    return this.candidates.get(id);
  }

  updateProfile(id: string, profile: ProfileData): Candidate | undefined {
    const c = this.candidates.get(id);
    if (!c) return undefined;
    c.profile = { ...c.profile, ...profile };
    const required = ['fullName', 'email', 'phone', 'cityCountry'] as const;
    c.profileCompleted = required.every(f => c.profile[f] && c.profile[f]!.trim() !== '');
    c.completenessScore = calculateCompleteness(c);
    return c;
  }

  uploadCV(id: string, cv: CandidateCV): Candidate | undefined {
    const c = this.candidates.get(id);
    if (!c) return undefined;
    c.cv = cv;
    c.completenessScore = calculateCompleteness(c);
    return c;
  }

  updateQuestionnaire(id: string, data: QuestionnaireData): Candidate | undefined {
    const c = this.candidates.get(id);
    if (!c) return undefined;
    c.questionnaire = { ...c.questionnaire, ...data };
    if (data.completed) {
      c.questionnaireCompleted = true;
    }
    c.completenessScore = calculateCompleteness(c);
    return c;
  }

  getAllCandidates(): Candidate[] {
    return Array.from(this.candidates.values());
  }

  getCandidateCV(id: string): CandidateCV | null {
    const c = this.candidates.get(id);
    return c?.cv ?? null;
  }
}

export const storage = new MemStorage();

import { z } from "zod";

// Questionnaire data shape
export const questionnaireSchema = z.object({
  // Page 1 - Personal Information
  privacyConsent: z.boolean().optional(),
  fullName: z.string().optional(),
  namePrefix: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  cityCountry: z.string().optional(),

  // Page 2 - Audits Experience
  auditTypes: z.array(z.string()).optional(),
  auditTypesOther: z.string().optional(),
  branchExpertise: z.array(z.string()).optional(),
  auditsPerformed: z.string().optional(),
  qualificationAuditing: z.string().optional(),

  // Page 3 - Qualification Details
  qualificationExamDate: z.string().optional(),
  qualificationExamName: z.string().optional(),

  // Page 4 - Audits Potential
  languages: z.array(z.string()).optional(),
  languagesOther: z.string().optional(),
  onsiteAuditRate: z.string().optional(),
  remoteAuditRate: z.string().optional(),
  onsiteLocations: z.array(z.string()).optional(),
  onsiteLocationsOther: z.string().optional(),

  // Page 5 - Additional Details
  professionalMembership: z.array(z.string()).optional(),
  professionalMembershipOther: z.string().optional(),
  interestedConsulting: z.string().optional(),

  // Page 6 - Consulting Experience
  consultingServices: z.string().optional(),
  consultingExperience: z.string().optional(),
  consultingRate: z.string().optional(),

  // Page 7 - Training Interest
  trainingInterest: z.string().optional(),

  // Page 8 - Training Experience
  trainingExperience: z.string().optional(),
  trainingRate: z.string().optional(),

  // Completion tracking
  currentPage: z.number().optional(),
  completed: z.boolean().optional(),
});

export type QuestionnaireData = z.infer<typeof questionnaireSchema>;

export const profileSchema = z.object({
  fullName: z.string().optional(),
  namePrefix: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  cityCountry: z.string().optional(),
});

export type ProfileData = z.infer<typeof profileSchema>;

export interface CandidateCV {
  filename: string;
  mimetype: string;
  data: string; // base64
  uploadedAt: string;
}

export interface Candidate {
  id: string;
  email: string;
  passwordHash: string;
  profile: ProfileData;
  profileCompleted: boolean;
  cv: CandidateCV | null;
  questionnaire: QuestionnaireData;
  questionnaireCompleted: boolean;
  completenessScore: number;
  registeredAt: string;
}

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

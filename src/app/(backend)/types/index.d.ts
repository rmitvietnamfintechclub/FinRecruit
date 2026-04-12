import { Document, Types } from 'mongoose';

// 1. Enums (single source of truth for the app)
export type RoleType = 'Guest' | 'Department Head' | 'Executive Board';

// Align with the application form labels; includes EBMB.
export type DepartmentType = 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department' | 'EBMB' | 'Unassigned';

export type StatusType = 'Pending' | 'Pass' | 'Fail';

// Application-form choices only (excludes EBMB, Unassigned)
export type CandidateChoiceType = 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department';

// 2. Interfaces
export interface IUser extends Document {
  _id: Types.ObjectId;
  name?: string | null;
  email: string;
  avatar?: string | null;
  role: RoleType;
  department: DepartmentType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomAnswer {
  question: string;
  answer: string;
}

export interface ICandidate {
  _id?: string; 
  // --- Personal information ---
  fullName: string;
  email: string;
  dob: string;
  phone: string;
  majorAndYear: string;
  facebookLink: string;
  cvLink: string;
  futurePlans: string;
  
  // --- General questions ---
  fintechAspect: string;
  achievementExpectation: string;
  timeCommitment: string;
  explanation: string;
  questionsForUs: string;
  
  // --- Assignment & status ---
  choice1: CandidateChoiceType;
  choice2?: CandidateChoiceType | '';
  department: DepartmentType;
  
  status: StatusType;
  isRerouted: boolean;
  reviewerEmail?: string;
  
  // --- Supplementary ---
  customAnswers: ICustomAnswer[];
  
  // --- Metadata ---
  generation: string;
  semester: string;
  appliedAt: Date;
  createdAt?: Date;
  updatedAt?: Date; 
}

export interface ISystemConfig extends Document {
  _id: Types.ObjectId;
  configName: string;
  currentGeneration: string;
  currentSemester: string;
  isRecruitmentActive: boolean;
}

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  action: string;
  performedBy: string;
  targetUser?: string;
  targetCandidateId?: string;
  details?: string;
  timestamp: Date;
}

export interface ISession extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

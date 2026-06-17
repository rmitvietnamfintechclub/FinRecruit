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
  generation: string;
  semester: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecruitmentSemester {
  code: string;
}

export interface IRecruitmentGeneration extends Document {
  _id: Types.ObjectId;
  name: string;
  semesters: IRecruitmentSemester[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomAnswer {
  question: string;
  answer: string;
}

export interface ICandidate {
  msFormResponseId: string;
  _id?: string; 
  // --- Personal information ---
  fullName: string;
  email: string;
  dob: string;
  phone: string;
  majorAndYear: string;
  facebookLink: string;
  cvLink: string;

  generalAnswers: ICustomAnswer[];
  departmentExplanation?: ICustomAnswer;

  // --- Assignment & status ---
  choice1: CandidateChoiceType;
  choice2?: CandidateChoiceType | '';
  department: DepartmentType;
  
  status: StatusType;
  isRerouted: boolean;
  reviewerEmail?: string;

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

export type AuditLogLevel = 'info' | 'warning' | 'error';

export type AuditLogCategory =
  | 'candidate'
  | 'role'
  | 'system-config'
  | 'security'
  | 'system';

export interface IAuditLogActor {
  userId?: string;
  email?: string;
  role?: RoleType;
}

export interface IAuditLogTarget {
  userId?: string;
  email?: string;
  candidateId?: string;
  msFormResponseId?: string;
  /** Optional human-readable label used by the System Logs UI when the target
   * is not an existing user / candidate (e.g. a generation name). */
  label?: string;
}

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  level: AuditLogLevel;
  category: AuditLogCategory;
  action: string;
  message: string;
  performedBy?: IAuditLogActor;
  target?: IAuditLogTarget;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
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
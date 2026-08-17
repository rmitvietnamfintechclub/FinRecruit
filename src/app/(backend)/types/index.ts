import { Document, Types } from 'mongoose';

// 1. Core Enumeration Constants (Runtime)
export const ROLES = ['Guest', 'MEMBER', 'Department Head', 'Executive Board'] as const;

export const DEPARTMENTS = [
    'Technology Department', 
    'Business Department', 
    'HR Department', 
    'Marketing Department', 
    'EBMB', 
    'Unassigned'
] as const;

export const CANDIDATE_CHOICES = [
    'Technology Department', 
    'Business Department', 
    'HR Department', 
    'Marketing Department'
] as const;

export const STATUSES = ['Pending', 'Pass', 'Fail'] as const;
export const SLOT_STATUSES = ['AVAILABLE', 'BOOKED'] as const;

export const AUDIT_LOG_LEVELS = ['info', 'warning', 'error'] as const;
export const AUDIT_LOG_CATEGORIES = [
    'candidate', 'role', 'system-config', 'security', 'system', 'interview-scheduling'
] as const;

// 2. Derived TypeScript Types (Compile-Time)
export type RoleType = typeof ROLES[number];
export type DepartmentType = typeof DEPARTMENTS[number];
export type CandidateChoiceType = typeof CANDIDATE_CHOICES[number];
export type StatusType = typeof STATUSES[number];
export type SlotStatusType = typeof SLOT_STATUSES[number];
export type AuditLogLevel = typeof AUDIT_LOG_LEVELS[number];
export type AuditLogCategory = typeof AUDIT_LOG_CATEGORIES[number];

// 3. Document Interfaces
// Existing Auth & Config Interfaces
export interface IUser extends Document {
    _id: Types.ObjectId;
    id?: string;
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

export interface IDepartmentState {
    department: DepartmentType;
    isRound1Locked: boolean;
    isRound2Locked: boolean;
}

export interface ISystemConfig extends Document {
    _id: Types.ObjectId;
    id?: string;
    configName: string;
    currentGeneration: string;
    currentSemester: string;
    isRecruitmentActive: boolean;
    departmentStates: IDepartmentState[];
}

export interface IDepartmentConfig extends Document {
    _id: Types.ObjectId;
    id?: string;
    department: DepartmentType;
    generation: string;
    semester: string;
    interviewQuestions: string[];
    isScoringEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Interview Scheduling Interfaces
export interface IMasterInterviewSlot extends Document {
    _id: Types.ObjectId;
    id?: string;
    generation: string;
    semester: string;
    date: Date;
    startTime: string; // e.g., "08:00 AM"
    endTime: string;   // e.g., "08:40 AM"
    room: string;
    status: SlotStatusType;
    bookedByCandidateId?: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface IInterviewerAvailability extends Document {
    _id: Types.ObjectId;
    id?: string;
    slotId: Types.ObjectId;
    department: DepartmentType;
    interviewerName: string;
    isHead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Candidate Interfaces
export interface ICustomAnswer {
    question: string;
    answer: string;
    addedBy?: string; // Used for ad-hoc R2 questions
}

export interface IRound2Evaluation {
    templateAnswers: ICustomAnswer[];
    adHocQuestions: ICustomAnswer[];
    notes: {
        note1: string;
        note2: string;
        note3: string;
    };
    score?: number | null;
}

export interface ICandidate {
    msFormResponseId: string;
    _id?: string; 
    id?: string;
    
    // Personal information
    fullName: string;
    email: string;
    dob: string;
    phone: string;
    majorAndYear: string;
    facebookLink: string;
    cvLink: string;
    generalAnswers: ICustomAnswer[];

    // Assignment & status
    choice1: CandidateChoiceType;
    choice2?: CandidateChoiceType | '';
    department: DepartmentType;
    status: StatusType;
    isRerouted: boolean;
    reviewerEmail?: string;
    customAnswers: ICustomAnswer[];
    
    // Phase 2: Interview Scheduling & Round 2
    interviewSlotId?: Types.ObjectId | null;
    round2Status: StatusType;
    round2Evaluation: IRound2Evaluation;
    
    // Metadata
    generation: string;
    semester: string;
    appliedAt: Date;
    createdAt?: Date;
    updatedAt?: Date; 
}

// Audit & Session
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
    label?: string;
}

export interface IAuditLog extends Document {
    _id: Types.ObjectId;
    id?: string;
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
    id?: string;
    sessionId: string;
    userId: Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRecruitmentSemester {
    code: string;
}

export interface IRecruitmentGeneration extends Document {
    _id: Types.ObjectId;
    id?: string;
    name: string;
    semesters: IRecruitmentSemester[];
    createdAt: Date;
    updatedAt: Date;
}
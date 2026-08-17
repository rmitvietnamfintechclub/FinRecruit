# Fin-Recruit MongoDB Data Models (Phase II include)
This document outlines the database schemas for the Fin-Recruit platform. The design adheres strictly to our centralized TypeScript definitions and is optimized to support secure Role-Based Access Control (RBAC), multi-department candidate evaluation routing, dynamic recruitment cycle management, and comprehensive system auditing.

## 1. Core Architecture & Principles
### Design Principles
1. *Single Source of Truth for Enums*: Centralized runtime constants for roles and departments eliminate "magic strings" and prevent drift between Mongoose schemas and TypeScript interfaces.

2. *Standardized Serialization*: All models implement a shared baseSchemaOptions helper. This ensures that every API response automatically transforms `_id` to `id`, drops `__v`, and includes virtuals without needing repetitive boilerplate.

3. *Strict RBAC & Departmental Isolation*: User documents explicitly define roles and departments, natively extending NextAuth sessions.

4. *Immutable Auditing*: System actions are logged as immutable records with embedded snapshots of the actor and target. A TTL index automatically purges old logs.

### Shared Constants & Document Types (`(backend)/types/index.ts`)
This file acts as the compile-time and runtime single source of truth for both TypeScript and Mongoose, preventing type mismatches on the frontend. Note the inclusion of `id?: string` to support the frontend post-serialization.

```ts
import { Document, Types } from 'mongoose';

// 1. Core Enumeration Constants (Runtime)
export const ROLES = ['Guest', 'MEMBER', 'Department Head', 'Executive Board'] as const;

export const DEPARTMENTS = ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department', 'EBMB', 'Unassigned'] as const;

export const CANDIDATE_CHOICES = ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department'] as const;

export const STATUSES = ['Pending', 'Pass', 'Fail'] as const;
export const SLOT_STATUSES = ['AVAILABLE', 'BOOKED'] as const;

export const AUDIT_LOG_LEVELS = ['info', 'warning', 'error'] as const;
export const AUDIT_LOG_CATEGORIES = ['candidate', 'role', 'system-config', 'security', 'system', 'interview-scheduling'] as const;

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
```

### Shared Schema Helpers (`(backend)/types/models/baseSchemaOptions.ts`)
Used across all standard models to ensure consistent JSON serialization and handle generic Mongoose inference.

```ts
export const baseSchemaOptions = {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
        virtuals: true,    // Include virtual fields
        versionKey: false, // Remove __v from API responses
        transform: function (_doc: any, ret: any) {
        if (ret._id) {
            ret.id = ret._id.toString(); // Expose Mongo _id as id
        }
        delete ret._id;
        delete ret.__v;
        }
    }
};
```

## 2. Auth & Identity Module Models
### 2.1 User Model (`(backend)/types/models/User.ts`)
**Purpose**: Core identity, RBAC roles (now including `Member`), and assigned departmental ownership for club members and staff.

```ts
const UserSchema = new Schema<IUser>(
    {
        name: { type: String, trim: true, default: null },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        avatar: { type: String, default: null },
        role: { type: String, enum: [...ROLES], default: 'Guest' },
        department: {
        type: String,
        // Includes legacy values for migration safety
        enum: [...DEPARTMENTS, 'Technology', 'Business', 'Human Resources', 'Marketing', 'All'], 
        default: 'Unassigned',
        },
        generation: { type: String, default: '', trim: true },
        semester: { type: String, default: '', trim: true },
        isActive: { type: Boolean, default: true },
    },
    baseSchemaOptions
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
```

### 2.2 Session Model (`(backend)/types/models/Session.ts`)
**Purpose**: Persisted login session state enabling secure database-backed session management, explicit revocation, and expirations.

```ts
const SessionSchema = new Schema<ISession>(
    {
        sessionId: { type: String, required: true, unique: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        expiresAt: { type: Date, required: true },
    },
    baseSchemaOptions
);

// TTL index to automatically purge expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
```

## 3. System Configuration & Catalog Models
### 3.1 System Config Model (`(backend)/types/models/SystemConfig.ts`)
**Purpose**: A singleton document providing the global switches for form intake toggles and active cohort metadata. Tracks global intake toggles and arrays of department states to monitor Round 1 and Round 2 lockdown progression.

```ts
const DepartmentStateSchema = new Schema(
    {
        department: { type: String, enum: [...DEPARTMENTS], required: true },
        isRound1Locked: { type: Boolean, default: false },
        isRound2Locked: { type: Boolean, default: false },
    },
    { _id: false }
);

const SystemConfigSchema = new Schema<ISystemConfig>(
    {
        configName: { type: String, required: true, unique: true, default: 'global_settings' },
        currentGeneration: { type: String, required: true },
        currentSemester: { type: String, required: true },
        isRecruitmentActive: { type: Boolean, default: false },
        departmentStates: { type: [DepartmentStateSchema], default: [] }
    }, 
    baseSchemaOptions
);

export default mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
```

## 3.2 Department Config Model (`(backend)/types/models/DepartmentConfig.ts`) [NEW]
**Purpose**: Stores the dynamic interview question templates and quantitative scoring toggles configured by Department Heads.

```ts
const DepartmentConfigSchema = new Schema<IDepartmentConfig>(
    {
        department: { type: String, enum: [...DEPARTMENTS], required: true },
        generation: { type: String, required: true },
        semester: { type: String, required: true },
        interviewQuestions: { type: [String], default: [] },
        isScoringEnabled: { type: Boolean, default: false }
    },
    baseSchemaOptions
);

// Ensure one config per department per semester cycle
DepartmentConfigSchema.index({ department: 1, generation: 1, semester: 1 }, { unique: true });

export default mongoose.models.DepartmentConfig || mongoose.model<IDepartmentConfig>('DepartmentConfig', DepartmentConfigSchema);
```

### 3.3 Recruitment Generation Model (`(backend)/types/models/RecruitmentGeneration.ts`)
Purpose: Master catalog recording all past, present, and scheduled recruitment cohorts and their respective semesters.

```ts
const RecruitmentSemesterSchema = new Schema(
    { code: { type: String, required: true, trim: true } },
    { _id: false }
);

const RecruitmentGenerationSchema = new Schema<IRecruitmentGeneration>(
    {
        name: { type: String, required: true, trim: true, unique: true },
        semesters: { type: [RecruitmentSemesterSchema], default: [] },
    },
    baseSchemaOptions
);

export default mongoose.models.RecruitmentGeneration || mongoose.model<IRecruitmentGeneration>('RecruitmentGeneration', RecruitmentGenerationSchema);
```

## 4. Interview Scheduling Module
### 4.1 Master Interview Slot (`(backend)/types/models/MasterInterviewSlot.ts`) [NEW]
**Purpose**: The 40-minute chunked booking slots generated by the Executive Board for candidates to secure.

```ts
const MasterInterviewSlotSchema = new Schema<IMasterInterviewSlot>(
    {
        generation: { type: String, required: true, index: true },
        semester: { type: String, required: true, index: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        room: { type: String, required: true },
        status: { type: String, enum: [...SLOT_STATUSES], default: 'AVAILABLE', index: true },
        bookedByCandidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', default: null }
    },
    baseSchemaOptions
);

export default mongoose.models.MasterInterviewSlot || mongoose.model<IMasterInterviewSlot>('MasterInterviewSlot', MasterInterviewSlotSchema);
```

### 4.2 Interviewer Availability (`(backend)/types/models/InterviewerAvailability.ts`) [NEW]
**Purpose**: Maps individual department interviewers (Heads & Members) to specific master slots to validate candidate booking logic.

```ts
const InterviewerAvailabilitySchema = new Schema<IInterviewerAvailability>(
    {
        slotId: { type: Schema.Types.ObjectId, ref: 'MasterInterviewSlot', required: true, index: true },
        department: { type: String, enum: [...DEPARTMENTS], required: true, index: true },
        interviewerName: { type: String, required: true },
        isHead: { type: Boolean, default: false }
    },
    baseSchemaOptions
);

// Prevent duplicate declarations by the same person for the same slot
InterviewerAvailabilitySchema.index({ slotId: 1, department: 1, interviewerName: 1 }, { unique: true });

export default mongoose.models.InterviewerAvailability || mongoose.model<IInterviewerAvailability>('InterviewerAvailability', InterviewerAvailabilitySchema);
```

## 5. Recruitment & Candidate Model
### 5.1 Candidate Model (`(backend)/types/models/Candidate.ts`)
**Purpose**: Primary document representing candidate intake from Microsoft Forms/Power Automate webhooks. Stores personal information, multi-department choices, form answers, and progression status. Expanded to store Round 2 evaluations, collaborative cockpit notes, ad-hoc questions, and final quantitative scores.

```ts
// Embedded Sub-Document (_id: false)
const FormAnswerSchema = new Schema(
    {
        question: { type: String, required: true },
        answer: { type: String, default: '' },
        addedBy: { type: String } // Used for R2 Ad-hoc tracking
    },
    { _id: false }
);

const CandidateSchema = new Schema<ICandidate>(
  {
        msFormResponseId: { type: String, required: true },
        
        // Personal Information
        fullName: { type: String, required: true },
        email: { type: String, required: true },
        dob: { type: String, required: true },
        phone: { type: String, required: true },
        majorAndYear: { type: String, required: true },
        facebookLink: { type: String, required: true },
        cvLink: { type: String, required: true },
        generalAnswers: { type: [FormAnswerSchema], default: [] },
        
        // R1 Application Choices & Assignments
        choice1: { type: String, required: true, enum: [...CANDIDATE_CHOICES] },
        choice2: { type: String, enum: [...CANDIDATE_CHOICES, ''] },
        department: { type: String, required: true, enum: [...DEPARTMENTS] },
        
        // R1 Evaluation State
        status: { type: String, enum: [...STATUSES], default: 'Pending' },
        isRerouted: { type: Boolean, default: false },
        reviewerEmail: { type: String },
        customAnswers: { type: [FormAnswerSchema], default: [] },

        // Phase 2: Round 2 & Scheduling State
        interviewSlotId: { type: Schema.Types.ObjectId, ref: 'MasterInterviewSlot', default: null },
        round2Status: { type: String, enum: [...STATUSES], default: 'Pending' },
        round2Evaluation: {
        templateAnswers: { type: [FormAnswerSchema], default: [] },
        adHocQuestions: { type: [FormAnswerSchema], default: [] },
        notes: {
            note1: { type: String, default: '' },
            note2: { type: String, default: '' },
            note3: { type: String, default: '' }
        },
        score: { type: Number, default: null }
        },
        
        // Metadata
        generation: { type: String },
        semester: { type: String },
        appliedAt: { type: Date, default: Date.now },
    },
    baseSchemaOptions
);

// Indexes for scheduling lookups and dashboards
CandidateSchema.index({ department: 1, status: 1, round2Status: 1 });

export default mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);
```

## 6. Audit & Compliance Module Model
### 6.1 Audit Log Model (`(backend)/types/models/AuditLog.ts`)
**Purpose**: Append-only operational trail recording role changes, evaluations, configurations, and security events. Optimized with a 90-day automatic deletion mechanism via TTL indexing.

```ts
export const AUDIT_LOG_TTL_SECONDS = 60 * 60 * 24 * 90;

// Embedded Sub-Documents (_id: false)
const ActorSchema = new Schema(
    { userId: { type: String }, email: { type: String }, role: { type: String } },
    { _id: false }
);

const TargetSchema = new Schema(
    {
        userId: { type: String },
        email: { type: String },
        candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' },
        msFormResponseId: { type: String },
        label: { type: String },
    },
    { _id: false }
);

// Main Audit Schema
const AuditLogSchema = new Schema<IAuditLog>(
    {
        level: { type: String, enum: [...AUDIT_LOG_LEVELS], required: true, default: 'info' },
        category: { type: String, enum: [...AUDIT_LOG_CATEGORIES], required: true },
        action: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        performedBy: { type: ActorSchema, default: undefined },
        target: { type: TargetSchema, default: undefined },
        metadata: { type: Schema.Types.Mixed },
        ipAddress: { type: String },
        userAgent: { type: String },
        timestamp: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: { expireAfterSeconds: AUDIT_LOG_TTL_SECONDS },
        },
    },
    { 
        versionKey: false, 
        toJSON: baseSchemaOptions.toJSON // Inherits the serialization map, skips automated timestamps
    }
);

// Compound indexes for the most common admin queries.
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ level: 1, timestamp: -1 });
AuditLogSchema.index({ 'performedBy.email': 1, timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
```
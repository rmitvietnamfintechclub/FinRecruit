import { Document, Types } from 'mongoose';

// 1. Enums (Định nghĩa các giá trị cố định để tránh gõ sai chính tả)
export type RoleType = 'Guest' | 'Department Head' | 'Executive Board';
export type DepartmentType = 'Technology' | 'Business' | 'Human Resources' | 'Marketing' | 'All' | 'Unassigned';
export type StatusType = 'Pending' | 'Pass' | 'Fail' | 'Incomplete';

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

export interface ICandidate extends Document {
  _id: Types.ObjectId;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  cvLink: string;
  choice1: DepartmentType;
  choice2?: DepartmentType; // Dấu ? nghĩa là có thể trống (Optional)
  department: DepartmentType; // Ban đang giữ hồ sơ hiện tại
  status: StatusType;
  customAnswers?: Record<string, any>; // Object linh hoạt chứa các câu hỏi phụ
  generation: string;
  semester: string;
  appliedAt: Date;
  updatedAt: Date;
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

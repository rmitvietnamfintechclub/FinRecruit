import { Document } from 'mongoose';

// 1. Enums (Nguồn chân lý duy nhất cho toàn bộ app)
export type RoleType = 'Guest' | 'Department Head' | 'Executive Board';

// ĐÃ SỬA: Dùng đúng chữ 'HR Department' để khớp với Form. Thêm EBMB.
export type DepartmentType = 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department' | 'EBMB' | 'Unassigned';

export type StatusType = 'Pending' | 'Pass' | 'Fail';

// Loại bỏ các ban không dành cho form ứng tuyển (EBMB, Unassigned)
export type CandidateChoiceType = 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department';

// 2. Interfaces
export interface IUser extends Document {
  email: string;
  role: RoleType;
  department: DepartmentType;
  isActive: boolean;
  createdAt: Date;
}

export interface ICustomAnswer {
  question: string;
  answer: string;
}

export interface ICandidate {
  _id?: string; 
  // --- THÔNG TIN CÁ NHÂN ---
  fullName: string;
  email: string;
  dob: string;
  phone: string;
  majorAndYear: string;
  facebookLink: string;
  cvLink: string;
  futurePlans: string;
  
  // --- CÂU HỎI CHUNG ---
  fintechAspect: string;
  achievementExpectation: string;
  timeCommitment: string;
  explanation: string;
  questionsForUs: string;
  
  // --- PHÂN LUỒNG & TRẠNG THÁI ---
  choice1: CandidateChoiceType;
  choice2?: CandidateChoiceType | '';
  department: DepartmentType;
  
  status: StatusType;
  isRerouted: boolean;
  reviewerEmail?: string;
  
  // --- NGĂN PHỤ ---
  customAnswers: ICustomAnswer[];
  
  // --- METADATA ---
  generation: string;
  semester: string;
  appliedAt: Date;
  createdAt?: Date;
  updatedAt?: Date; 
}

export interface ISystemConfig extends Document {
  configName: string;
  currentGeneration: string;
  currentSemester: string;
  isRecruitmentActive: boolean;
}

export interface IAuditLog extends Document {
  action: string;
  performedBy: string;
  targetUser?: string;
  targetCandidateId?: string;
  details?: string;
  timestamp: Date;
}
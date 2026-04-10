import { Document } from 'mongoose';

// 1. Enums (Định nghĩa các giá trị cố định để tránh gõ sai chính tả)
export type RoleType = 'Guest' | 'Department Head' | 'Executive Board';
export type DepartmentType = 'Technology Departmeny ' | 'Business' | 'Human Resources' | 'Marketing' | 'All' | 'Unassigned';
export type StatusType = 'Pending' | 'Pass' | 'Fail';

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
  _id?: string; // Tự động sinh ra bởi MongoDB
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
  // --- PHÂN LUỒNG & TRẠNG THÁI ---
  choice1: 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department';
  choice2?: 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department';
  department: 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department' | 'Unassigned' | 'All';
  status: 'Pending' | 'Pass' | 'Fail';
  isRerouted: boolean;
  reviewerEmail?: string;
  // --- NGĂN PHỤ (HYBRID) ---
  // Sử dụng Record<string, any> là cách chuẩn nhất trong TypeScript 
  // để đại diện cho kiểu Schema.Types.Mixed của Mongoose
  customAnswers: ICustomAnswer[];
  // --- METADATA ---
  generation: string;
  semester: string;
  appliedAt: Date;
  // Được tự động thêm vào nhờ thuộc tính { timestamps: true } trong Schema
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
import mongoose, { Schema } from 'mongoose';
import { ICandidate } from '@/app/(backend)/types';

const CustomAnswerSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String }
}, { _id: false }); // Tắt _id tự động cho từng câu hỏi để database gọn nhẹ hơn

const CandidateSchema = new Schema<ICandidate>({
  // --- THÔNG TIN CÁ NHÂN (Từ Form) ---
  fullName: { type: String, required: true },
  email: { type: String, required: true }, // Tương ứng "Your sID Email"
  dob: { type: String, required: true }, // Date of Birth
  phone: { type: String, required: true },
  majorAndYear: { type: String, required: true },
  facebookLink: { type: String, required: true },
  cvLink: { type: String, required: true },
  futurePlans: { type: String, required: true },

  // --- CÂU HỎI CHUNG (Từ Form) ---
  fintechAspect: { type: String, required: true },
  achievementExpectation: { type: String, required: true },
  timeCommitment: { type: String, required: true },
  explanation: { type: String, required: true },


  // --- PHÂN LUỒNG & TRẠNG THÁI (Hệ thống) ---
choice1: { 
    type: String, 
    required: true, 
    enum: ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department'] 
  },
  choice2: { 
    type: String, 
    enum: ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department'] 
  }, 
  department: { 
    type: String, 
    required: true, 
    enum: ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department', 'Unassigned'] 
  },
  
  status: { type: String, enum: ['Pending', 'Pass', 'Fail'], default: 'Pending' },
  isRerouted: { type: Boolean, default: false },
  reviewerEmail: { type: String },

  // --- NGĂN PHỤ: CÂU HỎI TỪNG BAN (Hybrid) ---
  customAnswers: [CustomAnswerSchema], // Khai báo dạng mảng

  // --- METADATA ---
  generation: { type: String, required: true },
  semester: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound Index: Chặn nộp trùng trong cùng 1 kỳ
CandidateSchema.index({ studentId: 1, semester: 1 }, { unique: true });

export default mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);
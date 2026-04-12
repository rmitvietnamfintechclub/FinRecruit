import mongoose, { Schema } from 'mongoose';
import { ICandidate } from '@/app/(backend)/types';

// Tắt _id tự động cho từng câu hỏi để database gọn nhẹ hơn
const CustomAnswerSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, default: "" } // Cho phép rỗng nếu ứng viên không trả lời
}, { _id: false }); 

const CandidateSchema = new Schema<ICandidate>({
  // --- THÔNG TIN CÁ NHÂN ---
  fullName: { type: String, required: true },
  email: { type: String, required: true }, 
  dob: { type: String, required: true }, 
  phone: { type: String, required: true },
  majorAndYear: { type: String, required: true },
  facebookLink: { type: String, required: true },
  cvLink: { type: String, required: true },
  futurePlans: { type: String, required: true },

  // --- CÂU HỎI CHUNG ---
  fintechAspect: { type: String, required: true },
  achievementExpectation: { type: String, required: true },
  timeCommitment: { type: String, required: true },
  // Giữ nguyên default: "" để không bị sập khi Logic App đẩy chuỗi rỗng "" vào
  explanation: { type: String, default: "" },
  questionsForUs: { type: String, default: "" },

  // --- PHÂN LUỒNG & TRẠNG THÁI ---
  choice1: { 
    type: String, 
    required: true, 
    enum: ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department'] 
  },
  choice2: { 
    type: String, 
    enum: ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department', ''] 
  }, 
  department: { 
    type: String, 
    required: true, 
    enum: ['Technology Department', 'Business Department', 'HR Department', 'Marketing Department', 'EBMB', 'Unassigned'] 
  },
  
  status: { 
    type: String, 
    enum: ['Pending', 'Pass', 'Fail'], 
    default: 'Pending' 
  },
  isRerouted: { type: Boolean, default: false },
  reviewerEmail: { type: String },

  // --- NGĂN PHỤ ---
  customAnswers: [CustomAnswerSchema], 

  // --- METADATA ---
  generation: { type: String, required: true },
  semester: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
}, {
  // Tự động sinh createdAt và updatedAt để khớp với interface ICandidate
  timestamps: true
});

export default mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);
import mongoose, { Schema } from 'mongoose';
import { ICandidate } from '@/app/(backend)/types';

const CandidateSchema = new Schema<ICandidate>({
  studentId: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  cvLink: { type: String, required: true },
  choice1: { type: String, required: true, enum: ['Technology', 'Business', 'Human Resources', 'Marketing'] },
  choice2: { type: String, enum: ['Technology', 'Business', 'Human Resources', 'Marketing'] },
  department: { type: String, required: true, enum: ['Technology', 'Business', 'Human Resources', 'Marketing', 'Unassigned'] },
  status: { type: String, enum: ['Pending', 'Pass', 'Fail', 'Incomplete'], default: 'Pending' },
  customAnswers: { type: Schema.Types.Mixed }, // Cho phép lưu object tùy ý
  generation: { type: String, required: true },
  semester: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

//Compound Index để cho phép rớt kỳ này, kỳ sau nộp lại được:
CandidateSchema.index({ studentId: 1, semester: 1 }, { unique: true });
CandidateSchema.index({ department: 1, status: 1, updatedAt: -1 });
CandidateSchema.index({ department: 1, updatedAt: -1 });

export default mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);

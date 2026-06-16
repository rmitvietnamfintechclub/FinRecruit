import mongoose, { Schema } from 'mongoose';
import { ICandidate } from '@/app/(backend)/types';

// Disable per-question _id to keep embedded documents lean
const CustomAnswerSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, default: "" } 
}, { _id: false }); 

const CandidateSchema = new Schema<ICandidate>({
  // --- MS Forms response identifier ---
  msFormResponseId: { type: String, required: true },

  // --- Personal information ---
  fullName: { type: String, required: true },
  email: { type: String, required: true }, 
  dob: { type: String, required: true }, 
  phone: { type: String, required: true },
  majorAndYear: { type: String, required: true },
  facebookLink: { type: String, required: true },
  cvLink: { type: String, required: true },
  futurePlans: { type: String, required: true },

  // --- General questions ---
  fintechAspect: { type: String, required: true },
  achievementExpectation: { type: String, required: true },
  timeCommitment: { type: String, required: true },
  explanation: { type: String, default: "" },
  questionsForUs: { type: String, default: "" },

  // --- Assignment & status ---
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

  // --- Supplementary (branched form questions) ---
  customAnswers: [CustomAnswerSchema], 

  // --- Metadata ---
  generation: { type: String},
  semester: { type: String},
  appliedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);
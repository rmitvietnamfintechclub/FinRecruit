import mongoose, { Schema } from 'mongoose';
import { ICandidate, CANDIDATE_CHOICES, DEPARTMENTS, STATUSES } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const FormAnswerSchema = new Schema(
    {
        question: { type: String, required: true },
        answer: { type: String, default: '' },
        addedBy: { type: String }
    },
    { _id: false }
);

const CandidateSchema = new Schema<ICandidate>(
    {
        msFormResponseId: { type: String, required: true },
        fullName: { type: String, required: true },
        email: { type: String, required: true },
        dob: { type: String, required: true },
        phone: { type: String, required: true },
        majorAndYear: { type: String, required: true },
        facebookLink: { type: String, required: true },
        cvLink: { type: String, required: true },
        generalAnswers: { type: [FormAnswerSchema], default: [] }, // 5 general questions

        // Round 1
        choice1: { type: String, required: true, enum: [...CANDIDATE_CHOICES] },
        choice2: { type: String, enum: [...CANDIDATE_CHOICES, ''] },
        department: { type: String, required: true, enum: [...DEPARTMENTS] },

        // Round 1
        status: { type: String, enum: [...STATUSES], default: 'Pending'},
        isRerouted: { type: Boolean, default: false },
        reviewerEmail: { type: String },
        customAnswers: { type: [FormAnswerSchema], default: [] },

        // Round 2
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

        // Meta data
        generation: { type: String },
        semester: { type: String },
        appliedAt: { type: Date, default: Date.now },
    },
    baseSchemaOptions
);

CandidateSchema.index({ department: 1, status: 1, round2Status: 1 });

export default mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);

import mongoose, { Schema } from 'mongoose';
import { IInterviewerAvailability, DEPARTMENTS } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const InterviewerAvailabilitySchema = new Schema<IInterviewerAvailability>(
    {
        slotId: { type: Schema.Types.ObjectId, ref: 'MasterInterviewSlot', required: true, index: true },
        department: { type: String, enum: [...DEPARTMENTS], required: true, index: true },
        interviewerName: { type: String, required: true, trim: true },
        interviewerEmail: { type: String, required: false, trim: true, lowercase: true, index: true },
        interviewerRole: { 
            type: String, 
            enum: ['Executive Board', 'Department Head', 'Member'], 
            default: 'Member' 
        },
        isHead: { type: Boolean, default: false, index: true }
    },
    baseSchemaOptions
);

// Unique index preventing duplicates for the same slot, department, and interviewer email
InterviewerAvailabilitySchema.index({ slotId: 1, department: 1, interviewerEmail: 1 }, { unique: true, sparse: true });

export default mongoose.models.InterviewerAvailability || 
    mongoose.model<IInterviewerAvailability>('InterviewerAvailability', InterviewerAvailabilitySchema);
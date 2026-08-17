import mongoose, { Schema } from 'mongoose';
import { IInterviewerAvailability, DEPARTMENTS } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const InterviewerAvailabilitySchema = new Schema<IInterviewerAvailability>(
    {
        slotId: { type: Schema.Types.ObjectId, ref: 'MasterInterviewSlot', required: true, index: true },
        department: { type: String, enum: [...DEPARTMENTS], required: true, index: true },
        interviewerName: { type: String, required: true },
        isHead: { type: Boolean, default: false }
    },
    baseSchemaOptions
);

InterviewerAvailabilitySchema.index({ slotId: 1, department: 1, interviewerName: 1 }, { unique: true });

export default mongoose.models.InterviewerAvailability || mongoose.model<IInterviewerAvailability>('InterviewerAvailability', InterviewerAvailabilitySchema);
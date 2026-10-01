import mongoose, { Schema } from 'mongoose';
import { IMasterInterviewSlot, SLOT_STATUSES } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const MasterInterviewSlotSchema = new Schema<IMasterInterviewSlot>(
    {
        generation: { type: String, required: true, index: true },
        semester: { type: String, required: true, index: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        room: { type: String, required: true },
        status: { type: String, enum: [...SLOT_STATUSES], default: 'AVAILABLE', index: true },
        bookedByCandidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', default: null }
    },
    baseSchemaOptions
);

export default mongoose.models.MasterInterviewSlot || mongoose.model<IMasterInterviewSlot>('MasterInterviewSlot', MasterInterviewSlotSchema);
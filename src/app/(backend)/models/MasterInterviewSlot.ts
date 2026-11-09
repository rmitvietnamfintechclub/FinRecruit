import mongoose, { Schema } from 'mongoose';
import { IMasterInterviewSlot, SLOT_STATUSES, DEPARTMENTS } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const SlotBookingSchema = new Schema(
    {
        candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
        department: { type: String, enum: [...DEPARTMENTS], required: true },
        status: { type: String, enum: [...SLOT_STATUSES], default: 'BOOKED' },
    },
    { _id: false } 
);

const MasterInterviewSlotSchema = new Schema<IMasterInterviewSlot>(
    {
        generation: { type: String, required: true, index: true },
        semester: { type: String, required: true, index: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        room: { type: String, required: true },
        assignedDepartments: {
            type: [String],
            enum: [...DEPARTMENTS],
            required: true,
        },
        bookings: { type: [SlotBookingSchema], default: [] },
        maxMembersPerDept: {
            type: Object,
            default: () => ({
                'Technology Department': 4,
                'Business Department': 4,
                'Marketing Department': 4,
                'HR Department': 4,
            }),
            required: true,
        },
    },
    baseSchemaOptions
);

export default mongoose.models.MasterInterviewSlot || mongoose.model<IMasterInterviewSlot>('MasterInterviewSlot', MasterInterviewSlotSchema);
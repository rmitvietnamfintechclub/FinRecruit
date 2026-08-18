import mongoose, { Schema } from 'mongoose';
import { IDepartmentConfig, DEPARTMENTS } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const DepartmentConfigSchema = new Schema<IDepartmentConfig>(
    {
        department: { type: String, enum: [...DEPARTMENTS], required: true },
        generation: { type: String, required: true },
        semester: { type: String, required: true },
        interviewQuestions: { type: [String], default: [] },
        isScoringEnabled: { type: Boolean, default: false }
    },
    baseSchemaOptions
);

DepartmentConfigSchema.index({ department: 1, generation: 1, semester: 1 }, { unique: true });

export default mongoose.models.DepartmentConfig || mongoose.model<IDepartmentConfig>('DepartmentConfig', DepartmentConfigSchema);
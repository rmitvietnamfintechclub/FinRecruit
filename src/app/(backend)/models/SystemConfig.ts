import mongoose, { Schema } from 'mongoose';
import { ISystemConfig, DEPARTMENTS } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const DepartmentStateSchema = new Schema(
    {
        department: { type: String, enum: [...DEPARTMENTS], required: true },
        isRound1Locked: { type: Boolean, default: false },
        isRound2Locked: { type: Boolean, default: false },
    },
    { _id: false }
    );

const SystemConfigSchema = new Schema<ISystemConfig>(
    {
        configName: { type: String, required: true, unique: true, default: 'global_settings' },
        currentGeneration: { type: String, required: true },
        currentSemester: { type: String, required: true },
        isRecruitmentActive: { type: Boolean, default: false },
        departmentStates: { type: [DepartmentStateSchema], default: [] }
    },
    baseSchemaOptions
);

export default mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
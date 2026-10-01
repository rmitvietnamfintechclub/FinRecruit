import mongoose, { Schema } from 'mongoose';
import type { IRecruitmentGeneration } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const RecruitmentSemesterSchema = new Schema(
    { code: { type: String, required: true, trim: true } },
    { _id: false }
);

const RecruitmentGenerationSchema = new Schema<IRecruitmentGeneration>(
    {
        name: { type: String, required: true, trim: true, unique: true },
        semesters: { type: [RecruitmentSemesterSchema], default: [] },
    },
    baseSchemaOptions
);

export default mongoose.models.RecruitmentGeneration ||
    mongoose.model<IRecruitmentGeneration>(
        'RecruitmentGeneration',
        RecruitmentGenerationSchema
    );

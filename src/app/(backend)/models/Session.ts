import mongoose, { Schema } from 'mongoose';
import { ISession } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const SessionSchema = new Schema<ISession>(
    {
        sessionId: { type: String, required: true, unique: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        expiresAt: { type: Date, required: true },
    },
    baseSchemaOptions
);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

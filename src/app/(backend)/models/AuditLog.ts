import mongoose, { Schema } from 'mongoose';
import { IAuditLog, AUDIT_LOG_LEVELS, AUDIT_LOG_CATEGORIES } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

/** TTL: 90 days. MongoDB drops expired docs roughly once per minute. */
export const AUDIT_LOG_TTL_SECONDS = 60 * 60 * 24 * 90;

const ActorSchema = new Schema(
    { userId: { type: String }, email: { type: String }, role: { type: String } },
    { _id: false }
);

const TargetSchema = new Schema(
    {
        userId: { type: String },
        email: { type: String },
        candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' },
        msFormResponseId: { type: String },
        label: { type: String },
    },
    { _id: false }
);

const AuditLogSchema = new Schema<IAuditLog>(
    {
        level: { type: String, enum: AUDIT_LOG_LEVELS, required: true, default: 'info' },
        category: { type: String, enum: AUDIT_LOG_CATEGORIES, required: true },
        action: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        performedBy: { type: ActorSchema, default: undefined },
        target: { type: TargetSchema, default: undefined },
        metadata: { type: Schema.Types.Mixed },
        ipAddress: { type: String },
        userAgent: { type: String },
        timestamp: {
            type: Date,
            default: Date.now,
            immutable: true,
            // TTL: documents older than AUDIT_LOG_TTL_SECONDS are deleted automatically.
            // Each log row is otherwise immutable (no updatedAt), matching audit-trail
            // semantics — we only ever insert or evict.
            index: { expireAfterSeconds: AUDIT_LOG_TTL_SECONDS },
        },
    },
    { 
        versionKey: false,
        toJSON: baseSchemaOptions.toJSON,
    }
);

// Compound indexes for the most common admin queries.
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ level: 1, timestamp: -1 });
AuditLogSchema.index({ 'performedBy.email': 1, timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)

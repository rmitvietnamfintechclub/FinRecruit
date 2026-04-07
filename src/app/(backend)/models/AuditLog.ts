import mongoose, { Schema } from 'mongoose';
import { IAuditLog } from '@/app/(backend)/types';

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  targetUser: { type: String }, // to log action for specific user (Head, Admin)
  targetCandidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' }, // to log action for specific candidate
  details: { type: String },
  timestamp: { type: Date, default: Date.now, immutable: true } // immutable: true đảm bảo log không bao giờ bị sửa
});

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
import mongoose, { Schema } from 'mongoose';
import { IAuditLog } from '@/app/(backend)/types';

const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  targetUser: { type: String },
  details: { type: String },
  timestamp: { type: Date, default: Date.now, immutable: true } // immutable: true đảm bảo log không bao giờ bị sửa
});

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
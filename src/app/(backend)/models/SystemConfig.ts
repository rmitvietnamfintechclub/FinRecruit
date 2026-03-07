import mongoose, { Schema } from 'mongoose';
import { ISystemConfig } from '@/app/(backend)/types';

const SystemConfigSchema = new Schema<ISystemConfig>({
  configName: { type: String, required: true, unique: true, default: 'global_settings' },
  currentGeneration: { type: String, required: true },
  currentSemester: { type: String, required: true },
  isRecruitmentActive: { type: Boolean, default: false }
});

export default mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
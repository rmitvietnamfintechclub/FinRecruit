import mongoose, { Schema } from 'mongoose';
import { IUser } from '@/app/(backend)/types';

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String, default: null },
    role: {
      type: String,
      enum: ['Guest', 'Department Head', 'Executive Board'],
      default: 'Guest',
    },
    department: {
      type: String,
      enum: [
        'Technology Department',
        'Business Department',
        'HR Department',
        'Marketing Department',
        'EBMB',
        'Unassigned',
        // Legacy values (older documents / migration)
        'Technology',
        'Business',
        'Human Resources',
        'Marketing',
        'All',
      ],
      default: 'Unassigned',
    },
    generation: { type: String, default: '', trim: true },
    semester: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

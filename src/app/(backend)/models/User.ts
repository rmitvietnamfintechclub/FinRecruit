import mongoose, { Schema } from 'mongoose';
import { IUser } from '@/app/(backend)/types';

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['Guest', 'Department Head', 'Executive Board'], 
    default: 'Guest' 
  },
  department: { 
    type: String, 
    enum: ['Technology', 'Business', 'Human Resources', 'Marketing', 'All', 'Unassigned'], 
    default: 'Unassigned' 
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
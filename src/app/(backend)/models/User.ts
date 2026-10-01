import mongoose, { Schema } from 'mongoose';
import { IUser, ROLES, DEPARTMENTS } from '@/app/(backend)/types';
import { baseSchemaOptions } from './baseSchemaOptions';

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, trim: true, default: null },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        avatar: { type: String, default: null },
        role: { type: String, enum: [...ROLES], default: 'Guest' },
        department: {
            type: String,
            enum: [...DEPARTMENTS, 'Technology', 'Business', 'Human Resources', 'Marketing', 'All'], 
            default: 'Unassigned',
        },
        generation: { type: String, default: '', trim: true },
        semester: { type: String, default: '', trim: true },
        isActive: { type: Boolean, default: true },
    },
    baseSchemaOptions
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

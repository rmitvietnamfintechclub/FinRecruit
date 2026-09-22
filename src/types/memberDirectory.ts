import type { DepartmentType, RoleType } from '@/app/(backend)/types';

export type DirectoryAccount = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: RoleType;
  department: DepartmentType;
  isActive: boolean;
};

export type MemberDirectoryPayload = {
  waitingGuests: DirectoryAccount[];
  members: DirectoryAccount[];
};

export type GrantMemberResult = {
  success: boolean;
  message?: string;
  member?: DirectoryAccount;
};

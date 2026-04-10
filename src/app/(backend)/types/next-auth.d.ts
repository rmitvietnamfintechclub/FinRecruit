import type { DefaultSession } from 'next-auth';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      role?: RoleType;
      department?: DepartmentType;
      isActive?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: RoleType;
    department?: DepartmentType;
    isActive?: boolean;
  }
}

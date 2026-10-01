'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import type { GrantMemberResult, MemberDirectoryPayload } from '@/types/memberDirectory';
import {
  getSnapshot,
  grantMemberInStore,
} from '@/lib/member-directory/mock-store';
import {
  httpGetDirectory,
  httpGrantMember,
} from '@/lib/member-directory/http-api';

export type MemberDirectoryApi = {
  getDirectory(): Promise<MemberDirectoryPayload>;
  grantMember(userId: string, department: DepartmentType): Promise<GrantMemberResult>;
};

const mockApi: MemberDirectoryApi = {
  async getDirectory() {
    return getSnapshot();
  },
  async grantMember(userId, department) {
    const next = grantMemberInStore(userId, department);
    const member = next.members.find((entry) => entry.id === userId);
    return member
      ? { success: true, member }
      : { success: false, message: 'Account not found in the waiting room.' };
  },
};

const httpApi: MemberDirectoryApi = {
  getDirectory: httpGetDirectory,
  grantMember: httpGrantMember,
};

export function getMemberDirectoryApi(): MemberDirectoryApi {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false' ? httpApi : mockApi;
}

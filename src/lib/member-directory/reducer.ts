import type { DepartmentType } from '@/app/(backend)/types';
import type { DirectoryAccount, MemberDirectoryPayload } from '@/types/memberDirectory';
import { SEED_WAITING_GUESTS } from '@/lib/member-directory/seed';

export function createInitialDirectory(): MemberDirectoryPayload {
  return { waitingGuests: SEED_WAITING_GUESTS, members: [] };
}

export function grantMember(
  payload: MemberDirectoryPayload,
  userId: string,
  department: DepartmentType
): MemberDirectoryPayload {
  const account = payload.waitingGuests.find((user) => user.id === userId);
  if (!account) return payload;

  const member: DirectoryAccount = {
    ...account,
    role: 'Member',
    department,
  };

  return {
    waitingGuests: payload.waitingGuests.filter((user) => user.id !== userId),
    members: [...payload.members, member],
  };
}

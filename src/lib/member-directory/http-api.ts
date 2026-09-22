import type { DepartmentType } from '@/app/(backend)/types';
import type {
  GrantMemberResult,
  MemberDirectoryPayload,
} from '@/types/memberDirectory';

export async function httpGetDirectory(): Promise<MemberDirectoryPayload> {
  const res = await fetch('/api/head-dashboard/members', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as MemberDirectoryPayload;
}

export async function httpGrantMember(
  userId: string,
  department: DepartmentType
): Promise<GrantMemberResult> {
  const res = await fetch('/api/head-dashboard/members', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId, role: 'Member', department }),
  });
  const json = (await res.json()) as GrantMemberResult;
  if (!res.ok || !json.success) {
    return { success: false, message: json.message ?? `Request failed (${res.status})` };
  }
  return json;
}

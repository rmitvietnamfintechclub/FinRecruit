import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState, LockRound1Result } from '@/types/roundTransition';

type RoundStatesResponse = {
  success?: boolean;
  departmentStates?: DepartmentState[];
};

export async function httpGetDepartmentStates(): Promise<DepartmentState[]> {
  const res = await fetch('/api/head-dashboard/round-states', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const json = (await res.json()) as RoundStatesResponse;
  return json.departmentStates ?? [];
}

type LockResponse = {
  success?: boolean;
  message?: string;
  locked?: boolean;
  department?: DepartmentType;
};

export async function httpLockRound1(
  department: DepartmentType
): Promise<LockRound1Result> {
  const res = await fetch('/api/head-dashboard/lock-round-1', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ department }),
  });
  const json = (await res.json()) as LockResponse;
  if (!res.ok || !json.success) {
    return { success: false, message: json.message ?? `Request failed (${res.status})` };
  }
  return {
    success: true,
    message: json.message,
    roundStatus: {
      department: json.department ?? department,
      isRound1Locked: json.locked ?? true,
      isRound2Locked: false,
    },
  };
}

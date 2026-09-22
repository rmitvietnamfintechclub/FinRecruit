'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { GrantMemberResult, MemberDirectoryPayload } from '@/types/memberDirectory';
import { getMemberDirectoryApi } from '@/lib/member-directory/api';
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from '@/lib/member-directory/mock-store';

export function useMemberDirectory(): MemberDirectoryPayload {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useGrantMember() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grant = useCallback(
    async (
      userId: string,
      department: DepartmentType
    ): Promise<GrantMemberResult> => {
      setPending(true);
      setError(null);
      try {
        const result = await getMemberDirectoryApi().grantMember(userId, department);
        if (!result.success) {
          setError(result.message ?? 'Failed to grant the Member role.');
        }
        return result;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Failed to grant the Member role.';
        setError(message);
        return { success: false, message };
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { grant, pending, error };
}

'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { GrantMemberResult, MemberDirectoryPayload } from '@/types/memberDirectory';
import { getMemberDirectoryApi } from '@/lib/member-directory/api';
import {
  getServerSnapshot,
  getSnapshot,
  grantMemberInStore,
  subscribe,
  syncDirectory,
} from '@/lib/member-directory/mock-store';

export function useMemberDirectory(): MemberDirectoryPayload {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';
  const directory = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isMock) return;
    let active = true;
    getMemberDirectoryApi()
      .getDirectory()
      .then((next) => {
        if (active) syncDirectory(next);
      })
      .catch(() => {
        /* keep the local snapshot on failure */
      });
    return () => {
      active = false;
    };
  }, [isMock]);

  return directory;
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
        } else {
          // Keep the local store in sync so the list updates immediately.
          grantMemberInStore(userId, department);
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

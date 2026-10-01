'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState, LockRound1Result } from '@/types/roundTransition';
import { getRoundTransitionApi } from '@/lib/round-transition/api';
import {
  getServerSnapshot,
  getSnapshot,
  lockDepartmentRound1,
  subscribe,
  syncDepartmentStates,
} from '@/lib/round-transition/mock-store';

export function useDepartmentStates(): DepartmentState[] {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';
  const states = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isMock) return;
    let active = true;
    getRoundTransitionApi()
      .getDepartmentStates()
      .then((next) => {
        if (active) syncDepartmentStates(next);
      })
      .catch(() => {
        /* keep the local snapshot on failure */
      });
    return () => {
      active = false;
    };
  }, [isMock]);

  return states;
}

export function useLockRound1() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lock = useCallback(
    async (department: DepartmentType): Promise<LockRound1Result> => {
      setPending(true);
      setError(null);
      try {
        const result = await getRoundTransitionApi().lockRound1(department);
        if (!result.success) {
          setError(result.message ?? 'Failed to lock Round 1.');
        } else {
          // Keep the local store in sync so the UI reflects the lock immediately.
          lockDepartmentRound1(department);
        }
        return result;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Failed to lock Round 1.';
        setError(message);
        return { success: false, message };
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { lock, pending, error };
}

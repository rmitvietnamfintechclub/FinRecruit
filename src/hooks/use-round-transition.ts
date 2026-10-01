'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState, LockRound1Result } from '@/types/roundTransition';
import { getRoundTransitionApi } from '@/lib/round-transition/api';
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from '@/lib/round-transition/mock-store';

// TODO(backend): wire getRoundTransitionApi().getDepartmentStates() once reads move server-side.
export function useDepartmentStates(): DepartmentState[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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

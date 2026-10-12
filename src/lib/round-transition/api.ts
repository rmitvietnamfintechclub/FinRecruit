'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState, LockRound1Result } from '@/types/roundTransition';
import {
  getSnapshot,
  lockDepartmentRound1,
} from '@/lib/round-transition/mock-store';
import {
  httpGetDepartmentStates,
  httpLockRound1,
} from '@/lib/round-transition/http-api';

export type RoundTransitionApi = {
  getDepartmentStates(): Promise<DepartmentState[]>;
  lockRound1(department: DepartmentType): Promise<LockRound1Result>;
};

const mockApi: RoundTransitionApi = {
  async getDepartmentStates() {
    return getSnapshot();
  },
  async lockRound1(department) {
    const states = lockDepartmentRound1(department);
    return {
      success: true,
      roundStatus: states.find((state) => state.department === department),
    };
  },
};

const httpApi: RoundTransitionApi = {
  getDepartmentStates: httpGetDepartmentStates,
  lockRound1: httpLockRound1,
};

export function getRoundTransitionApi(): RoundTransitionApi {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false' ? httpApi : mockApi;
}

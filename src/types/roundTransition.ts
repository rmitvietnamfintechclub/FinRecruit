import type { DepartmentType } from '@/app/(backend)/types';

export type DepartmentState = {
  department: DepartmentType;
  isRound1Locked: boolean;
  isRound2Locked: boolean;
};

export type LockRound1Result = {
  success: boolean;
  message?: string;
  roundStatus?: DepartmentState;
};

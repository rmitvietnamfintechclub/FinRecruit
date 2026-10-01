import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState } from '@/types/roundTransition';

export const ROUND_TRANSITION_DEPARTMENTS: DepartmentType[] = [
  'Technology Department',
  'Business Department',
  'HR Department',
  'Marketing Department',
];

export function createInitialDepartmentStates(): DepartmentState[] {
  return ROUND_TRANSITION_DEPARTMENTS.map((department) => ({
    department,
    isRound1Locked: false,
    isRound2Locked: false,
  }));
}

export function lockRound1(
  states: DepartmentState[],
  department: DepartmentType
): DepartmentState[] {
  return states.map((state) =>
    state.department === department
      ? { ...state, isRound1Locked: true }
      : state
  );
}

export function findDepartmentState(
  states: DepartmentState[],
  department: DepartmentType
): DepartmentState | undefined {
  return states.find((state) => state.department === department);
}

export function lockedCount(states: DepartmentState[]): number {
  return states.filter((state) => state.isRound1Locked).length;
}

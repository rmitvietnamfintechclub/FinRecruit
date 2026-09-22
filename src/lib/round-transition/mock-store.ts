'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState } from '@/types/roundTransition';
import {
  createInitialDepartmentStates,
  findDepartmentState,
  lockRound1,
} from '@/lib/round-transition/reducer';

const STORAGE_KEY = 'finrecruit.mock.v1';
const serverSnapshot = createInitialDepartmentStates();

let states: DepartmentState[] = serverSnapshot;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): DepartmentState[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDepartmentStates();
    const parsed = JSON.parse(raw) as DepartmentState[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : createInitialDepartmentStates();
  } catch {
    return createInitialDepartmentStates();
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    states = readStorage();
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): DepartmentState[] {
  return states;
}

export function getServerSnapshot(): DepartmentState[] {
  return serverSnapshot;
}

export function lockDepartmentRound1(
  department: DepartmentType
): DepartmentState[] {
  states = lockRound1(states, department);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {
    /* storage unavailable - keep in-memory */
  }
  emit();
  return states;
}

export function readDepartmentState(
  department: DepartmentType
): DepartmentState | undefined {
  return findDepartmentState(states, department);
}

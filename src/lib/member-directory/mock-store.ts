'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import type { MemberDirectoryPayload } from '@/types/memberDirectory';
import {
  createInitialDirectory,
  grantMember,
} from '@/lib/member-directory/reducer';

const STORAGE_KEY = 'finrecruit.mock.v1.members';
const serverSnapshot = createInitialDirectory();

let directory: MemberDirectoryPayload = serverSnapshot;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): MemberDirectoryPayload {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDirectory();
    const parsed = JSON.parse(raw) as MemberDirectoryPayload;
    return parsed && Array.isArray(parsed.waitingGuests) && Array.isArray(parsed.members)
      ? parsed
      : createInitialDirectory();
  } catch {
    return createInitialDirectory();
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    directory = readStorage();
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): MemberDirectoryPayload {
  return directory;
}

export function getServerSnapshot(): MemberDirectoryPayload {
  return serverSnapshot;
}

export function grantMemberInStore(
  userId: string,
  department: DepartmentType
): MemberDirectoryPayload {
  directory = grantMember(directory, userId, department);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(directory));
  } catch {
    /* storage unavailable - keep in-memory */
  }
  emit();
  return directory;
}

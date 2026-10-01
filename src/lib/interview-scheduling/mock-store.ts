'use client';

import type {
  BookingCandidate,
  ConfirmBookingResult,
  InterviewDepartment,
  InterviewSlot,
  InterviewerAvailabilityRecord,
  InterviewerIdentity,
  NewInterviewSlot,
  SlotMutationResult,
} from '@/types/interviewScheduling';
import {
  addSlots,
  confirmBooking,
  createInitialAvailability,
  createInitialSlots,
  pruneAvailability,
  removeSlot,
  replaceAvailability,
  updateSlot,
} from '@/lib/interview-scheduling/reducer';

const SLOTS_KEY = 'finrecruit.mock.v1.interview-slots';
const AVAILABILITY_KEY = 'finrecruit.mock.v1.interview-availability';

const serverSlots = createInitialSlots();
const serverAvailability = createInitialAvailability();

let slots: InterviewSlot[] = serverSlots;
let availability: InterviewerAvailabilityRecord[] = serverAvailability;
let hydrated = false;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: () => T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback();
  } catch {
    return fallback();
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
    window.localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(availability));
  } catch {
    /* storage unavailable - keep in-memory */
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Re-read storage so a second browser tab sees the other tab's writes. */
export function syncFromStorage(): void {
  slots = read(SLOTS_KEY, createInitialSlots);
  availability = read(AVAILABILITY_KEY, createInitialAvailability);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    syncFromStorage();
    queueMicrotask(emit);
    window.addEventListener('storage', (e) => {
      if (e.key === SLOTS_KEY || e.key === AVAILABILITY_KEY) {
        syncFromStorage();
        emit();
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSlotsSnapshot(): InterviewSlot[] {
  return slots;
}
export function getSlotsServerSnapshot(): InterviewSlot[] {
  return serverSlots;
}
export function getAvailabilitySnapshot(): InterviewerAvailabilityRecord[] {
  return availability;
}
export function getAvailabilityServerSnapshot(): InterviewerAvailabilityRecord[] {
  return serverAvailability;
}

export function addSlotsInStore(newSlots: NewInterviewSlot[]): InterviewSlot[] {
  syncFromStorage();
  slots = addSlots(slots, newSlots);
  persist();
  emit();
  return slots;
}

export function updateSlotInStore(
  id: string,
  patch: Parameters<typeof updateSlot>[2]
): SlotMutationResult {
  syncFromStorage();
  const result = updateSlot(slots, id, patch);
  if (result.ok) {
    slots = result.slots;
    persist();
    emit();
  }
  return result;
}

export function removeSlotInStore(id: string): SlotMutationResult {
  syncFromStorage();
  const result = removeSlot(slots, id);
  if (result.ok) {
    slots = result.slots;
    availability = pruneAvailability(availability, slots);
    persist();
    emit();
  }
  return result;
}

export function replaceAvailabilityInStore(
  selections: Array<{ department: InterviewDepartment; slotIds: string[] }>,
  identity: InterviewerIdentity
): InterviewerAvailabilityRecord[] {
  syncFromStorage();
  availability = replaceAvailability(availability, selections, identity);
  persist();
  emit();
  return availability;
}

export function confirmBookingInStore(
  slotId: string,
  candidate: BookingCandidate
): ConfirmBookingResult {
  syncFromStorage(); // pick up a booking made in another tab before checking
  const result = confirmBooking(slots, slotId, candidate);
  if (result.ok) {
    slots = result.slots;
    persist();
    emit();
  }
  return result;
}

export function resetInterviewMockStore(): void {
  slots = createInitialSlots();
  availability = createInitialAvailability();
  persist();
  emit();
}

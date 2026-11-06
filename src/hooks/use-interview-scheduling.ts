'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type {
  ConfirmBookingInput,
  ConfirmBookingResult,
  InterviewLinks,
  InterviewSlot,
  InterviewerAvailabilityRecord,
  NewInterviewSlot,
  SlotMutationResult,
  SubmitAvailabilityInput,
  InterviewDepartment,
} from '@/types/interviewScheduling';
import * as httpApi from '@/lib/interview-scheduling/http-api';

// ==========================================
// GLOBAL STATE CACHE (Dành cho Real API)
// ==========================================
let globalSlots: InterviewSlot[] = [];
let globalAvailability: InterviewerAvailabilityRecord[] = [];
const EMPTY_SLOTS: InterviewSlot[] = [];
const EMPTY_AVAILABILITY: InterviewerAvailabilityRecord[] = [];
const listeners = new Set<() => void>();

const notifyListeners = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export async function refreshSlots(): Promise<void> {
  try {
    globalSlots = await httpApi.httpListSlots();
    notifyListeners();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('401')) {
       console.warn('[System] Unauthorized to fetch slots. Session might have expired.');
    } else {
       console.error('[System] Failed to fetch slots:', err);
    }
  }
}

export async function refreshAvailability(): Promise<void> {
  try {
    const data = await httpApi.httpGetAvailabilityMonitor();
    globalSlots = data.slots;
    globalAvailability = data.availability;
    notifyListeners();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('401')) {
       console.warn('[System] Unauthorized to fetch availability. Session might have expired.');
    } else {
       console.error('[System] Failed to fetch availability:', err);
    }
  }
}

// ==========================================
// DATA FETCHING HOOKS
// ==========================================
export function useInterviewSlots(): InterviewSlot[] {
  useEffect(() => {
    void refreshSlots();
    const interval = setInterval(() => {
      if (!document.hidden) void refreshSlots();
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => globalSlots,
    () => EMPTY_SLOTS
  );
}

export function useAvailabilityRecords(): InterviewerAvailabilityRecord[] {
  useEffect(() => {
    void refreshAvailability();
    const interval = setInterval(() => {
      if (!document.hidden) void refreshAvailability();
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => globalAvailability,
    () => EMPTY_AVAILABILITY
  );
}

export function useInterviewLinks(): InterviewLinks | null {
  const [links, setLinks] = useState<InterviewLinks | null>(null);
  useEffect(() => {
    httpApi
      .httpGetLinks()
      .then(setLinks)
      .catch(() => {});
  }, []);
  return links;
}

// ==========================================
// MUTATION ACTION HOOK (Wrapper xử lý Pending/Error)
// ==========================================
function useAction<A extends unknown[], R>(
  run: (...args: A) => Promise<R>,
  fallbackMessage: string
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: A): Promise<R> => {
      setPending(true);
      setError(null);
      try {
        return await run(...args);
      } catch (e) {
        setError(e instanceof Error ? e.message : fallbackMessage);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [run, fallbackMessage]
  );

  return { execute, pending, error, clearError: () => setError(null) };
}

export function usePublishSlots() {
  const { execute, pending, error } = useAction(
    async (slots: NewInterviewSlot[]) => {
      const createdSlots = await httpApi.httpPublishSlots(slots);
      globalSlots = createdSlots;
      notifyListeners();
      return createdSlots;
    },
    'Failed to publish slots.'
  );
  return { publish: execute, pending, error };
}

export function useUpdateSlot() {
  const { execute, pending, error } = useAction(
    async (
      id: string,
      patch: Partial<InterviewSlot>
    ): Promise<SlotMutationResult> => {
      const result = await httpApi.httpUpdateSlot(id, patch);
      if (result.ok && result.slots) {
        globalSlots = result.slots;
        notifyListeners();
      }
      return result;
    },
    'Failed to update slot.'
  );
  return { update: execute, pending, error };
}

export function useUpdateSlotStatus() {
  const { execute, pending, error } = useAction(
    async (
      id: string,
      department: InterviewDepartment,
      status: 'AVAILABLE' | 'BOOKED' | 'COMPLETED' | 'NO_SHOW'
    ): Promise<SlotMutationResult> => {
      const result = await httpApi.httpUpdateSlotStatus(id, department, status);
      if (result.ok && result.slots) {
        globalSlots = result.slots;
        notifyListeners();
      }
      return result;
    },
    'Failed to update slot status.'
  );
  return { updateStatus: execute, pending, error };
}

export function useDeleteSlot() {
  const { execute, pending, error } = useAction(
    async (id: string): Promise<SlotMutationResult> => {
      const result = await httpApi.httpDeleteSlot(id);
      if (result.ok && result.slots) {
        globalSlots = result.slots;
        globalAvailability = globalAvailability.filter((r) => r.slotId !== id);
        notifyListeners();
      }
      return result;
    },
    'Failed to delete slot.'
  );
  return { remove: execute, pending, error };
}

export function useSubmitAvailability() {
  const { execute, pending, error } = useAction(
    async (input: SubmitAvailabilityInput) => {
      const result = await httpApi.httpSubmitAvailability(input);
      if (result.success) void refreshAvailability();
      return result;
    },
    'Failed to submit availability.'
  );
  return { submit: execute, pending, error };
}

export function useConfirmBooking() {
  const { execute, pending, error } = useAction(
    async (input: ConfirmBookingInput): Promise<ConfirmBookingResult> => {
      const result = await httpApi.httpConfirmBooking(input);
      if (result.ok) void refreshAvailability();
      return result;
    },
    'Failed to confirm booking.'
  );
  return { confirm: execute, pending, error };
}

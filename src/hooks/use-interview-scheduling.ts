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
} from '@/types/interviewScheduling';
import { getInterviewSchedulingApi } from '@/lib/interview-scheduling/api';
import {
  getAvailabilityServerSnapshot,
  getAvailabilitySnapshot,
  getSlotsServerSnapshot,
  getSlotsSnapshot,
  subscribe as subscribeMock,
} from '@/lib/interview-scheduling/mock-store';

const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';

// Shared state cache & subscriber listeners for real API mode
let realSlots: InterviewSlot[] = [];
let realAvailability: InterviewerAvailabilityRecord[] = [];
const realListeners = new Set<() => void>();

function notifyRealListeners() {
  realListeners.forEach((listener) => listener());
}

function subscribeReal(listener: () => void) {
  realListeners.add(listener);
  return () => {
    realListeners.delete(listener);
  };
}

export async function refreshRealSlots(): Promise<void> {
  try {
    const slots = await getInterviewSchedulingApi().listSlots();
    realSlots = slots;
    notifyRealListeners();
  } catch (err) {
    console.error('[useInterviewSlots] Failed to fetch interview slots:', err);
  }
}

export async function refreshRealAvailability(): Promise<void> {
  try {
    const data = await getInterviewSchedulingApi().getAvailabilityMonitor();
    realSlots = data.slots;
    realAvailability = data.availability;
    notifyRealListeners();
  } catch (err) {
    console.error('[useAvailabilityRecords] Failed to fetch availability records:', err);
  }
}

/**
 * Returns all interview slots for the current active cohort.
 * Reads from the mock store in mock mode, or fetches from the real backend with auto-polling.
 */
export function useInterviewSlots(): InterviewSlot[] {
  useEffect(() => {
    if (isMock) return;

    void refreshRealSlots();

    // Poll every 15s when visible to capture bookings made in other tabs/browsers
    const interval = setInterval(() => {
      if (!document.hidden) {
        void refreshRealSlots();
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, []);

  const mockSlots = useSyncExternalStore(
    subscribeMock,
    getSlotsSnapshot,
    getSlotsServerSnapshot
  );

  const serverSlots = useSyncExternalStore(
    subscribeReal,
    () => realSlots,
    () => []
  );

  return isMock ? mockSlots : serverSlots;
}

/**
 * Returns interviewer availability declarations for all published slots.
 * Reads from the mock store in mock mode, or fetches from the real backend with auto-polling.
 */
export function useAvailabilityRecords(): InterviewerAvailabilityRecord[] {
  useEffect(() => {
    if (isMock) return;

    void refreshRealAvailability();

    // Poll every 15s when visible to update the availability matrix dynamically
    const interval = setInterval(() => {
      if (!document.hidden) {
        void refreshRealAvailability();
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, []);

  const mockAvailability = useSyncExternalStore(
    subscribeMock,
    getAvailabilitySnapshot,
    getAvailabilityServerSnapshot
  );

  const serverAvailability = useSyncExternalStore(
    subscribeReal,
    () => realAvailability,
    () => []
  );

  return isMock ? mockAvailability : serverAvailability;
}

export function useInterviewLinks(): InterviewLinks | null {
  const [links, setLinks] = useState<InterviewLinks | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInterviewSchedulingApi()
      .getLinks()
      .then((l) => {
        if (!cancelled) setLinks(l);
      })
      .catch(() => {
        /* links stay null; callers render fallback/placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}

/** Shared pending/error wrapper for one mutation action. */
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
      const createdSlots = await getInterviewSchedulingApi().publishSlots(slots);
      if (!isMock) {
        realSlots = createdSlots;
        notifyRealListeners();
      }
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
      patch: Parameters<ReturnType<typeof getInterviewSchedulingApi>['updateSlot']>[1]
    ): Promise<SlotMutationResult> => {
      const result = await getInterviewSchedulingApi().updateSlot(id, patch);
      if (result.ok && !isMock) {
        realSlots = result.slots;
        notifyRealListeners();
      }
      return result;
    },
    'Failed to update slot.'
  );
  return { update: execute, pending, error };
}

export function useDeleteSlot() {
  const { execute, pending, error } = useAction(
    async (id: string): Promise<SlotMutationResult> => {
      const result = await getInterviewSchedulingApi().deleteSlot(id);
      if (result.ok && !isMock) {
        realSlots = result.slots;
        realAvailability = realAvailability.filter((r) => r.slotId !== id);
        notifyRealListeners();
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
      const result = await getInterviewSchedulingApi().submitAvailability(input);
      if (result.success && !isMock) {
        void refreshRealAvailability();
      }
      return result;
    },
    'Failed to submit availability.'
  );
  return { submit: execute, pending, error };
}

export function useConfirmBooking() {
  const { execute, pending, error } = useAction(
    async (input: ConfirmBookingInput): Promise<ConfirmBookingResult> => {
      const result = await getInterviewSchedulingApi().confirmBooking(input);
      if (result.ok && !isMock) {
        void refreshRealAvailability();
      }
      return result;
    },
    'Failed to confirm booking.'
  );
  return { confirm: execute, pending, error };
}

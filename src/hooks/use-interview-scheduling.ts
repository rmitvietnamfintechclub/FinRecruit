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
  subscribe,
} from '@/lib/interview-scheduling/mock-store';

// TODO(backend): wire getInterviewSchedulingApi().listSlots()/getAvailabilityMonitor()
// once reads move server-side; today these read the mock store directly.
export function useInterviewSlots(): InterviewSlot[] {
  return useSyncExternalStore(subscribe, getSlotsSnapshot, getSlotsServerSnapshot);
}

export function useAvailabilityRecords(): InterviewerAvailabilityRecord[] {
  return useSyncExternalStore(subscribe, getAvailabilitySnapshot, getAvailabilityServerSnapshot);
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
        /* links stay null; callers render a placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return links;
}

/** Shared pending/error wrapper for one mutation. */
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
    (slots: NewInterviewSlot[]) => getInterviewSchedulingApi().publishSlots(slots),
    'Failed to publish slots.'
  );
  return { publish: execute, pending, error };
}

export function useUpdateSlot() {
  const { execute, pending, error } = useAction(
    (id: string, patch: Parameters<ReturnType<typeof getInterviewSchedulingApi>['updateSlot']>[1]): Promise<SlotMutationResult> =>
      getInterviewSchedulingApi().updateSlot(id, patch),
    'Failed to update slot.'
  );
  return { update: execute, pending, error };
}

export function useDeleteSlot() {
  const { execute, pending, error } = useAction(
    (id: string): Promise<SlotMutationResult> => getInterviewSchedulingApi().deleteSlot(id),
    'Failed to delete slot.'
  );
  return { remove: execute, pending, error };
}

export function useSubmitAvailability() {
  const { execute, pending, error } = useAction(
    (input: SubmitAvailabilityInput) => getInterviewSchedulingApi().submitAvailability(input),
    'Failed to submit availability.'
  );
  return { submit: execute, pending, error };
}

export function useConfirmBooking() {
  const { execute, pending, error } = useAction(
    (input: ConfirmBookingInput): Promise<ConfirmBookingResult> =>
      getInterviewSchedulingApi().confirmBooking(input),
    'Failed to confirm booking.'
  );
  return { confirm: execute, pending, error };
}

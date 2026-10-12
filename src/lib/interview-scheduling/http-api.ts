import type {
  BookableSlot,
  ConfirmBookingInput,
  ConfirmBookingResult,
  InterviewDepartment,
  InterviewLinks,
  InterviewSlot,
  InterviewerAvailabilityRecord,
  NewInterviewSlot,
  SlotMutationResult,
  SubmitAvailabilityInput,
} from '@/types/interviewScheduling';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function httpListSlots(): Promise<InterviewSlot[]> {
  const json = await request<{ slots?: InterviewSlot[] }>('/api/executive/interview-slots');
  return json.slots ?? [];
}

export async function httpPublishSlots(slots: NewInterviewSlot[]): Promise<InterviewSlot[]> {
  const json = await request<{ slots?: InterviewSlot[] }>('/api/executive/interview-slots', {
    method: 'POST',
    body: JSON.stringify({ slots }),
  });
  return json.slots ?? [];
}

export async function httpUpdateSlot(
  id: string,
  patch: Partial<Pick<InterviewSlot, 'date' | 'startTime' | 'endTime' | 'room'>>
): Promise<SlotMutationResult> {
  const res = await fetch(`/api/executive/interview-slots/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as { slots?: InterviewSlot[]; message?: string };
  if (!res.ok) {
    return {
      ok: false,
      reason: res.status === 409 ? 'SLOT_BOOKED' : 'SLOT_NOT_FOUND',
      message: json.message ?? `Request failed (${res.status})`,
    };
  }
  return { ok: true, slots: json.slots ?? [] };
}

export async function httpDeleteSlot(id: string): Promise<SlotMutationResult> {
  const res = await fetch(`/api/executive/interview-slots/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = (await res.json()) as { slots?: InterviewSlot[]; message?: string };
  if (!res.ok) {
    return {
      ok: false,
      reason: res.status === 409 ? 'SLOT_BOOKED' : 'SLOT_NOT_FOUND',
      message: json.message ?? `Request failed (${res.status})`,
    };
  }
  return { ok: true, slots: json.slots ?? [] };
}

export function httpGetLinks(): Promise<InterviewLinks> {
  return request<InterviewLinks>('/api/executive/interview-links');
}

export async function httpGetAvailabilityMonitor(): Promise<{
  slots: InterviewSlot[];
  availability: InterviewerAvailabilityRecord[];
}> {
  return request('/api/executive/interview-availability');
}

export async function httpGetBookingsMonitor(department: InterviewDepartment | 'all'): Promise<{
  slots: InterviewSlot[];
  availability: InterviewerAvailabilityRecord[];
}> {
  return request(`/api/executive/interview-bookings?department=${encodeURIComponent(department)}`);
}

export async function httpGetPublicAvailability(): Promise<InterviewSlot[]> {
  const json = await request<{ slots?: InterviewSlot[] }>('/api/public/interview-availability');
  return json.slots ?? [];
}

export async function httpSubmitAvailability(
  input: SubmitAvailabilityInput
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch('/api/public/interview-availability', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) {
    return { success: false, message: json.message ?? `Request failed (${res.status})` };
  }
  return { success: true };
}

export async function httpGetBookableSchedule(department: InterviewDepartment): Promise<BookableSlot[]> {
  const json = await request<{ slots?: BookableSlot[] }>(
    `/api/public/interview-booking?department=${encodeURIComponent(department)}`
  );
  return json.slots ?? [];
}

export async function httpFindExistingBooking(email: string): Promise<InterviewSlot | null> {
  const json = await request<{ booking?: InterviewSlot | null }>(
    `/api/public/interview-booking?email=${encodeURIComponent(email)}`
  );
  return json.booking ?? null;
}

export async function httpConfirmBooking(input: ConfirmBookingInput): Promise<ConfirmBookingResult> {
  const res = await fetch('/api/public/interview-booking', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  // 200 -> { booking }; 409 -> { reason, existingBooking? }
  const json = (await res.json()) as {
    booking?: InterviewSlot;
    reason?: 'SLOT_NO_LONGER_AVAILABLE' | 'ALREADY_BOOKED' | 'SLOT_NOT_FOUND';
    existingBooking?: InterviewSlot;
  };
  if (res.ok && json.booking) return { ok: true, booking: json.booking, slots: [] };
  if (json.reason === 'ALREADY_BOOKED' && json.existingBooking) {
    return { ok: false, reason: 'ALREADY_BOOKED', existingBooking: json.existingBooking };
  }
  if (json.reason === 'SLOT_NOT_FOUND') return { ok: false, reason: 'SLOT_NOT_FOUND' };
  if (json.reason === 'SLOT_NO_LONGER_AVAILABLE') {
    return { ok: false, reason: 'SLOT_NO_LONGER_AVAILABLE' };
  }
  throw new Error(`Request failed (${res.status})`);
}

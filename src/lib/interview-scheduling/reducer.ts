import type {
  BookingCandidate,
  CellState,
  ConfirmBookingResult,
  InterviewDepartment,
  InterviewSlot,
  InterviewerAvailabilityRecord,
  InterviewerIdentity,
  NewInterviewSlot,
  SlotMutationResult,
} from '@/types/interviewScheduling';
import { seedAvailability, seedSlots } from '@/lib/interview-scheduling/seed';

export function createInitialSlots(): InterviewSlot[] {
  return seedSlots();
}

export function createInitialAvailability(): InterviewerAvailabilityRecord[] {
  return seedAvailability();
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function addSlots(
  slots: InterviewSlot[],
  newSlots: NewInterviewSlot[]
): InterviewSlot[] {
  const added: InterviewSlot[] = newSlots.map((s) => ({
    ...s,
    id: newId('slot'),
    status: 'AVAILABLE',
    bookedByCandidateId: null,
  }));
  return [...slots, ...added];
}

export function updateSlot(
  slots: InterviewSlot[],
  id: string,
  patch: Partial<Pick<InterviewSlot, 'date' | 'startTime' | 'endTime' | 'room'>>
): SlotMutationResult {
  const target = slots.find((s) => s.id === id);
  if (!target) return { ok: false, reason: 'SLOT_NOT_FOUND', message: 'Slot not found.' };
  if (target.status === 'BOOKED') {
    return { ok: false, reason: 'SLOT_BOOKED', message: 'This slot is already booked and cannot be edited.' };
  }
  return { ok: true, slots: slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}

export function removeSlot(slots: InterviewSlot[], id: string): SlotMutationResult {
  const target = slots.find((s) => s.id === id);
  if (!target) return { ok: false, reason: 'SLOT_NOT_FOUND', message: 'Slot not found.' };
  if (target.status === 'BOOKED') {
    return { ok: false, reason: 'SLOT_BOOKED', message: 'This slot is already booked and cannot be deleted.' };
  }
  return { ok: true, slots: slots.filter((s) => s.id !== id) };
}

/** Availability for a removed slot is meaningless; drop it. */
export function pruneAvailability(
  availability: InterviewerAvailabilityRecord[],
  slots: InterviewSlot[]
): InterviewerAvailabilityRecord[] {
  const ids = new Set(slots.map((s) => s.id));
  return availability.filter((r) => ids.has(r.slotId));
}

export function hasHeadAvailable(
  availability: InterviewerAvailabilityRecord[],
  slotId: string,
  department: InterviewDepartment
): boolean {
  return availability.some(
    (r) => r.slotId === slotId && r.department === department && r.isHead
  );
}

export function isBookable(
  slot: InterviewSlot,
  availability: InterviewerAvailabilityRecord[],
  department: InterviewDepartment
): boolean {
  return slot.status === 'AVAILABLE' && hasHeadAvailable(availability, slot.id, department);
}

export function cellState(
  slot: InterviewSlot,
  availability: InterviewerAvailabilityRecord[],
  department: InterviewDepartment
): CellState {
  if (slot.status === 'BOOKED') {
    return slot.bookedDepartment === department ? 'booked' : 'blocked';
  }
  return hasHeadAvailable(availability, slot.id, department) ? 'open' : 'blocked';
}

function identityKey(email: string | undefined, name: string): string {
  return (email?.trim() || name.trim()).toLowerCase();
}

/**
 * Full replace on resubmit: pull every record previously submitted by this
 * identity (same email, or same name when no email), then push fresh ones.
 */
export function replaceAvailability(
  availability: InterviewerAvailabilityRecord[],
  selections: Array<{ department: InterviewDepartment; slotIds: string[] }>,
  identity: InterviewerIdentity
): InterviewerAvailabilityRecord[] {
  const key = identityKey(identity.interviewerEmail, identity.interviewerName);
  const kept = availability.filter(
    (r) => identityKey(r.interviewerEmail, r.interviewerName) !== key
  );
  const pushed: InterviewerAvailabilityRecord[] = [];
  const seen = new Set<string>();
  for (const { department, slotIds } of selections) {
    for (const slotId of slotIds) {
      const dedupe = `${department}|${slotId}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      pushed.push({
        id: newId('avail'),
        slotId,
        department,
        interviewerName: identity.interviewerName.trim(),
        isHead: identity.isHead,
        interviewerEmail: identity.interviewerEmail?.trim(),
        interviewerRole: identity.interviewerRole,
      });
    }
  }
  return [...kept, ...pushed];
}

export function candidateIdFromEmail(email: string): string {
  return `cand-${email.trim().toLowerCase()}`;
}

export function confirmBooking(
  slots: InterviewSlot[],
  slotId: string,
  candidate: BookingCandidate
): ConfirmBookingResult {
  const existing = slots.find((s) => s.bookedByCandidateId === candidate.id);
  if (existing) return { ok: false, reason: 'ALREADY_BOOKED', existingBooking: existing };
  const target = slots.find((s) => s.id === slotId);
  if (!target) return { ok: false, reason: 'SLOT_NOT_FOUND' };
  if (target.status === 'BOOKED') return { ok: false, reason: 'SLOT_NO_LONGER_AVAILABLE' };
  const booking: InterviewSlot = {
    ...target,
    status: 'BOOKED',
    bookedByCandidateId: candidate.id,
    bookedCandidateName: candidate.name,
    bookedCandidateStudentId: candidate.studentId,
    bookedCandidateEmail: candidate.email,
    bookedDepartment: candidate.department,
  };
  return {
    ok: true,
    booking,
    slots: slots.map((s) => (s.id === slotId ? booking : s)),
  };
}

export function findBookingByEmail(
  slots: InterviewSlot[],
  email: string
): InterviewSlot | undefined {
  const id = candidateIdFromEmail(email);
  const lower = email.trim().toLowerCase();
  return slots.find(
    (s) =>
      s.bookedByCandidateId === id ||
      s.bookedCandidateEmail?.toLowerCase() === lower
  );
}

export function groupSlotsByDate(slots: InterviewSlot[]): Map<string, InterviewSlot[]> {
  const map = new Map<string, InterviewSlot[]>();
  const sorted = [...slots].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.room.localeCompare(b.room)
  );
  for (const s of sorted) {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  }
  return map;
}

export function groupSlotsByRoom<T extends { room: string }>(slots: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const s of slots) {
    const list = map.get(s.room);
    if (list) list.push(s);
    else map.set(s.room, [s]);
  }
  return map;
}

/** Availability records for one slot, split for the monitor table. */
export function availabilityForSlot(
  availability: InterviewerAvailabilityRecord[],
  slotId: string,
  department: InterviewDepartment
) {
  const rows = availability.filter((r) => r.slotId === slotId && r.department === department);
  return {
    executiveBoard: rows.filter((r) => r.interviewerRole === 'Executive Board'),
    heads: rows.filter((r) => r.isHead),
    interviewers: rows.filter((r) => r.interviewerRole === 'Member' || (!r.isHead && !r.interviewerRole)),
  };
}

export type MonitorRow =
  | { type: 'slot'; slot: InterviewSlot; session: number }
  | { type: 'lunch'; key: string };

const LUNCH_GAP_MINUTES = 30;

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Rows for one date (already time-sorted): "Session N" per distinct start time, LUNCH BREAK on a schedule gap. */
export function buildMonitorRows(daySlots: InterviewSlot[]): MonitorRow[] {
  const rows: MonitorRow[] = [];
  const sessionByStart = new Map<string, number>();
  let prevEnd: number | null = null;
  for (const slot of daySlots) {
    if (!sessionByStart.has(slot.startTime)) {
      if (prevEnd !== null && toMin(slot.startTime) - prevEnd >= LUNCH_GAP_MINUTES) {
        rows.push({ type: 'lunch', key: `lunch-${slot.id}` });
      }
      sessionByStart.set(slot.startTime, sessionByStart.size + 1);
    }
    rows.push({ type: 'slot', slot, session: sessionByStart.get(slot.startTime)! });
    const end = toMin(slot.endTime);
    if (prevEnd === null || end > prevEnd) prevEnd = end;
  }
  return rows;
}

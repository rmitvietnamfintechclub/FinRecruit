import type {
  CellState,
  InterviewDepartment,
  InterviewSlot,
  InterviewerAvailabilityRecord,
} from '@/types/interviewScheduling';

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
  // 1. Nếu ca này không cấp cho Dept này -> Chặn
  if (!slot.assignedDepartments?.includes(department)) return false;

  // 2. Nếu Dept này ĐÃ CÓ ứng viên book ở slot này -> Chặn
  const isDeptBooked = slot.bookings?.some((b) => b.department === department);
  if (isDeptBooked) return false;

  // 3. Nếu chưa ai book, kiểm tra xem Head có rảnh không
  return hasHeadAvailable(availability, slot.id, department);
}

export function cellState(
  slot: InterviewSlot,
  availability: InterviewerAvailabilityRecord[],
  department: InterviewDepartment
): CellState {
  if (!slot.assignedDepartments?.includes(department)) return 'blocked';

  // Check xem phòng ban này đã có ứng viên book chưa
  const deptBooking = slot.bookings?.find((b) => b.department === department);
  if (deptBooking) return 'booked';

  return hasHeadAvailable(availability, slot.id, department)
    ? 'open'
    : 'blocked';
}

export function candidateIdFromEmail(email: string): string {
  return `cand-${email.trim().toLowerCase()}`;
}

// ĐÃ CẬP NHẬT: Quét qua mảng bookings thay vì slot gốc
export function findBookingByEmail(
  slots: InterviewSlot[],
  email: string
): InterviewSlot | undefined {
  const lower = email.trim().toLowerCase();
  const legacyId = candidateIdFromEmail(lower);
  const studentId = lower.split('@')[0].toUpperCase();

  return slots.find((s) =>
    s.bookings?.some(
      (b) => b.candidateId === legacyId || b.candidateStudentId === studentId
    )
  );
}

export function groupSlotsByDate(
  slots: InterviewSlot[]
): Map<string, InterviewSlot[]> {
  const map = new Map<string, InterviewSlot[]>();
  const sorted = [...slots].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.room.localeCompare(b.room)
  );
  for (const s of sorted) {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  }
  return map;
}

export function groupSlotsByRoom<T extends { room: string }>(
  slots: T[]
): Map<string, T[]> {
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
  const rows = availability.filter(
    (r) => r.slotId === slotId && r.department === department
  );
  return {
    executiveBoard: rows.filter((r) => r.interviewerRole === 'Executive Board'),
    heads: rows.filter((r) => r.isHead),
    interviewers: rows.filter(
      (r) => r.interviewerRole === 'Member' || (!r.isHead && !r.interviewerRole)
    ),
  };
}

export type MonitorRow =
  | { type: 'slot'; slot: InterviewSlot; session: number }
  | { type: 'lunch'; key: string };

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function buildMonitorRows(daySlots: InterviewSlot[]): MonitorRow[] {
  const rows: MonitorRow[] = [];
  const sessionByStart = new Map<string, number>();

  let hasInsertedLunch = false;
  let hasSeenMorning = false;

  for (const slot of daySlots) {
    const slotMinutes = toMin(slot.startTime);
    const isAfternoon = slotMinutes >= 720; 

    if (!isAfternoon) {
      hasSeenMorning = true;
    }

    if (!sessionByStart.has(slot.startTime)) {
      if (hasSeenMorning && isAfternoon && !hasInsertedLunch) {
        rows.push({ type: 'lunch', key: `lunch-${slot.id}` });
        hasInsertedLunch = true;
      }

      sessionByStart.set(slot.startTime, sessionByStart.size + 1);
    }

    rows.push({
      type: 'slot',
      slot,
      session: sessionByStart.get(slot.startTime)!,
    });
  }
  return rows;
}

export function filterSlotsByAssignedDept(
  slots: InterviewSlot[],
  department: InterviewDepartment
): InterviewSlot[] {
  return slots.filter(
    (slot) =>
      slot.assignedDepartments && slot.assignedDepartments.includes(department)
  );
}

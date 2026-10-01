import type {
  InterviewSlot,
  InterviewerAvailabilityRecord,
} from '@/types/interviewScheduling';

export const SEED_GENERATION = 'Gen 7';
export const SEED_SEMESTER = '2026B';

/** Fixed test identity: already has a booking, reaches the "Already Booked" screen. */
export const SEED_BOOKED_CANDIDATE = {
  id: 'cand-s9999999@rmit.edu.vn', // must equal candidateIdFromEmail(email)
  name: 'Test Candidate',
  studentId: 'S9999999',
  email: 's9999999@rmit.edu.vn',
};

function slot(
  id: string,
  date: string,
  startTime: string,
  endTime: string,
  room: string
): InterviewSlot {
  return {
    id,
    generation: SEED_GENERATION,
    semester: SEED_SEMESTER,
    date,
    startTime,
    endTime,
    room,
    status: 'AVAILABLE',
    bookedByCandidateId: null,
  };
}

export function seedSlots(): InterviewSlot[] {
  const slots: InterviewSlot[] = [
    slot('slot-1', '2026-11-27', '08:00', '08:40', '1.2.036'),
    slot('slot-2', '2026-11-27', '08:40', '09:20', '1.2.036'),
    slot('slot-3', '2026-11-27', '09:20', '10:00', '1.2.036'),
    slot('slot-4', '2026-11-27', '13:00', '13:40', '1.2.037'),
    slot('slot-5', '2026-11-27', '13:40', '14:20', '1.2.037'),
    slot('slot-6', '2026-11-28', '08:00', '08:40', '1.2.036'),
    slot('slot-7', '2026-11-28', '08:40', '09:20', '1.2.036'),
    // No head availability for any department -> disabled chip on the public form
    slot('slot-8', '2026-11-28', '09:20', '10:00', '1.2.037'),
  ];
  const booked = slots.find((s) => s.id === 'slot-2')!;
  booked.status = 'BOOKED';
  booked.bookedByCandidateId = SEED_BOOKED_CANDIDATE.id;
  booked.bookedCandidateName = SEED_BOOKED_CANDIDATE.name;
  booked.bookedCandidateStudentId = SEED_BOOKED_CANDIDATE.studentId;
  booked.bookedCandidateEmail = SEED_BOOKED_CANDIDATE.email;
  booked.bookedDepartment = 'Technology Department';
  return slots;
}

let n = 0;
function rec(
  slotId: string,
  department: InterviewerAvailabilityRecord['department'],
  interviewerName: string,
  role: NonNullable<InterviewerAvailabilityRecord['interviewerRole']>,
  email: string
): InterviewerAvailabilityRecord {
  return {
    id: `avail-${++n}`,
    slotId,
    department,
    interviewerName,
    isHead: role === 'Department Head',
    interviewerEmail: email,
    interviewerRole: role,
  };
}

export function seedAvailability(): InterviewerAvailabilityRecord[] {
  n = 0;
  const T = 'Technology Department' as const;
  const B = 'Business Department' as const;
  const M = 'Marketing Department' as const;
  const H = 'HR Department' as const;
  const out: InterviewerAvailabilityRecord[] = [];
  for (const id of ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-6']) {
    out.push(rec(id, T, 'Head Tech', 'Department Head', 'headtech@rmit.edu.vn'));
  }
  for (const id of ['slot-1', 'slot-2']) {
    out.push(rec(id, T, 'Khoamini', 'Member', 'khoamini@rmit.edu.vn'));
  }
  out.push(rec('slot-3', T, 'Gia Phat', 'Member', 'giaphat@rmit.edu.vn'));
  for (const id of ['slot-1', 'slot-2', 'slot-5', 'slot-6']) {
    out.push(rec(id, B, 'Head Biz', 'Department Head', 'headbiz@rmit.edu.vn'));
  }
  for (const id of ['slot-3', 'slot-4', 'slot-7']) {
    out.push(rec(id, M, 'Head Mkt', 'Department Head', 'headmkt@rmit.edu.vn'));
  }
  for (const id of ['slot-1', 'slot-4', 'slot-5', 'slot-7']) {
    out.push(rec(id, H, 'Head HR', 'Department Head', 'headhr@rmit.edu.vn'));
  }
  for (const d of [T, B, M, H]) {
    out.push(rec('slot-1', d, 'Board Lead', 'Executive Board', 'board@rmit.edu.vn'));
  }
  return out;
}

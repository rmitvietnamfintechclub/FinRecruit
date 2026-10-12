import type { SlotStatusType } from '@/app/(backend)/types';
import type { HeadDepartment } from '@/app/(backend)/libs/departments';

export type SlotStatus = SlotStatusType;
export type InterviewDepartment = HeadDepartment;
export type InterviewerRole = 'Executive Board' | 'Department Head' | 'Member';

// Mirrors src/app/(backend)/models/MasterInterviewSlot.ts
export interface InterviewSlot {
  id: string;
  generation: string;
  semester: string;
  date: string; // 'YYYY-MM-DD' in the mock; real model stores a Date
  startTime: string; // 'HH:mm' 24h
  endTime: string;
  room: string;
  status: SlotStatus;
  bookedByCandidateId: string | null;
  // mock-only fields, not on the real model yet
  bookedCandidateName?: string;
  bookedCandidateStudentId?: string;
  bookedCandidateEmail?: string;
  bookedDepartment?: InterviewDepartment;
}

export type NewInterviewSlot = Pick<
  InterviewSlot,
  'generation' | 'semester' | 'date' | 'startTime' | 'endTime' | 'room'
>;

// Mirrors src/app/(backend)/models/InterviewerAvailability.ts
export interface InterviewerAvailabilityRecord {
  id: string;
  slotId: string;
  department: InterviewDepartment;
  interviewerName: string;
  isHead: boolean;
  // mock-only fields, not on the real model yet
  interviewerEmail?: string;
  interviewerRole?: InterviewerRole;
}

export type InterviewerIdentity = {
  interviewerName: string;
  interviewerEmail?: string;
  interviewerRole?: InterviewerRole;
  isHead: boolean;
};

export type CellState = 'booked' | 'blocked' | 'open';

export type BookingCandidate = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  department: InterviewDepartment;
};

export type ConfirmBookingResult =
  | { ok: true; slots: InterviewSlot[]; booking: InterviewSlot }
  | { ok: false; reason: 'SLOT_NO_LONGER_AVAILABLE' }
  | { ok: false; reason: 'SLOT_NOT_FOUND' }
  | { ok: false; reason: 'ALREADY_BOOKED'; existingBooking: InterviewSlot };

export type SlotMutationResult =
  | { ok: true; slots: InterviewSlot[] }
  | { ok: false; reason: 'SLOT_BOOKED' | 'SLOT_NOT_FOUND'; message: string };

export type InterviewLinks = { internalUrl: string; publicUrl: string };

export type BookableSlot = InterviewSlot & { bookable: boolean };

export type SubmitAvailabilityInput = {
  interviewerName: string;
  interviewerEmail: string;
  interviewerRole: InterviewerRole;
  /** Department Head / Member: exactly one. Executive Board: any subset of all four. */
  selections: Array<{ department: InterviewDepartment; slotIds: string[] }>;
};

export type ConfirmBookingInput = {
  name: string;
  email: string;
  studentId?: string;
  department: InterviewDepartment;
  slotId: string;
};

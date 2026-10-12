'use client';

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
import {
  addSlotsInStore,
  confirmBookingInStore,
  getAvailabilitySnapshot,
  getSlotsSnapshot,
  removeSlotInStore,
  replaceAvailabilityInStore,
  syncFromStorage,
  updateSlotInStore,
} from '@/lib/interview-scheduling/mock-store';
import {
  candidateIdFromEmail,
  findBookingByEmail,
  isBookable,
} from '@/lib/interview-scheduling/reducer';
import * as http from '@/lib/interview-scheduling/http-api';

export type InterviewMonitorData = {
  slots: InterviewSlot[];
  availability: InterviewerAvailabilityRecord[];
};

export type InterviewSchedulingApi = {
  listSlots(): Promise<InterviewSlot[]>;
  publishSlots(slots: NewInterviewSlot[]): Promise<InterviewSlot[]>;
  updateSlot(
    id: string,
    patch: Partial<
      Pick<InterviewSlot, 'date' | 'startTime' | 'endTime' | 'room'>
    >
  ): Promise<SlotMutationResult>;
  deleteSlot(id: string): Promise<SlotMutationResult>;
  getLinks(): Promise<InterviewLinks>;
  getAvailabilityMonitor(): Promise<InterviewMonitorData>;
  getBookingsMonitor(
    department: InterviewDepartment | 'all'
  ): Promise<InterviewMonitorData>;
  getPublicAvailability(): Promise<InterviewSlot[]>;
  submitAvailability(
    input: SubmitAvailabilityInput
  ): Promise<{ success: boolean; message?: string }>;
  getBookableSchedule(department: InterviewDepartment): Promise<BookableSlot[]>;
  findExistingBooking(email: string): Promise<InterviewSlot | null>;
  confirmBooking(input: ConfirmBookingInput): Promise<ConfirmBookingResult>;
};

/** 's1234567@rmit.edu.vn' -> 'S1234567' (mock only; the real backend resolves the Candidate). */
function studentIdFromEmail(email: string): string {
  return email.split('@')[0].toUpperCase();
}

const mockApi: InterviewSchedulingApi = {
  async listSlots() {
    syncFromStorage();
    return getSlotsSnapshot();
  },
  async publishSlots(slots) {
    return addSlotsInStore(slots);
  },
  async updateSlot(id, patch) {
    return updateSlotInStore(id, patch);
  },
  async deleteSlot(id) {
    return removeSlotInStore(id);
  },
  async getLinks() {
    const origin = window.location.origin;
    return {
      internalUrl: `${origin}/interview-availability`,
      publicUrl: `${origin}/interview-booking`,
    };
  },
  async getAvailabilityMonitor() {
    syncFromStorage();
    return {
      slots: getSlotsSnapshot(),
      availability: getAvailabilitySnapshot(),
    };
  },
  async getBookingsMonitor() {
    syncFromStorage();
    return {
      slots: getSlotsSnapshot(),
      availability: getAvailabilitySnapshot(),
    };
  },
  async getPublicAvailability() {
    syncFromStorage();
    return getSlotsSnapshot();
  },
  async submitAvailability(input) {
    const isHead = input.interviewerRole === 'Department Head';
    replaceAvailabilityInStore(input.selections, {
      interviewerName: input.interviewerName,
      interviewerEmail: input.interviewerEmail,
      interviewerRole: input.interviewerRole,
      isHead,
    });
    return { success: true };
  },
  async getBookableSchedule(department) {
    syncFromStorage();
    const availability = getAvailabilitySnapshot();
    return getSlotsSnapshot().map((slot) => ({
      ...slot,
      bookable: isBookable(slot, availability, department),
    }));
  },
  async findExistingBooking(email) {
    syncFromStorage();
    return findBookingByEmail(getSlotsSnapshot(), email) ?? null;
  },
  async confirmBooking(input) {
    return confirmBookingInStore(input.slotId, {
      id: candidateIdFromEmail(input.email),
      name: input.name.trim(),
      email: input.email.trim(),
      studentId: input.studentId ?? studentIdFromEmail(input.email),
      department: input.department,
    });
  },
};

const httpApi: InterviewSchedulingApi = {
  listSlots: http.httpListSlots,
  publishSlots: http.httpPublishSlots,
  updateSlot: http.httpUpdateSlot,
  deleteSlot: http.httpDeleteSlot,
  getLinks: http.httpGetLinks,
  getAvailabilityMonitor: http.httpGetAvailabilityMonitor,
  getBookingsMonitor: http.httpGetBookingsMonitor,
  getPublicAvailability: http.httpGetPublicAvailability,
  submitAvailability: http.httpSubmitAvailability,
  getBookableSchedule: http.httpGetBookableSchedule,
  findExistingBooking: http.httpFindExistingBooking,
  confirmBooking: http.httpConfirmBooking,
};

export function getInterviewSchedulingApi(): InterviewSchedulingApi {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false' ? httpApi : mockApi;
}

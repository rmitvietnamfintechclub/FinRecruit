import { Types } from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import MasterInterviewSlot from '@/app/(backend)/models/MasterInterviewSlot';
import InterviewerAvailability from '@/app/(backend)/models/InterviewerAvailability';
import Candidate from '@/app/(backend)/models/Candidate';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import type {
  DepartmentType,
  ICandidate,
  IInterviewerAvailability,
  IAuditLogActor,
  RoleType,
  ISlotBooking,
  SlotStatusType,
} from '@/app/(backend)/types';

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'COMPLETED' | 'NO_SHOW';

export type SerializedSlotBooking = {
  candidateId: string;
  candidateName: string;
  candidateStudentId: string;
  department: DepartmentType;
  status: SlotStatus;
};

export interface SerializedInterviewSlot {
  id: string;
  generation: string;
  semester: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  assignedDepartments: DepartmentType[];
  bookings: SerializedSlotBooking[];
}

export interface SerializedAvailabilityRecord {
  id: string;
  slotId: string;
  department: DepartmentType;
  interviewerName: string;
  interviewerEmail?: string;
  interviewerRole?: 'Executive Board' | 'Department Head' | 'Member';
  isHead: boolean;
}

export interface NewSlotInput {
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  assignedDepartments: DepartmentType[];
}

export interface SubmitAvailabilityInput {
  interviewerName: string;
  interviewerEmail: string;
  interviewerRole: 'Executive Board' | 'Department Head' | 'Member';
  selections: Array<{ department: DepartmentType; slotIds: string[] }>;
}

export interface ConfirmBookingInput {
  name: string;
  email: string;
  studentId?: string;
  department: DepartmentType;
  slotId: string;
}

export type ConfirmBookingResult =
  | { ok: true; booking: SerializedInterviewSlot }
  | { ok: false; reason: 'SLOT_NO_LONGER_AVAILABLE' }
  | { ok: false; reason: 'SLOT_NOT_FOUND' }
  | { ok: false; reason: 'ALREADY_BOOKED'; existingBooking: SerializedInterviewSlot }
  | { ok: false; reason: 'CANDIDATE_NOT_FOUND' }
  | { ok: false; reason: 'NOT_PASSED_ROUND_1' }
  | { ok: false; reason: 'DEPARTMENT_MISMATCH'; correctDepartment: DepartmentType };

export interface LeanMasterSlot {
  _id: Types.ObjectId;
  generation: string;
  semester: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  room: string;
  assignedDepartments: DepartmentType[];
  bookings: ISlotBooking[];
}

export interface LeanAvailability {
  _id: Types.ObjectId;
  slotId: Types.ObjectId;
  department: DepartmentType;
  interviewerName: string;
  interviewerEmail?: string;
  interviewerRole?: 'Executive Board' | 'Department Head' | 'Member';
  isHead: boolean;
}

export function formatDateToYYYYMMDD(date: Date | string): string {
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Date(date).toISOString().split('T')[0] ?? '';
  }
  return date.toISOString().split('T')[0] ?? '';
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateConsecutiveSlots(
  startTime: string,
  endTime: string,
  intervalMinutes = 40
): Array<{ startTime: string; endTime: string }> {
  const chunks: Array<{ startTime: string; endTime: string }> = [];
  if (!startTime || !endTime || intervalMinutes <= 0) return chunks;
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  for (let t = start; t + intervalMinutes <= end; t += intervalMinutes) {
    chunks.push({
      startTime: fromMinutes(t),
      endTime: fromMinutes(t + intervalMinutes),
    });
  }
  return chunks;
}

export function deriveStudentIdFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.toUpperCase();
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

type SlotForSerialization = {
  _id?: Types.ObjectId | string;
  generation: string;
  semester: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  room: string;
  assignedDepartments?: DepartmentType[];
  bookings?: Array<{
    candidateId:
      | Types.ObjectId
      | {
          fullName?: string;
          email?: string;
          _id?: Types.ObjectId | string;
        }
      | null;
    department: DepartmentType;
    status: SlotStatus;
  }>;
};

export function serializeSlot(slot: SlotForSerialization): SerializedInterviewSlot {
  const serializedBookings: SerializedSlotBooking[] = (slot.bookings || []).map(
    (b) => {
      let candName = 'Unknown';
      let candEmail = '';
      let candIdStr: string = ''; // Khởi tạo với chuỗi rỗng

      if (b.candidateId instanceof Types.ObjectId) {
        candIdStr = b.candidateId.toString();
      } else if (b.candidateId && typeof b.candidateId === 'object') {
        candName = b.candidateId.fullName ?? candName;
        candEmail = b.candidateId.email ?? '';
        candIdStr = b.candidateId._id ? b.candidateId._id.toString() : '';
      }

      return {
        candidateId: candIdStr,
        candidateName: candName,
        candidateStudentId: candEmail ? deriveStudentIdFromEmail(candEmail) : '',
        department: b.department,
        status: b.status,
      };
    }
  );

  return {
    id: slot._id ? slot._id.toString() : '',
    generation: slot.generation,
    semester: slot.semester,
    date: formatDateToYYYYMMDD(slot.date),
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room,
    assignedDepartments: slot.assignedDepartments ?? [],
    bookings: serializedBookings,
  };
}

export function serializeAvailability(
  record: LeanAvailability | IInterviewerAvailability
): SerializedAvailabilityRecord {
  return {
    id: record._id.toString(),
    slotId: record.slotId.toString(),
    department: record.department,
    interviewerName: record.interviewerName,
    interviewerEmail: record.interviewerEmail,
    interviewerRole: record.interviewerRole,
    isHead: Boolean(record.isHead),
  };
}

export async function getActiveCohortSlots(): Promise<SerializedInterviewSlot[]> {
  await dbConnect();
  const active = await getActiveConfig();

  const slots = await MasterInterviewSlot.find({
    generation: active.currentGeneration,
    semester: active.currentSemester,
  })
    .populate('bookings.candidateId', 'fullName email department')
    .sort({ date: 1, startTime: 1, room: 1 })
    .lean()
    .exec();

  return slots.map((s) => serializeSlot(s));
}

export async function publishMasterSlots(
  newSlots: NewSlotInput[],
  actor?: IAuditLogActor
): Promise<SerializedInterviewSlot[]> {
  await dbConnect();
  const active = await getActiveConfig();

  if (!Array.isArray(newSlots) || newSlots.length === 0) {
    throw new Error('At least one slot must be provided.');
  }

  const docsToCreate = newSlots.map((s) => ({
    generation: active.currentGeneration,
    semester: active.currentSemester,
    date: new Date(`${formatDateToYYYYMMDD(s.date)}T00:00:00.000Z`),
    startTime: s.startTime,
    endTime: s.endTime,
    room: s.room.trim(),
    assignedDepartments: s.assignedDepartments,
    bookings: [],
  }));

  await MasterInterviewSlot.insertMany(docsToCreate);

  void logSystemEvent({
    level: 'info',
    category: 'interview-scheduling',
    action: 'interview-scheduling.slots_published',
    message: `Published ${docsToCreate.length} interview slots for ${active.currentGeneration} / ${active.currentSemester}.`,
    performedBy: actor,
    metadata: {
      count: docsToCreate.length,
      generation: active.currentGeneration,
      semester: active.currentSemester,
    },
  });

  return getActiveCohortSlots();
}

export async function deleteMasterSlot(
  slotId: string,
  actor?: IAuditLogActor
): Promise<{ ok: boolean; message?: string; slots: SerializedInterviewSlot[] }> {
  await dbConnect();

  if (!Types.ObjectId.isValid(slotId)) {
    return { ok: false, message: 'Invalid slot ID.', slots: [] };
  }

  const slot = await MasterInterviewSlot.findById(slotId);
  if (!slot) {
    return { ok: false, message: 'Slot not found.', slots: [] };
  }

  if (slot.bookings && slot.bookings.length > 0) {
    return {
      ok: false,
      message: 'This slot already has candidates booked and cannot be deleted.',
      slots: [],
    };
  }

  await MasterInterviewSlot.deleteOne({ _id: slot._id });
  await InterviewerAvailability.deleteMany({ slotId: slot._id });

  void logSystemEvent({
    level: 'warning',
    category: 'interview-scheduling',
    action: 'interview-scheduling.slot_deleted',
    message: `Deleted interview slot ${slotId} and cleared its availability records.`,
    performedBy: actor,
    metadata: { slotId },
  });

  const slots = await getActiveCohortSlots();
  return { ok: true, slots };
}

export async function getAvailabilityMonitorData(
  departmentFilter?: DepartmentType | 'all'
) {
  await dbConnect();

  const slots = await getActiveCohortSlots();
  const slotObjectIds = slots.map((s) => new Types.ObjectId(s.id));

  const availabilityQuery: Record<string, unknown> = {
    slotId: { $in: slotObjectIds },
  };
  if (departmentFilter && departmentFilter !== 'all') {
    availabilityQuery.department = departmentFilter;
  }

  const availabilityDocs = await InterviewerAvailability.find(availabilityQuery)
    .sort({ interviewerName: 1 })
    .lean<LeanAvailability[]>()
    .exec();

  return {
    slots,
    availability: availabilityDocs.map((a) => serializeAvailability(a)),
  };
}

export async function submitInterviewerAvailability(
  input: SubmitAvailabilityInput,
  clientInfo?: { ip?: string; userAgent?: string }
) {
  await dbConnect();

  const email = input.interviewerEmail.trim().toLowerCase();
  const name = input.interviewerName.trim();
  if (!email || !name) {
    throw new Error('Interviewer name and student email are required.');
  }

  const isHead = input.interviewerRole === 'Department Head';
  const lockedSlotsByDept = new Map<string, Set<string>>();

  if (isHead) {
    const bookedSlots = await MasterInterviewSlot.find({
      bookings: { $elemMatch: { status: { $ne: 'AVAILABLE' } } },
    }).lean();

    bookedSlots.forEach((slot) => {
      slot.bookings.forEach((b: ISlotBooking) => {
        if (b.status !== 'AVAILABLE') {
          if (!lockedSlotsByDept.has(b.department)) {
            lockedSlotsByDept.set(b.department, new Set());
          }
          lockedSlotsByDept.get(b.department)!.add(slot._id.toString());
        }
      });
    });
  }

  const finalSelections = [...input.selections];

  if (isHead) {
    const oldHistory = await InterviewerAvailability.find({ interviewerEmail: email }).lean();

    finalSelections.forEach((sel) => {
      const lockedSlotIds = lockedSlotsByDept.get(sel.department);
      if (lockedSlotIds) {
        const currentSet = new Set(sel.slotIds);

        lockedSlotIds.forEach((lockedId) => {
          const didRegisterBefore = oldHistory.some(
            (h) =>
              h.slotId.toString() === lockedId && h.department === sel.department
          );

          if (didRegisterBefore) {
            currentSet.add(lockedId);
          }
        });
        sel.slotIds = Array.from(currentSet);
      }
    });
  }

  await InterviewerAvailability.deleteMany({
    $or: [
      { interviewerEmail: email },
      { interviewerName: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } },
    ],
  });

  const recordsToInsert: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const sel of finalSelections) {
    for (const sId of sel.slotIds) {
      if (!Types.ObjectId.isValid(sId)) continue;
      const dedupeKey = `${sel.department}|${sId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      recordsToInsert.push({
        slotId: new Types.ObjectId(sId),
        department: sel.department,
        interviewerName: name,
        interviewerEmail: email,
        interviewerRole: input.interviewerRole,
        isHead,
      });
    }
  }

  if (recordsToInsert.length > 0) {
    await InterviewerAvailability.insertMany(recordsToInsert, { ordered: false });
  }

  void logSystemEvent({
    level: 'info',
    category: 'interview-scheduling',
    action: 'interview-scheduling.availability_submitted',
    message: `${name} (${input.interviewerRole}) declared availability for ${recordsToInsert.length} shift(s).`,
    performedBy: { email, role: input.interviewerRole as RoleType },
    metadata: { shiftsCount: recordsToInsert.length, role: input.interviewerRole },
    ipAddress: clientInfo?.ip,
    userAgent: clientInfo?.userAgent,
  });

  return { success: true, count: recordsToInsert.length };
}

export async function getBookableSchedule(department: DepartmentType) {
  await dbConnect();
  const slots = await getActiveCohortSlots();
  const slotObjectIds = slots.map((s) => new Types.ObjectId(s.id));

  const headRecords = await InterviewerAvailability.find({
    slotId: { $in: slotObjectIds },
    department,
    isHead: true,
  })
    .select<{ slotId: Types.ObjectId }>('slotId')
    .lean<Array<{ slotId: Types.ObjectId }>>()
    .exec();

  const headAvailableSlotIds = new Set(
    headRecords.map((r) => r.slotId.toString())
  );

  return slots.map((s) => {
    const isDeptBooked = s.bookings?.some((b) => b.department === department);
    const isAssigned = s.assignedDepartments.includes(department);
    return {
      ...s,
      bookable: isAssigned && !isDeptBooked && headAvailableSlotIds.has(s.id),
    };
  });
}

export async function findExistingCandidateBooking(
  email: string
): Promise<SerializedInterviewSlot | null> {
  await dbConnect();
  const trimmed = email.trim().toLowerCase();

  const candidate = await Candidate.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
  })
    .lean<ICandidate | null>()
    .exec();

  if (!candidate || !candidate._id) return null;

  const slot = await MasterInterviewSlot.findOne({
    'bookings.candidateId': candidate._id,
  })
    .populate('bookings.candidateId', 'fullName email department')
    .lean()
    .exec();

  return slot ? serializeSlot(slot) : null;
}

export async function confirmCandidateBooking(
  input: ConfirmBookingInput,
  clientInfo?: { ip?: string; userAgent?: string }
): Promise<ConfirmBookingResult> {
  await dbConnect();

  if (!Types.ObjectId.isValid(input.slotId)) {
    return { ok: false, reason: 'SLOT_NOT_FOUND' };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const candidate = await Candidate.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') },
  }).exec();

  if (!candidate) {
    return { ok: false, reason: 'CANDIDATE_NOT_FOUND' };
  }

  if (candidate.status !== 'Pass') {
    return { ok: false, reason: 'NOT_PASSED_ROUND_1' };
  }

  if (candidate.department !== input.department) {
    return { ok: false, reason: 'DEPARTMENT_MISMATCH', correctDepartment: candidate.department };
  }

  const existingSlot = await MasterInterviewSlot.findOne({
    'bookings.candidateId': candidate._id,
  })
    .populate('bookings.candidateId', 'fullName email department')
    .lean()
    .exec();

  if (existingSlot) {
    return {
      ok: false,
      reason: 'ALREADY_BOOKED',
      existingBooking: serializeSlot(existingSlot),
    };
  }

  const headAvailable = await InterviewerAvailability.exists({
    slotId: new Types.ObjectId(input.slotId),
    department: input.department,
    isHead: true,
  });

  if (!headAvailable) {
    return { ok: false, reason: 'SLOT_NO_LONGER_AVAILABLE' };
  }

  const updatedSlot = await MasterInterviewSlot.findOneAndUpdate(
    {
      _id: new Types.ObjectId(input.slotId),
      assignedDepartments: input.department,
      'bookings.department': { $ne: input.department },
    },
    {
      $push: {
        bookings: {
          candidateId: candidate._id,
          department: input.department,
          status: 'BOOKED',
        },
      },
    },
    { new: true }
  )
    .populate('bookings.candidateId', 'fullName email department')
    .exec();

  if (!updatedSlot) {
    return { ok: false, reason: 'SLOT_NO_LONGER_AVAILABLE' };
  }

  candidate.interviewSlotId = updatedSlot._id;
  await candidate.save();

  const serializedBooking = serializeSlot(updatedSlot);

  void logSystemEvent({
    level: 'info',
    category: 'interview-scheduling',
    action: 'interview-scheduling.slot_booked',
    message: `${name} booked interview slot on ${serializedBooking.date} (${serializedBooking.startTime} - ${serializedBooking.endTime}) in room ${serializedBooking.room}.`,
    performedBy: { email, role: 'Guest' },
    target: { candidateId: candidate._id.toString(), email, label: name },
    metadata: { slotId: input.slotId, department: input.department },
    ipAddress: clientInfo?.ip,
    userAgent: clientInfo?.userAgent,
  });

  sendBookingConfirmationEmail(
    serializedBooking,
    name,
    email,
    input.department
  ).catch((err) => {
    console.error(
      '[service/confirmCandidateBooking] Calendar invite error:',
      err
    );
  });

  return { ok: true, booking: serializedBooking };
}

export function generateIcsCalendar(
  slot: SerializedInterviewSlot,
  candidateName: string,
  candidateEmail: string,
  department: DepartmentType
): string {
  const rawDate = slot.date.replace(/-/g, '');
  const rawStart = slot.startTime.replace(/:/g, '') + '00';
  const rawEnd = slot.endTime.replace(/:/g, '') + '00';
  const dtStamp =
    new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `finrecruit-${slot.id}-${Date.now()}@rmit.edu.vn`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RMIT Vietnam FinTech Club//Fin-Recruit//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Ho_Chi_Minh:${rawDate}T${rawStart}`,
    `DTEND;TZID=Asia/Ho_Chi_Minh:${rawDate}T${rawEnd}`,
    `SUMMARY:FinTech Club Round 2 Interview — ${department}`,
    `DESCRIPTION:Dear ${candidateName},\\n\\nYour Round 2 interview for the ${department} has been confirmed.\\n\\nDate: ${slot.date}\\nTime: ${slot.startTime} - ${slot.endTime}\\nRoom: ${slot.room}\\n\\nPlease arrive 5-10 minutes prior to your time slot.`,
    `LOCATION:RMIT Saigon South Campus - Room ${slot.room}`,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=RMIT FinTech Club:mailto:fintechclub@rmit.edu.vn',
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${candidateName}:mailto:${candidateEmail}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export async function sendBookingConfirmationEmail(
  slot: SerializedInterviewSlot,
  candidateName: string,
  candidateEmail: string,
  department: DepartmentType
): Promise<void> {
  const icsContent = generateIcsCalendar(
    slot,
    candidateName,
    candidateEmail,
    department
  );
  console.log(
    `[Email Dispatch] Generated .ics calendar invitation for ${candidateEmail}:`,
    {
      slotId: slot.id,
      summary: `FinTech Club Interview - ${department}`,
      icsLength: icsContent.length,
    }
  );
}

export async function updateSlotBookingStatus(
  slotId: string,
  department: DepartmentType,
  newStatus: SlotStatusType,
  actor?: IAuditLogActor
): Promise<{
  ok: boolean;
  message?: string;
  slots: SerializedInterviewSlot[];
}> {
  try {
    await dbConnect();

    if (!Types.ObjectId.isValid(slotId)) {
      return { ok: false, message: 'Invalid slot ID.', slots: [] };
    }

    const slot = await MasterInterviewSlot.findById(slotId);
    if (!slot) {
      return { ok: false, message: 'Slot not found.', slots: [] };
    }

    const targetBooking = slot.bookings.find(
      (b: ISlotBooking) => b.department === department
    );
    if (!targetBooking) {
      return {
        ok: false,
        message: 'No booking found for this department in this slot.',
        slots: [],
      };
    }

    const oldStatus = targetBooking.status;

    if (newStatus === 'AVAILABLE') {
      await Candidate.updateOne(
        { _id: targetBooking.candidateId },
        { $set: { interviewSlotId: null } }
      );

      await MasterInterviewSlot.updateOne(
        { _id: slot._id },
        { $pull: { bookings: { department: department } } }
      );
    } else {
      await MasterInterviewSlot.updateOne(
        { _id: slot._id, 'bookings.department': department },
        { $set: { 'bookings.$.status': newStatus } }
      );
    }

    void logSystemEvent({
      level: 'info',
      category: 'interview-scheduling',
      action: 'interview-scheduling.status_updated',
      message: `Updated slot ${slotId} status for ${department} from ${oldStatus} to ${newStatus}.`,
      performedBy: actor,
      metadata: { slotId, department, oldStatus, newStatus },
    });

    const slots = await getActiveCohortSlots();
    return { ok: true, slots };
  } catch (error) {
    console.error('[service/updateSlotBookingStatus] Failed:', error);
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : 'Database update failed',
      slots: [],
    };
  }
}
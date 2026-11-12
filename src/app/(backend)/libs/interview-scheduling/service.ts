import { Resend } from 'resend';
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
import {
  generateIcsCalendar,
  formatFriendlyDate,
} from '@/lib/interview-scheduling/ics';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  maxMembersPerDept: Record<DepartmentType, number>;
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
  | {
      ok: false;
      reason: 'ALREADY_BOOKED';
      existingBooking: SerializedInterviewSlot;
    }
  | { ok: false; reason: 'CANDIDATE_NOT_FOUND' }
  | { ok: false; reason: 'NOT_PASSED_ROUND_1' }
  | {
      ok: false;
      reason: 'DEPARTMENT_MISMATCH';
      correctDepartment: DepartmentType;
    };

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
  maxMembersPerDept: Record<DepartmentType, number>;
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

export function serializeSlot(
  slot: SlotForSerialization
): SerializedInterviewSlot {
  const serializedBookings: SerializedSlotBooking[] = (slot.bookings || []).map(
    (b) => {
      let candName = 'Unknown';
      let candEmail = '';
      let candIdStr: string = '';

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
        candidateStudentId: candEmail
          ? deriveStudentIdFromEmail(candEmail)
          : '',
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
    maxMembersPerDept: slot.maxMembersPerDept ?? {
      'Technology Department': 4,
      'Business Department': 4,
      'Marketing Department': 4,
      'HR Department': 4,
    },
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

export async function getActiveCohortSlots(): Promise<
  SerializedInterviewSlot[]
> {
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
): Promise<{
  ok: boolean;
  message?: string;
  slots: SerializedInterviewSlot[];
}> {
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
  const isMember = input.interviewerRole === 'Member';

  // 1. KIỂM TRA SỨC CHỨA (CAPACITY CHECK) CHO MEMBER THEO TỪNG PHÒNG BAN
  if (isMember) {
    for (const sel of input.selections) {
      for (const sId of sel.slotIds) {
        if (!Types.ObjectId.isValid(sId)) continue;

        const slotDoc = await MasterInterviewSlot.findById(sId).lean();
        if (!slotDoc) continue;

        const maxLimit =
          (slotDoc.maxMembersPerDept as Record<string, number>)?.[
            sel.department
          ] ?? 4;

        // Đếm số lượng member khác (ngoại trừ chính email này) đã đăng ký
        const existingMembersCount =
          await InterviewerAvailability.countDocuments({
            slotId: slotDoc._id,
            department: sel.department,
            interviewerRole: 'Member',
            interviewerEmail: { $ne: email },
          });

        if (existingMembersCount >= maxLimit) {
          throw new Error(
            `${sel.department} has reached its maximum capacity of ${maxLimit} members for the slot on ${formatDateToYYYYMMDD(slotDoc.date)} at ${slotDoc.startTime}.`
          );
        }
      }
    }
  }

  // 2. TẬP HỢP CÁC SLOT ĐÃ CÓ ỨNG VIÊN ĐẶT LỊCH (CHỈ DÀNH CHO HEAD)
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

  // 3. ĐẢM BẢO HEAD KHÔNG THỂ BỎ CHỌN NHỮNG CA ĐÃ CÓ ỨNG VIÊN MÀ HEAD ĐÓ ĐÃ TỪNG NHẬN
  if (isHead) {
    const oldHistory = await InterviewerAvailability.find({
      interviewerEmail: email,
    }).lean();

    finalSelections.forEach((sel) => {
      const lockedSlotIds = lockedSlotsByDept.get(sel.department);
      if (lockedSlotIds) {
        const currentSet = new Set(sel.slotIds);

        lockedSlotIds.forEach((lockedId) => {
          const didRegisterBefore = oldHistory.some(
            (h) =>
              h.slotId.toString() === lockedId &&
              h.department === sel.department
          );

          if (didRegisterBefore) {
            currentSet.add(lockedId);
          }
        });
        sel.slotIds = Array.from(currentSet);
      }
    });
  }

  // 4. CHỈ XÓA DỮ LIỆU CŨ CỦA ĐÚNG EMAIL NÀY (TUYỆT ĐỐI KHÔNG XÓA THEO NAME)
  await InterviewerAvailability.deleteMany({
    interviewerEmail: email,
  });

  // 5. CHÈN BẢN GHI MỚI
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
    await InterviewerAvailability.insertMany(recordsToInsert, {
      ordered: false,
    });
  }

  void logSystemEvent({
    level: 'info',
    category: 'interview-scheduling',
    action: 'interview-scheduling.availability_submitted',
    message: `${name} (${input.interviewerRole}) declared availability for ${recordsToInsert.length} shift(s).`,
    performedBy: { email, role: input.interviewerRole as RoleType },
    metadata: {
      shiftsCount: recordsToInsert.length,
      role: input.interviewerRole,
    },
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
  const active = await getActiveConfig();
  const trimmed = email.trim().toLowerCase();

  const candidate = await Candidate.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
    generation: active.currentGeneration,
    semester: active.currentSemester,
  })
    .sort({ appliedAt: -1 })
    .lean<ICandidate | null>()
    .exec();

  if (!candidate || !candidate._id) return null;

  const slot = await MasterInterviewSlot.findOne({
    generation: active.currentGeneration,
    semester: active.currentSemester,
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

  const active = await getActiveConfig();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  // 1. Tìm đúng hồ sơ ứng viên trong Gen & Sem đang active
  const candidate = await Candidate.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') },
    generation: active.currentGeneration,
    semester: active.currentSemester,
  })
    .sort({ appliedAt: -1 })
    .exec();

  if (!candidate) {
    return { ok: false, reason: 'CANDIDATE_NOT_FOUND' };
  }

  if (candidate.status !== 'Pass') {
    return { ok: false, reason: 'NOT_PASSED_ROUND_1' };
  }

  if (candidate.department !== input.department) {
    return {
      ok: false,
      reason: 'DEPARTMENT_MISMATCH',
      correctDepartment: candidate.department,
    };
  }

  // 2. Chỉ kiểm tra trùng lịch trong Gen & Sem hiện tại
  const existingSlot = await MasterInterviewSlot.findOne({
    generation: active.currentGeneration,
    semester: active.currentSemester,
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

  // 3. Khóa đúng slot thuộc Gen & Sem hiện tại
  const updatedSlot = await MasterInterviewSlot.findOneAndUpdate(
    {
      _id: new Types.ObjectId(input.slotId),
      generation: active.currentGeneration,
      semester: active.currentSemester,
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
    { returnDocument: 'after' }
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

export async function sendBookingConfirmationEmail(
  slot: SerializedInterviewSlot,
  candidateName: string,
  candidateEmail: string,
  department: DepartmentType
): Promise<void> {
  try {
    const icsContent = generateIcsCalendar(
      slot,
      candidateName,
      candidateEmail,
      department
    );

    const friendlyDate = formatFriendlyDate(slot.date);
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://finrecruit.rmitvietnamfintechclub.com';
    const lookupUrl = `${appBaseUrl}/interview-lookup`;

    await resend.emails.send({
      from: 'RUVN Financial Technology Club SGS <finrecruit@rmitvietnamfintechclub.com>',
      to: candidateEmail,
      subject: `[Confirmed] Round 2 Interview Schedule — ${department} (RMIT FinTech Club)`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0D1742; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px;">Dear <strong>${candidateName}</strong>,</p>
          
          <p style="margin-bottom: 20px; font-size: 14px; color: #334155;">
            You are invited to attend your interview for <strong>RMIT Vietnam FinTech Club Membership Recruitment ${slot.semester}</strong> (${department}).
          </p>
          
          <!-- Key Details Card -->
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #DCB968; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
            <p style="margin: 6px 0; font-size: 14px;"><strong>Date:</strong> ${friendlyDate}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Time:</strong> <span style="font-weight: 700; color: #0D1742;">${slot.startTime} - ${slot.endTime}</span></p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Room:</strong> <span style="font-weight: 700; color: #0D1742;">${slot.room}</span></p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Location:</strong> RMIT Saigon South Campus</p>
          </div>

          <!-- Schedule Lookup CTA Box -->
          <div style="background-color: #fcfbf7; border: 1px dashed #dcb968; border-radius: 12px; padding: 20px; text-align: center; margin: 26px 0;">
            <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #5E5E92;">
              Need to check your interview schedule later?
            </p>
            <div>
              <a href="${lookupUrl}" 
                 target="_blank"
                 rel="noopener noreferrer"
                 style="background-color: #0D1742; color: #DCB968; padding: 12px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px; letter-spacing: 0.3px; box-shadow: 0 2px 4px rgba(13,23,66,0.15);">
                Interview Lookup Portal &rarr;
              </a>
            </div>
            <p style="font-size: 11px; color: #64748b; margin: 10px 0 0 0;">
              You can verify your interview details anytime using your RMIT student email.
            </p>
          </div>

          <p style="margin-bottom: 24px; font-size: 14px; color: #334155;">
            Please arrive on time and be well-prepared for the interview. We have also attached a calendar invitation (<code style="background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 12px;">.ics</code>) to this email. Please <strong>accept</strong> it to synchronize the interview with your calendar.
          </p>
          
          <p style="margin-bottom: 24px; font-size: 14px;">Best regards,</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <!-- Email Signature -->
          <div style="font-size: 13px; line-height: 1.5; color: #0D1742;">
            <div style="font-weight: 800; color: #DCB968; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
              RMIT Vietnam FinTech Club (SGS Campus)
            </div>
            <div style="font-weight: 700; color: #0D1742; margin-bottom: 12px; font-size: 13px;">
              RMIT University Vietnam
            </div>

            <div style="font-style: italic; color: #1e3a8a; font-size: 11.5px; line-height: 1.6;">
              President - Mr. Nguyen Truong Giang - <a href="mailto:s4118021@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4118021@rmit.edu.vn</a><br/>
              External Vice President - Mr. Ho Nguyen Minh Nhat - <a href="mailto:s4123860@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4123860@rmit.edu.vn</a><br/>
              Internal Vice President - Ms. Pham Thi Khanh Hoa - <a href="mailto:s4127901@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4127901@rmit.edu.vn</a><br/>
              Chief of Finance - Ms. Dang Vo Bao Tran - <a href="mailto:s4016190@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4016190@rmit.edu.vn</a><br/>
              Head of Business Department - Ms. Vu Ha Anh - <a href="mailto:s4147050@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4147050@rmit.edu.vn</a><br/>
              Head of Marketing Department - Mr. Hoang Vu Nhat Thong - <a href="mailto:s4147002@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4147002@rmit.edu.vn</a><br/>
              Head of Human Resources Department - Ms. Tran Khanh Linh - <a href="mailto:s4067294@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4067294@rmit.edu.vn</a><br/>
              Head of Technology Department - Mr. Do Anh Khoa - <a href="mailto:s4132831@rmit.edu.vn" style="color: #2563eb; text-decoration: underline;">s4132831@rmit.edu.vn</a>
            </div>

            <div style="margin-top: 14px;">
              <img src="${appBaseUrl}/images/fintech-logo.png" alt="RMIT FinTech Club Logo" style="height: 90px; width: auto; display: block;" />
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'interview-invite.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
    });

    console.log(
      `[Email Dispatch] Successfully sent calendar invite via Resend to ${candidateEmail}`
    );
  } catch (error) {
    console.error(
      '[Email Dispatch] Failed to send calendar invite via Resend:',
      error
    );
  }
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

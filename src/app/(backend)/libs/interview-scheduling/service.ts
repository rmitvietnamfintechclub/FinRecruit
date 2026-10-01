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
    IMasterInterviewSlot,
    IInterviewerAvailability,
    IAuditLogActor,
    RoleType,
} from '@/app/(backend)/types';

export interface SerializedInterviewSlot {
    id: string;
    generation: string;
    semester: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string;
    room: string;
    status: 'AVAILABLE' | 'BOOKED';
    bookedByCandidateId: string | null;
    bookedCandidateName?: string;
    bookedCandidateStudentId?: string;
    bookedCandidateEmail?: string;
    bookedDepartment?: DepartmentType;
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
    | { ok: false; reason: 'ALREADY_BOOKED'; existingBooking: SerializedInterviewSlot };

// Mongoose Lean Shape Interfaces
export interface LeanMasterSlot {
    _id: Types.ObjectId;
    generation: string;
    semester: string;
    date: Date | string;
    startTime: string;
    endTime: string;
    room: string;
    status: 'AVAILABLE' | 'BOOKED';
    bookedByCandidateId?: ICandidate | Types.ObjectId | string | null;
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

// Date & Time Helpers
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
        chunks.push({ startTime: fromMinutes(t), endTime: fromMinutes(t + intervalMinutes) });
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

export function serializeSlot(
    slot: LeanMasterSlot | IMasterInterviewSlot,
    candidate?: ICandidate | null
): SerializedInterviewSlot {
    let cand: ICandidate | null = candidate ?? null;
    if (!cand && slot.bookedByCandidateId && typeof slot.bookedByCandidateId === 'object' && 'fullName' in slot.bookedByCandidateId) {
        cand = slot.bookedByCandidateId as ICandidate;
    }

    let bookedByCandidateId: string | null = null;
    if (slot.bookedByCandidateId) {
        if (typeof slot.bookedByCandidateId === 'object' && '_id' in slot.bookedByCandidateId && slot.bookedByCandidateId._id) {
            bookedByCandidateId = slot.bookedByCandidateId._id.toString();
        } else {
            bookedByCandidateId = slot.bookedByCandidateId.toString();
        }
    }

    return {
        id: slot._id.toString(),
        generation: slot.generation,
        semester: slot.semester,
        date: formatDateToYYYYMMDD(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        status: slot.status,
        bookedByCandidateId,
        bookedCandidateName: cand?.fullName,
        bookedCandidateStudentId: cand?.email ? deriveStudentIdFromEmail(cand.email) : undefined,
        bookedCandidateEmail: cand?.email,
        bookedDepartment: cand?.department,
    };
}

export function serializeAvailability(record: LeanAvailability | IInterviewerAvailability): SerializedAvailabilityRecord {
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

// Slot Management Operations
export async function getActiveCohortSlots(): Promise<SerializedInterviewSlot[]> {
    await dbConnect();
    const active = await getActiveConfig();

    const slots = await MasterInterviewSlot.find({
        generation: active.currentGeneration,
        semester: active.currentSemester,
    })
        .populate<{ bookedByCandidateId: ICandidate }>('bookedByCandidateId', 'fullName email department')
        .sort({ date: 1, startTime: 1, room: 1 })
        .lean<LeanMasterSlot[]>()
        .exec();

    return slots.map((s) => serializeSlot(s, s.bookedByCandidateId as ICandidate | null));
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
        status: 'AVAILABLE',
        bookedByCandidateId: null,
    }));

    await MasterInterviewSlot.insertMany(docsToCreate);

    void logSystemEvent({
        level: 'info',
        category: 'interview-scheduling',
        action: 'interview-scheduling.slots_published',
        message: `Published ${docsToCreate.length} interview slots for ${active.currentGeneration} / ${active.currentSemester}.`,
        performedBy: actor,
        metadata: { count: docsToCreate.length, generation: active.currentGeneration, semester: active.currentSemester },
    });

    return getActiveCohortSlots();
}

export async function updateMasterSlot(
    slotId: string,
    patch: Partial<NewSlotInput>,
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

    if (slot.status === 'BOOKED') {
        return { ok: false, message: 'This slot is already booked and cannot be edited.', slots: [] };
    }

    if (patch.date) slot.date = new Date(`${formatDateToYYYYMMDD(patch.date)}T00:00:00.000Z`);
    if (patch.startTime) slot.startTime = patch.startTime;
    if (patch.endTime) slot.endTime = patch.endTime;
    if (patch.room) slot.room = patch.room.trim();

    await slot.save();

    void logSystemEvent({
        level: 'info',
        category: 'interview-scheduling',
        action: 'interview-scheduling.slot_updated',
        message: `Updated slot ${slotId} (${slot.startTime} - ${slot.endTime}, room ${slot.room}).`,
        performedBy: actor,
        metadata: { slotId, patch },
    });

    const slots = await getActiveCohortSlots();
    return { ok: true, slots };
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

    if (slot.status === 'BOOKED') {
        return { ok: false, message: 'This slot is already booked and cannot be deleted.', slots: [] };
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

// Availability Operations
export async function getAvailabilityMonitorData(departmentFilter?: DepartmentType | 'all') {
    await dbConnect();

    const slots = await getActiveCohortSlots();
    const slotObjectIds = slots.map((s) => new Types.ObjectId(s.id));

    const availabilityQuery: Record<string, unknown> = { slotId: { $in: slotObjectIds } };
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

    // Atomic replace on resubmit: remove previous shifts by email or name
    await InterviewerAvailability.deleteMany({
        $or: [
            { interviewerEmail: email },
            { interviewerName: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } },
        ],
    });

    const isHead = input.interviewerRole === 'Department Head';
    const recordsToInsert: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    for (const sel of input.selections) {
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

// Booking Operations (Head-dependent & Atomic)
export async function getBookableSchedule(department: DepartmentType) {
    await dbConnect();
    const slots = await getActiveCohortSlots();
    const slotObjectIds = slots.map((s) => new Types.ObjectId(s.id));

    // Slots are bookable iff status is AVAILABLE and at least 1 Department Head has registered availability
    const headRecords = await InterviewerAvailability.find({
        slotId: { $in: slotObjectIds },
        department,
        isHead: true,
    })
        .select<{ slotId: Types.ObjectId }>('slotId')
        .lean<Array<{ slotId: Types.ObjectId }>>()
        .exec();

    const bookableSlotIds = new Set(headRecords.map((r) => r.slotId.toString()));

    return slots.map((s) => ({
        ...s,
        bookable: s.status === 'AVAILABLE' && bookableSlotIds.has(s.id),
    }));
}

export async function findExistingCandidateBooking(email: string): Promise<SerializedInterviewSlot | null> {
    await dbConnect();
    const trimmed = email.trim().toLowerCase();

    const candidate = await Candidate.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
    })
        .lean<ICandidate | null>()
        .exec();

    if (!candidate || !candidate._id) return null;

    const slot = await MasterInterviewSlot.findOne({
        bookedByCandidateId: candidate._id,
        status: 'BOOKED',
    })
        .populate<{ bookedByCandidateId: ICandidate }>('bookedByCandidateId', 'fullName email department')
        .lean<LeanMasterSlot | null>()
        .exec();

    return slot ? serializeSlot(slot, slot.bookedByCandidateId as ICandidate | null) : null;
}

export async function confirmCandidateBooking(
    input: ConfirmBookingInput,
    clientInfo?: { ip?: string; userAgent?: string }
): Promise<ConfirmBookingResult> {
    await dbConnect();
    const active = await getActiveConfig();

    if (!Types.ObjectId.isValid(input.slotId)) {
        return { ok: false, reason: 'SLOT_NOT_FOUND' };
    }

    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    // 1. Resolve or upsert Candidate
    let candidate = await Candidate.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') },
    }).exec();

    // Prevent double booking
    if (candidate) {
        const existingSlot = await MasterInterviewSlot.findOne({
            bookedByCandidateId: candidate._id,
            status: 'BOOKED',
        })
            .populate<{ bookedByCandidateId: ICandidate }>('bookedByCandidateId', 'fullName email department')
            .lean<LeanMasterSlot | null>()
            .exec();

        if (existingSlot) {
            return {
                ok: false,
                reason: 'ALREADY_BOOKED',
                existingBooking: serializeSlot(existingSlot, existingSlot.bookedByCandidateId as ICandidate | null),
            };
        }
    } else {
        candidate = await Candidate.create({
            msFormResponseId: `booking-${Date.now()}`,
            fullName: name,
            email,
            dob: 'N/A',
            phone: 'N/A',
            majorAndYear: 'N/A',
            facebookLink: 'N/A',
            cvLink: 'N/A',
            choice1: input.department,
            department: input.department,
            status: 'Pass',
            round2Status: 'Pending',
            generation: active.currentGeneration,
            semester: active.currentSemester,
            appliedAt: new Date(),
        });
    }

    // 2. Validate Head availability on slot
    const headAvailable = await InterviewerAvailability.exists({
        slotId: new Types.ObjectId(input.slotId),
        department: input.department,
        isHead: true,
    });

    if (!headAvailable) {
        return { ok: false, reason: 'SLOT_NO_LONGER_AVAILABLE' };
    }

    // 3. Atomic reservation: findOneAndUpdate guarantees zero double-booking race condition
    const updatedSlot = await MasterInterviewSlot.findOneAndUpdate(
        { _id: new Types.ObjectId(input.slotId), status: 'AVAILABLE' },
        {
            $set: {
                status: 'BOOKED',
                bookedByCandidateId: candidate._id,
            },
        },
        { new: true }
    )
        .populate<{ bookedByCandidateId: ICandidate }>('bookedByCandidateId', 'fullName email department')
        .exec();

    if (!updatedSlot) {
        return { ok: false, reason: 'SLOT_NO_LONGER_AVAILABLE' };
    }

    candidate.interviewSlotId = updatedSlot._id;
    await candidate.save();

    const serializedBooking = serializeSlot(updatedSlot, candidate);

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

    sendBookingConfirmationEmail(serializedBooking, name, email, input.department).catch((err) => {
        console.error('[service/confirmCandidateBooking] Calendar invite error:', err);
    });

    return { ok: true, booking: serializedBooking };
}

// iCalendar (.ics) RFC 5545 Generator
export function generateIcsCalendar(
    slot: SerializedInterviewSlot,
    candidateName: string,
    candidateEmail: string,
    department: DepartmentType
): string {
    const rawDate = slot.date.replace(/-/g, '');
    const rawStart = slot.startTime.replace(/:/g, '') + '00';
    const rawEnd = slot.endTime.replace(/:/g, '') + '00';
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
    const icsContent = generateIcsCalendar(slot, candidateName, candidateEmail, department);
    console.log(`[Email Dispatch] Generated .ics calendar invitation for ${candidateEmail}:`, {
        slotId: slot.id,
        summary: `FinTech Club Interview - ${department}`,
        icsLength: icsContent.length,
    });
}
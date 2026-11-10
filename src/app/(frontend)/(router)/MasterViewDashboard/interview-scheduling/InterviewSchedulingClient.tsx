'use client';

import {
  Sparkles,
  Rocket,
  Trash2,
  AlertCircle,
  X,
  TriangleAlert,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ShareLinkModal } from './ShareLinkModal';
import {
  useDeleteSlot,
  useInterviewLinks,
  useInterviewSlots,
  usePublishSlots,
} from '@/hooks/use-interview-scheduling';
import {
  formatDateBand,
  generateTimeSlots,
  slotRangeLabel,
} from '@/lib/interview-scheduling/format';
import {
  groupSlotsByDate,
  groupSlotsByRoom,
} from '@/lib/interview-scheduling/reducer';
import type {
  InterviewDepartment,
  NewInterviewSlot,
} from '@/types/interviewScheduling';
import {
  DEPARTMENT_META,
  DEPARTMENT_ORDER,
} from '@/lib/interview-scheduling/departments';
import { cn } from '@/lib/utils';

type DraftSlot = NewInterviewSlot & { key: string };

const inputClass =
  'w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/50 focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] focus:outline-none placeholder:text-gray-400';
const labelClass =
  'mb-1.5 block text-[10px] font-bold tracking-widest uppercase text-[#5E5E92]';

function draftKey(s: NewInterviewSlot) {
  return `${s.date}|${s.room}|${s.startTime}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function hasTimeConflict(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
): boolean {
  const nS = toMinutes(newStart);
  const nE = toMinutes(newEnd);
  const eS = toMinutes(existingStart);
  const eE = toMinutes(existingEnd);
  return nS < eE && nE > eS;
}

function getAmPmSession(startTime: string): 'Morning' | 'Afternoon' {
  return toMinutes(startTime) < 720 ? 'Morning' : 'Afternoon';
}

const ROOM_REGEX = /^\d+\.\d+\.\d{3}$/;

// Hàm hỗ trợ render danh sách Department cho UI/UX mượt hơn
function renderAssignedDeptsLabel(depts: InterviewDepartment[]) {
  if (!depts || depts.length === 0) return 'No Departments Assigned';
  if (depts.length === 4) return 'Open to All Departments';
  return depts
    .map((d) => DEPARTMENT_META[d].abbr || DEPARTMENT_META[d].short)
    .join(' • ');
}

export function InterviewSchedulingClient() {
  const publishedSlots = useInterviewSlots();
  const links = useInterviewLinks();
  const { publish, pending: publishing } = usePublishSlots();
  const { remove, pending: deleting } = useDeleteSlot();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:40');
  const [room, setRoom] = useState('');
  const [duration, setDuration] = useState('40');

  // State quản lý phòng ban được gán cho ca phỏng vấn (Mặc định chọn tất cả)
  const [selectedDepts, setSelectedDepts] = useState<Set<InterviewDepartment>>(
    new Set(DEPARTMENT_ORDER)
  );

  const [draft, setDraft] = useState<DraftSlot[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    variant: 'error' | 'success';
    text: string;
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  function toggleDept(dept: InterviewDepartment) {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  }

  function addToDraft() {
    setFormError(null);
    const mins = Number(duration);
    const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
    const cleanRoom = room.replace(/\s+/g, '').trim();

    if (!dateStr || !room.trim() || !startTime || !endTime) {
      setFormError('Please specify the date, time range, and room.');
      return;
    }

    if (!ROOM_REGEX.test(cleanRoom)) {
      setFormError('Room must follow the format x.x.xxx (e.g., 1.2.036).');
      return;
    }

    if (!Number.isInteger(mins) || mins <= 0) {
      setFormError('Slot duration must be a valid positive number.');
      return;
    }

    if (toMinutes(startTime) >= toMinutes(endTime)) {
      setFormError('Start time must be strictly before end time.');
      return;
    }

    if (selectedDepts.size === 0) {
      setFormError('Please select at least one department for these slots.');
      return;
    }

    const chunks = generateTimeSlots(startTime, endTime, mins);
    if (chunks.length === 0) {
      setFormError('The specified time range is too short for a single slot.');
      return;
    }

    const roomName = cleanRoom;
    const normalizeRoom = (r: string) => r.trim().toLowerCase();

    // Lấy TẤT CẢ các slot đã tồn tại (cả draft và published) trong ngày đang chọn
    const allSlotsOnDate = [
      ...draft.filter((s) => s.date === dateStr),
      ...publishedSlots.filter((s) => s.date === dateStr),
    ];

    const validChunks: typeof chunks = [];
    const conflictedChunks: typeof chunks = [];
    const deptOverlapErrors: string[] = [];

    for (const chunk of chunks) {
      // 1. KIỂM TRA TRÙNG PHÒNG (Room Conflict Check)
      // Tìm xem CÙNG PHÒNG NÀY có ai xài trong giờ này chưa
      const existingRoomSlots = allSlotsOnDate.filter(
        (s) => normalizeRoom(s.room) === normalizeRoom(roomName)
      );

      const isRoomConflicted = existingRoomSlots.some((existingSlot) =>
        hasTimeConflict(
          chunk.startTime,
          chunk.endTime,
          existingSlot.startTime,
          existingSlot.endTime
        )
      );

      if (isRoomConflicted) {
        conflictedChunks.push(chunk);
        continue; // Bỏ qua chunk này, không check tiếp
      }

      // 2. KIỂM TRA TRÙNG DEPARTMENT (Department Overlap Check)
      // Tìm TẤT CẢ CÁC PHÒNG KHÁC đang diễn ra trong CÙNG KHUNG GIỜ NÀY
      const concurrentSlots = allSlotsOnDate.filter((s) =>
        hasTimeConflict(chunk.startTime, chunk.endTime, s.startTime, s.endTime)
      );

      let deptConflictFound = false;

      for (const dept of selectedDepts) {
        // Xem thử department này có đang bị "dí" đi phỏng vấn ở một slot song song nào không
        const isDeptBusy = concurrentSlots.some((s) =>
          s.assignedDepartments?.includes(dept)
        );

        if (isDeptBusy) {
          deptConflictFound = true;
          const deptName =
            DEPARTMENT_META[dept].abbr || DEPARTMENT_META[dept].short;
          deptOverlapErrors.push(
            `The ${deptName} Department is already assigned to a concurrent session from ${chunk.startTime} - ${chunk.endTime}.`
          );
          break; // Tìm thấy 1 ban bị trùng là dẹp luôn chunk này
        }
      }

      if (deptConflictFound) {
        conflictedChunks.push(chunk);
      } else {
        validChunks.push(chunk);
      }
    }

    if (validChunks.length === 0) {
      // Nếu lỗi do Department Overlap thì ưu tiên hiện lỗi đó
      if (deptOverlapErrors.length > 0) {
        setFormError(deptOverlapErrors[0]); // Hiện cái đầu tiên cho gọn
      } else {
        setFormError(
          'All generated slots conflict with existing schedules in this room.'
        );
      }
      return;
    }

    if (conflictedChunks.length > 0) {
      let warningMsg = `Partially generated. ${conflictedChunks.length} slot(s) were ignored.`;
      if (deptOverlapErrors.length > 0) {
        warningMsg = `Partially generated. Some slots were ignored because a selected department is already assigned to a concurrent session.`;
      }
      setNotice({
        variant: 'error',
        text: warningMsg,
      });
    } else {
      setNotice(null);
    }

    setDraft((prev) => {
      const added = validChunks
        .map((c) => ({
          date: dateStr,
          room: roomName,
          assignedDepartments: Array.from(selectedDepts),
          maxMembersPerDept: {
            'Technology Department': 4,
            'Business Department': 4,
            'Marketing Department': 4,
            'HR Department': 4,
          },
          ...c,
        }))
        .map((s) => ({ ...s, key: draftKey(s) }));
      return [...prev, ...added];
    });
  }

  const draftByDate = useMemo(() => {
    const sorted = [...draft].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    );
    const dates = new Map<string, Map<string, DraftSlot[]>>();
    for (const s of sorted) {
      const rooms = dates.get(s.date) ?? new Map<string, DraftSlot[]>();
      rooms.set(s.room, [...(rooms.get(s.room) ?? []), s]);
      dates.set(s.date, rooms);
    }
    return dates;
  }, [draft]);

  async function handlePublishConfirm() {
    if (draft.length === 0) return;
    setNotice(null);
    setShowPublishDialog(false);
    try {
      await publish(draft.map(({ key: _key, ...s }) => s));
      setShowSuccess(true);
    } catch (e) {
      setNotice({
        variant: 'error',
        text: e instanceof Error ? e.message : 'Failed to publish schedule.',
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setNotice(null);
    const result = await remove(deleteTarget);
    if (!result.ok) {
      setNotice({ variant: 'error', text: result.message });
    } else {
      setNotice({
        variant: 'success',
        text: 'Slot deleted successfully.',
      });
    }
    setDeleteTarget(null);
  }

  const published = useMemo(
    () => groupSlotsByDate(publishedSlots),
    [publishedSlots]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-black text-[#0D1742] tracking-tight">
            Interview Schedule
          </h2>
          <p className="text-sm font-medium text-[#5E5E92] mt-2">
            Generate and manage time slots for candidate interviews.
          </p>
        </div>
      </div>

      {notice ? (
        <AppNotice
          variant={notice.variant}
          title={notice.variant === 'error' ? 'Action Failed' : 'Success'}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AppNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] items-stretch">
        <Card className="rounded-[24px] py-0 border-gray-200 bg-white shadow-sm flex flex-col justify-between overflow-hidden">
          <CardHeader className="bg-[#0D1742] py-4 px-6 text-white">
            <CardTitle className="text-[14px] font-black uppercase tracking-wider text-[#DCB968]">
              Slot Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 flex-1">
            <div>
              <label className={labelClass} htmlFor="slot-date">
                Interview Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    id="slot-date"
                    type="button"
                    className={`${inputClass} flex items-center justify-between text-left font-normal`}
                  >
                    <span
                      className={
                        date ? 'text-gray-900 font-semibold' : 'text-gray-400'
                      }
                    >
                      {date
                        ? format(date, 'dd/MM/yyyy')
                        : 'Select Date (dd/MM/yyyy)'}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return d < today;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="slot-start">
                  Start Time
                </label>
                <input
                  id="slot-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="slot-end">
                  End Time
                </label>
                <input
                  id="slot-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="slot-room">
                Room
              </label>
              <input
                id="slot-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g., 1.2.036"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="slot-duration">
                Duration per Slot
              </label>
              <div className="relative">
                <input
                  id="slot-duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={`${inputClass} pr-16`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-widest text-gray-400">
                  MINS
                </span>
              </div>
            </div>

            {/* Selector chỉ định phòng ban (Assigned Departments) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={labelClass} style={{ marginBottom: 0 }}>
                  Assigned Departments
                </label>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {selectedDepts.size} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENT_ORDER.map((d) => {
                  const active = selectedDepts.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d)}
                      style={
                        active
                          ? { backgroundColor: '#0D1742', color: '#DCB968' }
                          : undefined
                      }
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all hover:shadow-sm focus:outline-none',
                        active
                          ? 'border-transparent shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      )}
                    >
                      {/* Đảm bảo HR hiển thị là Human Resources trong Form (như thiết kế), nhưng lưu DB vẫn là HR */}
                      {d === 'HR Department'
                        ? 'Human Resources'
                        : DEPARTMENT_META[d].short}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-100 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-red-700">{formError}</p>
              </div>
            )}
          </CardContent>

          <div className="p-5 pt-0">
            <button
              type="button"
              onClick={addToDraft}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] focus:ring-2 focus:ring-[#0D1742]/50 focus:outline-none"
            >
              <Sparkles className="h-4 w-4" aria-hidden /> Generate Slots
            </button>
          </div>
        </Card>

        {/* Draft Preview */}
        <Card className="flex flex-col py-0 rounded-[24px] border-gray-200 bg-white shadow-sm overflow-hidden h-full">
          <CardHeader className="bg-[#0D1742] py-4 px-6 text-white flex flex-row items-center justify-between">
            <CardTitle className="text-[14px] font-black uppercase tracking-wider text-[#DCB968]">
              Draft Preview
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 space-y-4 overflow-y-auto px-6 pb-2 max-h-[80vh]">
            {draft.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-8 min-h-55">
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100">
                  <i className="fa-solid fa-list-check text-2xl text-gray-300" />
                </div>
                <p className="text-base font-bold text-[#0D1742]">
                  No slots in draft
                </p>
                <p className="mt-1.5 text-sm font-medium text-[#5E5E92]">
                  Use the generator form to create interview slots before
                  publishing.
                </p>
              </div>
            ) : (
              [...draftByDate.entries()].map(([d, rooms]) => (
                <div
                  key={d}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-between bg-[#0D1742]/5 border-b border-gray-200 px-5 py-3">
                    <span className="text-sm font-black text-[#0D1742] tracking-wider uppercase">
                      {formatDateBand(d)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => prev.filter((s) => s.date !== d))
                      }
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-100/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
                    </button>
                  </div>

                  <div className="space-y-5 p-5">
                    {[...rooms.entries()].map(([r, list]) => {
                      const morningSlots = list.filter(
                        (s) => getAmPmSession(s.startTime) === 'Morning'
                      );
                      const afternoonSlots = list.filter(
                        (s) => getAmPmSession(s.startTime) === 'Afternoon'
                      );

                      return (
                        <div key={r}>
                          <p className="mb-2.5 text-[10px] font-bold tracking-widest uppercase text-[#5E5E92]">
                            Room: <span className="text-[#0D1742]">{r}</span>
                          </p>

                          <div className="space-y-4">
                            {morningSlots.length > 0 && (
                              <div>
                                <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                  Morning Sessions
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {morningSlots.map((s) => (
                                    <div
                                      key={s.key}
                                      className="group relative flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-[#DCB968] hover:bg-[#FFEFCA]/20"
                                    >
                                      <div className="flex items-center gap-2">
                                        <i className="fa-regular fa-clock text-[#DCB968]" />
                                        <div className="flex flex-col text-left leading-tight">
                                          <span className="tabular-nums">
                                            {slotRangeLabel(s)}
                                          </span>
                                          <span
                                            className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5"
                                            title={s.assignedDepartments?.join(
                                              ', '
                                            )}
                                          >
                                            {renderAssignedDeptsLabel(
                                              s.assignedDepartments
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        aria-label={`Remove ${slotRangeLabel(s)}`}
                                        onClick={() =>
                                          setDraft((prev) =>
                                            prev.filter((x) => x.key !== s.key)
                                          )
                                        }
                                        className="rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {afternoonSlots.length > 0 && (
                              <div>
                                <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                                  Afternoon Sessions
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {afternoonSlots.map((s) => (
                                    <div
                                      key={s.key}
                                      className="group relative flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-[#DCB968] hover:bg-[#FFEFCA]/20"
                                    >
                                      <div className="flex items-center gap-2">
                                        <i className="fa-regular fa-clock text-[#DCB968]" />
                                        <div className="flex flex-col text-left leading-tight">
                                          <span className="tabular-nums">
                                            {slotRangeLabel(s)}
                                          </span>
                                          <span
                                            className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5"
                                            title={s.assignedDepartments?.join(
                                              ', '
                                            )}
                                          >
                                            {renderAssignedDeptsLabel(
                                              s.assignedDepartments
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        aria-label={`Remove ${slotRangeLabel(s)}`}
                                        onClick={() =>
                                          setDraft((prev) =>
                                            prev.filter((x) => x.key !== s.key)
                                          )
                                        }
                                        className="rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>

          <div className="border-t border-gray-100 bg-gray-50 p-5 rounded-b-[24px] mt-auto shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-600">
                <TriangleAlert className="h-4 w-4" aria-hidden /> Unsaved
                Changes
              </p>
              <div className="flex w-full sm:w-auto items-center gap-3">
                <button
                  type="button"
                  disabled={draft.length === 0}
                  onClick={() => setShowDiscardDialog(true)}
                  className="flex-1 sm:flex-none rounded-xl bg-white border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  disabled={draft.length === 0 || publishing}
                  onClick={() => setShowPublishDialog(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-[#DCB968] px-6 py-2.5 text-sm font-bold text-[#0D1742] transition-colors hover:bg-[#e0c27b] disabled:opacity-50"
                >
                  {publishing ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" aria-hidden />
                  )}
                  {publishing ? 'Publishing…' : 'Publish Slots'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-[24px] py-0 border-gray-200 bg-white shadow-sm mt-8 overflow-hidden">
        <CardHeader className="bg-[#0D1742] py-4 px-6 text-white">
          <CardTitle className="text-[14px] font-black uppercase tracking-wider text-[#DCB968]">
            Published Schedule
          </CardTitle>
          <CardDescription className="text-xs font-medium text-gray-300 mt-0.5">
            {publishedSlots.length} active slots available for booking.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          {publishedSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100">
                <i className="fa-solid fa-calendar-xmark text-2xl text-gray-300" />
              </div>
              <p className="text-base font-bold text-[#0D1742]">
                No schedule found
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {[...published.entries()].map(([d, list]) => (
                <div
                  key={d}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="border-b bg-[#0D1742]/5 border-gray-200 px-5 py-3">
                    <span className="text-sm font-black text-[#0D1742] tracking-wider uppercase">
                      {formatDateBand(d)}
                    </span>
                  </div>

                  <div className="space-y-6 p-5">
                    {[...groupSlotsByRoom(list).entries()].map(
                      ([r, roomSlots]) => {
                        const morningSlots = roomSlots.filter(
                          (s) => getAmPmSession(s.startTime) === 'Morning'
                        );
                        const afternoonSlots = roomSlots.filter(
                          (s) => getAmPmSession(s.startTime) === 'Afternoon'
                        );

                        return (
                          <div key={r}>
                            <p className="mb-3 text-[10px] font-bold tracking-widest uppercase text-[#5E5E92]">
                              Room: <span className="text-[#0D1742]">{r}</span>
                            </p>

                            <div className="space-y-4">
                              {morningSlots.length > 0 && (
                                <div>
                                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                    Morning Sessions
                                  </div>
                                  <ul className="space-y-2.5">
                                    {morningSlots.map((s) => (
                                      <li
                                        key={s.id}
                                        className="group relative flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-[#DCB968]/50 hover:shadow-md"
                                      >
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-3.5">
                                            <span className="text-[13px] font-black text-[#0D1742] tabular-nums">
                                              {slotRangeLabel(s)}
                                            </span>
                                            {(() => {
                                              const depts =
                                                s.assignedDepartments || [];
                                              if (depts.length === 0)
                                                return null;
                                              const currentBookings = (
                                                s.bookings || []
                                              ).filter(
                                                (b) =>
                                                  depts.includes(
                                                    b.department
                                                  ) && b.status !== 'AVAILABLE'
                                              ).length;
                                              const isFullyBooked =
                                                currentBookings >= depts.length;

                                              if (isFullyBooked) {
                                                return (
                                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#B82649]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#B82649]">
                                                    <i className="fa-solid fa-lock" />{' '}
                                                    Fully Booked
                                                  </span>
                                                );
                                              }

                                              return (
                                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                                  <i className="fa-solid fa-check" />{' '}
                                                  {currentBookings > 0
                                                    ? `${currentBookings}/${depts.length} Booked`
                                                    : 'Available'}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                          <span
                                            className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400"
                                            title={s.assignedDepartments?.join(
                                              ', '
                                            )}
                                          >
                                            {renderAssignedDeptsLabel(
                                              s.assignedDepartments
                                            )}
                                          </span>
                                        </div>

                                        {/* Nút Delete chỉ hiện ra nếu chưa có BẤT KỲ AI book ca này */}
                                        {!(
                                          s.bookings &&
                                          s.bookings.some(
                                            (b) => b.status !== 'AVAILABLE'
                                          )
                                        ) && (
                                          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                              type="button"
                                              aria-label="Delete"
                                              onClick={() =>
                                                setDeleteTarget(s.id)
                                              }
                                              className="rounded-lg p-2 text-gray-400 hover:bg-[#B82649]/10 hover:text-[#B82649]"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {afternoonSlots.length > 0 && (
                                <div>
                                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                                    Afternoon Sessions
                                  </div>
                                  <ul className="space-y-2.5">
                                    {afternoonSlots.map((s) => (
                                      <li
                                        key={s.id}
                                        className="group relative flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all hover:border-[#DCB968]/50 hover:shadow-md"
                                      >
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-3.5">
                                            <span className="text-[13px] font-black text-[#0D1742] tabular-nums">
                                              {slotRangeLabel(s)}
                                            </span>
                                            {(() => {
                                              const depts =
                                                s.assignedDepartments || [];
                                              if (depts.length === 0)
                                                return null;
                                              const currentBookings = (
                                                s.bookings || []
                                              ).filter(
                                                (b) =>
                                                  depts.includes(
                                                    b.department
                                                  ) && b.status !== 'AVAILABLE'
                                              ).length;
                                              const isFullyBooked =
                                                currentBookings >= depts.length;

                                              if (isFullyBooked) {
                                                return (
                                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#B82649]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#B82649]">
                                                    <i className="fa-solid fa-lock" />{' '}
                                                    Fully Booked
                                                  </span>
                                                );
                                              }

                                              return (
                                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                                  <i className="fa-solid fa-check" />{' '}
                                                  {currentBookings > 0
                                                    ? `${currentBookings}/${depts.length} Booked`
                                                    : 'Available'}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                          <span
                                            className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400"
                                            title={s.assignedDepartments?.join(
                                              ', '
                                            )}
                                          >
                                            {renderAssignedDeptsLabel(
                                              s.assignedDepartments
                                            )}
                                          </span>
                                        </div>

                                        {/* Nút Delete chỉ hiện ra nếu chưa có BẤT KỲ AI book ca này */}
                                        {!(
                                          s.bookings &&
                                          s.bookings.some(
                                            (b) => b.status !== 'AVAILABLE'
                                          )
                                        ) && (
                                          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                              type="button"
                                              aria-label="Delete"
                                              onClick={() =>
                                                setDeleteTarget(s.id)
                                              }
                                              className="rounded-lg p-2 text-gray-400 hover:bg-[#B82649]/10 hover:text-[#B82649]"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Slot"
        description="Are you sure you want to delete this slot? All interviewer availability records linked to this slot will also be removed."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showDiscardDialog}
        title="Clear Draft Slots"
        description="This will clear all slots currently in the draft preview. This action cannot be undone."
        confirmLabel="Clear All"
        variant="destructive"
        onConfirm={() => {
          setDraft([]);
          setShowDiscardDialog(false);
        }}
        onCancel={() => setShowDiscardDialog(false)}
      />

      <ConfirmDialog
        open={showPublishDialog}
        title="Publish Schedule"
        description={`You are about to publish ${draft.length} new interview slots. Once published, interviewers and candidates can begin selecting their shifts.`}
        confirmLabel="Publish Now"
        variant="default"
        loading={publishing}
        onConfirm={handlePublishConfirm}
        onCancel={() => setShowPublishDialog(false)}
      />

      <ShareLinkModal
        open={showSuccess}
        title="Schedule Published"
        caption="New interview slots are now live. Share the links below with interviewers and candidates."
        isSuccessView={true}
        links={[
          {
            label: 'Interviewer Registration Link',
            url: links?.internalUrl ?? '',
          },
          { label: 'Candidate Booking Link', url: links?.publicUrl ?? '' },
        ]}
        onClose={() => {
          setDraft([]);
          setShowSuccess(false);
        }}
      />
    </div>
  );
}

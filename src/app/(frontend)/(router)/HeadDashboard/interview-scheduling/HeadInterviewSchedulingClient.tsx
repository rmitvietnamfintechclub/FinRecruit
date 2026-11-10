'use client';

import { Calendar, AlertCircle, ChevronDown, Copy, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useAvailabilityRecords,
  useInterviewLinks,
  useInterviewSlots,
  useUpdateSlotStatus,
} from '@/hooks/use-interview-scheduling';
import { DEPARTMENT_COLORS } from '@/lib/interview-scheduling/departmentColors';
import { DEPARTMENT_META } from '@/lib/interview-scheduling/departments';
import {
  formatDateBand,
  slotRangeLabel,
} from '@/lib/interview-scheduling/format';
import {
  buildMonitorRows,
  groupSlotsByDate,
  filterSlotsByAssignedDept,
  availabilityForSlot,
} from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type {
  InterviewDepartment,
  InterviewSlot,
  SlotStatus,
} from '@/types/interviewScheduling';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

const STATUS_STYLES = {
  AVAILABLE: {
    bg: '#F3F4F6',
    border: '#E5E7EB',
    text: '#6B7280',
    label: 'Available',
  },
  BOOKED: {
    bg: '#FEF9C2',
    border: '#FFF085',
    text: '#A65F00',
    label: 'Scheduled',
  },
  COMPLETED: {
    bg: '#DCFCE7',
    border: '#86EFAC',
    text: '#166534',
    label: 'Completed',
  },
  NO_SHOW: {
    bg: '#FEE2E2',
    border: '#FCA5A5',
    text: '#991B1B',
    label: 'No Show',
  },
} as const;

function InteractiveStatusBadge({
  status,
  onStatusChangeRequest,
  isPending = false,
}: {
  status: SlotStatus;
  onStatusChangeRequest: (newStatus: SlotStatus) => void;
  isPending?: boolean;
}) {
  const s = STATUS_STYLES[status];

  if (status === 'AVAILABLE') {
    return (
      <span className="inline-flex items-center rounded-full border px-5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm bg-gray-100 border-gray-200 text-gray-500">
        AVAILABLE
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={(e) => onStatusChangeRequest(e.target.value as SlotStatus)}
        disabled={isPending}
        className={cn(
          'appearance-none inline-flex h-7 items-center rounded-full border pl-3 pr-6 text-[10px] font-black uppercase tracking-widest shadow-sm outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          isPending && 'animate-pulse opacity-70'
        )}
        style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
      >
        <option value="AVAILABLE" className="font-bold text-gray-600 bg-white">
          AVAILABLE
        </option>
        <option value="BOOKED" className="font-bold text-[#A65F00] bg-white">
          SCHEDULED
        </option>
        <option value="COMPLETED" className="font-bold text-[#166534] bg-white">
          COMPLETED
        </option>
        <option value="NO_SHOW" className="font-bold text-[#991B1B] bg-white">
          NO SHOW
        </option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <ChevronDown
          className="h-3.5 w-3.5 opacity-70"
          style={{ color: s.text }}
        />
      </div>
    </div>
  );
}

export function HeadInterviewSchedulingClient({
  department,
}: {
  department: InterviewDepartment;
}) {
  const interviewSlots = useInterviewSlots();
  const slots = useMemo(() => interviewSlots ?? [], [interviewSlots]);
  const availability = useAvailabilityRecords() ?? [];
  const links = useInterviewLinks();
  const { updateStatus, pending: isUpdating } = useUpdateSlotStatus();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmMutation, setConfirmMutation] = useState<{
    slot: InterviewSlot;
    newStatus: SlotStatus;
  } | null>(null);

  const filteredSlots = useMemo(
    () => filterSlotsByAssignedDept(slots, department),
    [slots, department]
  );
  const byDate = useMemo(
    () => groupSlotsByDate(filteredSlots),
    [filteredSlots]
  );

  const tones = DEPARTMENT_COLORS[department];
  const meta = DEPARTMENT_META[department];

  const cols = [
    'Activity',
    'Time',
    'Candidate',
    'Executive Board',
    'Department Head',
    'Interviewers',
    'Room',
    'Status',
  ];

  function toggle(date: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const handleStatusChangeRequest = (
    slot: InterviewSlot,
    newStatus: SlotStatus
  ) => {
    const currentBooking = slot.bookings?.find(
      (b) => b.department === department
    );
    if (currentBooking?.status === newStatus) return;
    setConfirmMutation({ slot, newStatus });
  };

  const executeStatusMutation = async () => {
    if (!confirmMutation) return;
    const { slot, newStatus } = confirmMutation;

    setUpdatingSlotId(slot.id);
    try {
      await updateStatus(slot.id, department, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingSlotId(null);
      setConfirmMutation(null);
    }
  };

  const copyToClipboard = () => {
    if (links?.internalUrl) {
      navigator.clipboard.writeText(links.internalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deriveStudentId = (email?: string) => {
    if (!email) return '';
    return email.split('@')[0]?.toUpperCase() ?? '';
  };

  const renderPills = (
    rs: { interviewerName: string; interviewerEmail?: string }[],
    role: 'EB' | 'Head' | 'Member'
  ) => {
    if (!rs || rs.length === 0)
      return <span className="font-medium text-gray-300">-</span>;

    return (
      <div className="mx-auto flex max-w-64 flex-wrap justify-center gap-2">
        {rs.map((r, i) => {
          let style = {};
          let extraClasses = '';
          const studentId = deriveStudentId(r.interviewerEmail);

          if (role === 'EB') {
            style = {
              backgroundColor: meta.strong,
              color: '#FFFFFF',
              borderColor: meta.strong,
            };
            extraClasses = 'border shadow-md ring-1 ring-black/5';
          } else if (role === 'Head') {
            style = {
              backgroundColor: tones.light,
              borderColor: tones.dark,
              color: tones.dark,
            };
            extraClasses = 'border shadow-sm';
          } else {
            style = {
              backgroundColor: '#FFFFFF',
              borderColor: tones.light,
              color: tones.dark,
            };
            extraClasses = 'border shadow-sm opacity-90';
          }

          return (
            <span
              key={`${r.interviewerEmail || r.interviewerName}-${i}`}
              style={style}
              className={cn(
                'inline-flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-center transition-all',
                extraClasses
              )}
              title={
                studentId
                  ? `${r.interviewerName} (${studentId})`
                  : r.interviewerName
              }
            >
              <span className="text-[11px] font-bold leading-tight">
                {r.interviewerName}
              </span>
              {studentId && (
                <span
                  className={cn(
                    'mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-widest tabular-nums',
                    role === 'EB'
                      ? 'bg-white/20 text-[#DCB968]'
                      : 'bg-black/5 opacity-75'
                  )}
                >
                  {studentId}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 rounded-[16px] border border-gray-200 bg-[#0D1742] p-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#DCB968]">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-[14px] font-medium text-white/90 leading-relaxed">
            Send this link to your department members to register their
            interview shifts:
          </p>
        </div>

        {!links ? (
          <div className="flex w-full xl:w-auto items-center gap-2 animate-pulse">
            {/* Skeleton cho Input */}
            <div className="h-10.5 flex-1 xl:w-120 rounded-xl bg-white/10 border border-white/10"></div>
            {/* Skeleton cho Button */}
            <div className="h-10.5 w-22 shrink-0 rounded-xl bg-[#DCB968]/40"></div>
          </div>
        ) : (
          <div className="flex w-full xl:w-auto items-center gap-2">
            <div className="relative flex-1 xl:w-120">
              <input
                type="text"
                readOnly
                value={links?.internalUrl ?? ''}
                className="w-full truncate rounded-xl border border-white/20 bg-white/10 py-2.5 pl-3.5 pr-4 text-[13px] font-medium text-white focus:border-[#DCB968] focus:outline-none focus:ring-1 focus:ring-[#DCB968] selection:bg-[#DCB968] selection:text-[#0D1742]"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <button
              type="button"
              onClick={copyToClipboard}
              className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 bg-[#DCB968] text-[#0D1742] hover:bg-[#c9a657] focus:ring-[#DCB968] shadow-sm"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {byDate.size === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-gray-200 bg-white p-12 shadow-sm">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50">
              <Calendar className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-[#0D1742]">
              No interview slots scheduled for your department.
            </p>
            <p className="mt-1.5 text-xs font-medium text-gray-500">
              The Executive Board has not published any slots yet.
            </p>
          </div>
        ) : (
          [...byDate.entries()].map(([date, daySlots]) => {
            const isCollapsed = collapsed.has(date);
            return (
              <div
                key={date}
                className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(date)}
                  aria-expanded={!isCollapsed}
                  style={tones ? { backgroundColor: tones.dark } : undefined}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:opacity-95 focus:outline-none"
                >
                  <span className="text-sm font-black tracking-wide text-white uppercase">
                    {formatDateBand(date, true)}
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isCollapsed && 'rotate-90'
                      )}
                    />
                  </div>
                </button>

                <div
                  className={cn(
                    'transition-all duration-300 ease-in-out origin-top',
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-500 opacity-100'
                  )}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-180 border-collapse text-center text-sm">
                      <thead>
                        <tr
                          style={
                            tones
                              ? { backgroundColor: tones.medium }
                              : undefined
                          }
                          className="text-white"
                        >
                          {cols.map((c) => (
                            <th
                              key={c}
                              className="px-4 py-3.5 text-[10px] font-black tracking-widest uppercase"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {buildMonitorRows(daySlots).map((row, index) => {
                          if (row.type === 'lunch') {
                            return (
                              <tr
                                key={row.key}
                                className="bg-gray-100/80 border-y border-gray-200"
                              >
                                <td
                                  colSpan={cols.length}
                                  className="px-4 py-4 text-[11px] font-black tracking-[0.3em] uppercase text-gray-500 opacity-70"
                                >
                                  LUNCH BREAK
                                </td>
                              </tr>
                            );
                          }

                          const s = row.slot;
                          const b = s.bookings?.find(
                            (x) => x.department === department
                          );
                          const assignedStaff = availabilityForSlot(
                            availability ?? [],
                            s.id,
                            department
                          );

                          return (
                            <tr
                              key={s.id}
                              className={cn(
                                'transition-colors hover:bg-gray-100/50',
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              )}
                            >
                              <td className="px-4 py-3.5 text-xs font-bold text-[#0D1742]">
                                Session {row.session}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-black tabular-nums text-gray-700 shadow-sm">
                                  {slotRangeLabel(s)}
                                </span>
                              </td>
                              {/* Cột Candidate */}
                              <td className="px-4 py-3.5 border-l border-gray-100">
                                <div className="flex flex-col items-center">
                                  <span className="text-[#0D1742] text-xs font-bold">
                                    {b ? b.candidateName : '-'}
                                  </span>
                                  {b && (
                                    <span className="text-[10px] font-bold text-gray-500 mt-0.5">
                                      {b.candidateStudentId}
                                    </span>
                                  )}
                                </div>
                              </td>
                              {/* Cột Nhân sự phỏng vấn với Pills linh hoạt */}
                              <td className="px-4 py-3.5 border-l border-gray-100 align-middle">
                                {renderPills(
                                  assignedStaff.executiveBoard,
                                  'EB'
                                )}
                              </td>
                              <td className="px-4 py-3.5 border-l border-gray-100 align-middle">
                                {renderPills(assignedStaff.heads, 'Head')}
                              </td>
                              <td className="px-4 py-3.5 border-l border-gray-100 align-middle">
                                {renderPills(
                                  assignedStaff.interviewers,
                                  'Member'
                                )}
                              </td>

                              <td className="px-4 py-3.5 border-l border-gray-100">
                                <span className="text-[11px] font-black uppercase tracking-widest text-[#5E5E92]">
                                  {s.room}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 border-l border-gray-100">
                                {b ? (
                                  <InteractiveStatusBadge
                                    status={b.status}
                                    onStatusChangeRequest={(newStatus) =>
                                      handleStatusChangeRequest(s, newStatus)
                                    }
                                    isPending={
                                      isUpdating && updatingSlotId === s.id
                                    }
                                  />
                                ) : (
                                  <span className="inline-flex items-center rounded-full border px-4 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm bg-gray-100 border-gray-200 text-gray-500">
                                    AVAILABLE
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={!!confirmMutation}
        title="Change Slot Status"
        description={
          confirmMutation ? (
            <div className="space-y-4">
              <p className="text-sm font-medium leading-relaxed text-gray-600 flex items-center flex-wrap gap-1">
                You are about to change the status to
                <span
                  className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm"
                  style={{
                    backgroundColor:
                      STATUS_STYLES[confirmMutation.newStatus].bg,
                    borderColor:
                      STATUS_STYLES[confirmMutation.newStatus].border,
                    color: STATUS_STYLES[confirmMutation.newStatus].text,
                  }}
                >
                  {STATUS_STYLES[confirmMutation.newStatus].label}
                </span>
                for the following slot:
              </p>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-gray-500 mb-0.5 uppercase tracking-wider text-[9px]">
                      Candidate
                    </p>
                    <p className="font-semibold text-gray-900">
                      {confirmMutation.slot.bookings?.find(
                        (b) => b.department === department
                      )?.candidateName ?? 'N/A'}
                    </p>
                    <p className="text-gray-500 font-medium">
                      {confirmMutation.slot.bookings?.find(
                        (b) => b.department === department
                      )?.candidateStudentId ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-500 mb-0.5 uppercase tracking-wider text-[9px]">
                      Schedule
                    </p>
                    <p className="font-semibold text-gray-900">
                      {formatDateBand(confirmMutation.slot.date, true)}
                    </p>
                    <p className="text-gray-500 font-medium">
                      {slotRangeLabel(confirmMutation.slot)} • Room{' '}
                      {confirmMutation.slot.room}
                    </p>
                  </div>
                </div>
              </div>

              {confirmMutation.newStatus === 'AVAILABLE' && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 mt-2">
                  <p className="text-[11px] font-bold tracking-wide text-red-800 uppercase flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> This action cannot be
                    undone
                  </p>
                  <p className="mt-1.5 text-xs text-red-700/80 font-medium leading-relaxed">
                    This will permanently remove the candidate from this slot.
                    The candidate will need to book a new schedule.
                  </p>
                </div>
              )}
            </div>
          ) : null
        }
        confirmLabel="Confirm Change"
        cancelLabel="Cancel"
        variant={
          confirmMutation?.newStatus === 'AVAILABLE' ? 'destructive' : 'default'
        }
        onConfirm={executeStatusMutation}
        onCancel={() => setConfirmMutation(null)}
        loading={isUpdating}
      />
    </div>
  );
}

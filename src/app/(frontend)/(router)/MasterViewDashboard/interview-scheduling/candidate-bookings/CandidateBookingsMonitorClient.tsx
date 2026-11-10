'use client';

import { Calendar, AlertCircle, Link2, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ShareLinkModal } from '@/app/(frontend)/(router)/MasterViewDashboard/interview-scheduling/ShareLinkModal';
import {
  useAvailabilityRecords,
  useInterviewLinks,
  useInterviewSlots,
  useUpdateSlotStatus,
} from '@/hooks/use-interview-scheduling';
import { DEPARTMENT_COLORS } from '@/lib/interview-scheduling/departmentColors';
import {
  DEPARTMENT_META,
  DEPARTMENT_ORDER,
} from '@/lib/interview-scheduling/departments';
import {
  formatDateBand,
  slotRangeLabel,
} from '@/lib/interview-scheduling/format';
import {
  buildMonitorRows,
  cellState,
  groupSlotsByDate,
  filterSlotsByAssignedDept,
  groupSlotsByRoom,
} from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type {
  InterviewDepartment,
  InterviewSlot,
  SlotStatus,
} from '@/types/interviewScheduling';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

type View = 'all' | InterviewDepartment;

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
      <span
        className="inline-flex items-center rounded-full border px-5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm"
        style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
      >
        {s.label}
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
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function CandidateBookingsMonitorClient() {
  const slots = useInterviewSlots();
  const availability = useAvailabilityRecords();
  const links = useInterviewLinks();
  const { updateStatus, pending: isUpdating } = useUpdateSlotStatus();

  const [view, setView] = useState<View>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);

  // State quản lý Confirm Dialog tập trung
  const [confirmMutation, setConfirmMutation] = useState<{
    slot: InterviewSlot;
    department: InterviewDepartment;
    newStatus: SlotStatus;
  } | null>(null);

  const filteredSlots = useMemo(() => {
    if (view === 'all') return slots;

    return filterSlotsByAssignedDept(slots, view).filter(
      (s) => cellState(s, availability, view) !== 'blocked'
    );
  }, [slots, view, availability]);

  const byDate = useMemo(
    () => groupSlotsByDate(filteredSlots),
    [filteredSlots]
  );

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
    department: InterviewDepartment,
    newStatus: SlotStatus
  ) => {
    const currentBooking = slot.bookings?.find(
      (b) => b.department === department
    );
    if (currentBooking?.status === newStatus) return;

    setConfirmMutation({ slot, department, newStatus });
  };

  const executeStatusMutation = async () => {
    if (!confirmMutation) return;
    const { slot, department, newStatus } = confirmMutation;

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

  const allCols = [
    'Activity',
    'Time',
    ...DEPARTMENT_ORDER.map((d) => DEPARTMENT_META[d].full),
  ];
  const deptCols = [
    'Activity',
    'Time',
    'Candidate',
    'Student ID',
    'Room',
    'Status',
  ];
  const cols = view === 'all' ? allCols : deptCols;
  const tones = view === 'all' ? null : DEPARTMENT_COLORS[view];

  function rowsFor(daySlots: InterviewSlot[]) {
    return buildMonitorRows(daySlots);
  }

  const pills: Array<{ value: View; label: string }> = [
    { value: 'all', label: 'All Departments' },
    ...DEPARTMENT_ORDER.map((d) => ({
      value: d as View,
      label: DEPARTMENT_META[d].short,
    })),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#0D1742]">
            Candidate Bookings
          </h2>
          <p className="mt-2 text-sm font-medium text-[#5E5E92]">
            Track and manage interview slot reservations by candidates.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Department Filter"
          className="flex w-full gap-2 overflow-x-auto rounded-xl bg-gray-50/80 p-1.5 shadow-inner border border-gray-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:overflow-visible sm:bg-transparent sm:p-0 sm:shadow-none sm:border-none"
        >
          {pills.map((p) => {
            const active = p.value === view;
            return (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(p.value)}
                style={
                  active && p.value !== 'all'
                    ? {
                        backgroundColor: DEPARTMENT_META[p.value].strong,
                        color: 'white',
                      }
                    : undefined
                }
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-200 shadow-sm border border-transparent sm:flex-1',
                  active
                    ? p.value === 'all'
                      ? 'bg-[#0D1742] text-[#DCB968] ring-2 ring-offset-1 ring-[#0D1742]/20'
                      : 'ring-2 ring-offset-1 ring-[#0D1742]/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-5 py-2.5 text-sm font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#1a2b75] focus:outline-none focus:ring-2 focus:ring-[#0D1742]/50 sm:w-auto"
        >
          <Link2 className="h-4 w-4" aria-hidden /> Share Link
        </button>
      </div>

      <div className="space-y-6">
        {byDate.size === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-gray-200 bg-white p-12 shadow-sm">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50">
              <Calendar className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-[#0D1742]">
              No interview slots published yet.
            </p>
            <p className="mt-1.5 text-xs font-medium text-gray-500">
              Slots must be provisioned before candidates can book.
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
                  className={cn(
                    'flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:opacity-95 focus:outline-none',
                    !tones && 'bg-[#9A6F19]'
                  )}
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
                      aria-hidden
                    />
                  </div>
                </button>

                <div
                  className={cn(
                    'transition-all duration-300 ease-in-out origin-top',
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-500 opacity-100'
                  )}
                >
                  {/* Conditional Rendering: Grouped by Room (All) vs Chronological (Department) */}
                  {view === 'all' ? (
                    <div className="p-4 space-y-6">
                      {[...groupSlotsByRoom(daySlots).entries()].map(
                        ([room, roomSlots]) => (
                          <div
                            key={room}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-[#E6B656] shadow-sm"
                          >
                            <div className="border-b px-4 py-2.5">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-[#0D1742]">
                                Room {room}
                              </h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-180 border-collapse text-center text-sm">
                                <thead>
                                  <tr className="bg-[#EAD6AF] text-[#0D1742] border-b border-gray-200">
                                    {cols.map((c) => (
                                      <th
                                        key={c}
                                        className="px-4 py-3 text-[10px] font-black tracking-widest uppercase text-gray-700"
                                      >
                                        {c}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {rowsFor(roomSlots).map((row) => {
                                    if (row.type === 'lunch') {
                                      return (
                                        <tr
                                          key={row.key}
                                          className="bg-gray-100/80 border-y border-gray-200"
                                        >
                                          <td
                                            colSpan={cols.length}
                                            className="px-4 py-3 text-[11px] font-black tracking-[0.3em] uppercase text-gray-500 opacity-70"
                                          >
                                            LUNCH BREAK
                                          </td>
                                        </tr>
                                      );
                                    }
                                    const s = row.slot;
                                    return (
                                      <tr
                                        key={s.id}
                                        className="transition-colors hover:bg-gray-50/80"
                                      >
                                        <td className="px-4 py-3 text-xs font-bold text-[#0D1742]">
                                          Session {row.session}
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-black tabular-nums text-gray-700 shadow-sm">
                                            {slotRangeLabel(s)}
                                          </span>
                                        </td>
                                        {DEPARTMENT_ORDER.map((d) => {
                                          const state = cellState(
                                            s,
                                            availability,
                                            d
                                          );
                                          if (state === 'booked') {
                                            const booking = s.bookings?.find(
                                              (b) => b.department === d
                                            );
                                            return (
                                              <td
                                                key={d}
                                                className={cn(
                                                  'px-4 py-3 leading-tight font-semibold border-l border-gray-100',
                                                  booking?.status === 'BOOKED'
                                                    ? 'bg-emerald-50/40'
                                                    : booking?.status ===
                                                        'NO_SHOW'
                                                      ? 'bg-red-50/40'
                                                      : 'bg-gray-50'
                                                )}
                                              >
                                                <div className="flex flex-col items-center">
                                                  <span className="text-[#0D1742] text-xs font-bold">
                                                    {booking?.candidateName ??
                                                      'N/A'}
                                                  </span>
                                                  <span className="text-[10px] font-bold text-gray-500 mt-0.5">
                                                    {booking?.candidateStudentId ??
                                                      'N/A'}
                                                  </span>
                                                </div>
                                              </td>
                                            );
                                          }
                                          if (state === 'blocked') {
                                            return (
                                              <td
                                                key={d}
                                                style={{
                                                  backgroundColor: `${DEPARTMENT_META[d].light}40`,
                                                }}
                                                className="border-l border-white/50 relative"
                                              >
                                                <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]"></div>
                                              </td>
                                            );
                                          }
                                          return (
                                            <td
                                              key={d}
                                              className="px-4 py-3 text-gray-300 font-bold border-l border-gray-100"
                                            >
                                              -
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
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
                          {rowsFor(daySlots).map((row) => {
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
                              (x) => x.department === view
                            );

                            return (
                              <tr
                                key={s.id}
                                className="transition-colors hover:bg-gray-50/80"
                              >
                                <td className="px-4 py-3.5 text-xs font-bold text-[#0D1742]">
                                  Session {row.session}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-black tabular-nums text-gray-700 shadow-sm">
                                    {slotRangeLabel(s)}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-bold text-[#0D1742] border-l border-gray-100">
                                  {b ? b.candidateName : '-'}
                                </td>
                                <td className="px-4 py-3.5 text-xs text-gray-500 font-medium">
                                  {b ? b.candidateStudentId : '-'}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="text-[11px] font-black uppercase tracking-widest text-[#5E5E92]">
                                    {s.room}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  {b ? (
                                    <InteractiveStatusBadge
                                      status={b.status}
                                      onStatusChangeRequest={(newStatus) =>
                                        handleStatusChangeRequest(
                                          s,
                                          view as InterviewDepartment,
                                          newStatus
                                        )
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
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Modals */}
      <ShareLinkModal
        open={shareOpen}
        title="Candidate Interview Portals"
        caption="Share the links below with candidates for slot reservation and schedule tracking."
        links={[
          {
            label: 'Candidate Booking Link',
            url: links?.publicUrl ?? '',
          },
          {
            label: 'Candidate Schedule Lookup Link',
            url: links?.lookupUrl ?? '',
          },
        ]}
        onClose={() => setShareOpen(false)}
      />

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
                        (b) => b.department === confirmMutation.department
                      )?.candidateName ?? 'N/A'}
                    </p>
                    <p className="text-gray-500 font-medium">
                      {confirmMutation.slot.bookings?.find(
                        (b) => b.department === confirmMutation.department
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

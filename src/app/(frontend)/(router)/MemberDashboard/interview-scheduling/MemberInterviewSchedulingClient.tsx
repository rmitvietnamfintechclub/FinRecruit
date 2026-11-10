'use client';

import { Calendar, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useAvailabilityRecords,
  useInterviewSlots,
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
  SlotStatus,
} from '@/types/interviewScheduling';

const STATUS_STYLES = {
  AVAILABLE: {
    bg: '#F3F4F6',
    border: '#E5E7EB',
    text: '#6B7280',
    label: 'AVAILABLE',
  },
  BOOKED: {
    bg: '#FEF9C2',
    border: '#FFF085',
    text: '#A65F00',
    label: 'SCHEDULED',
  },
  COMPLETED: {
    bg: '#DCFCE7',
    border: '#86EFAC',
    text: '#166534',
    label: 'COMPLETED',
  },
  NO_SHOW: {
    bg: '#FEE2E2',
    border: '#FCA5A5',
    text: '#991B1B',
    label: 'NO SHOW',
  },
} as const;

// READ-ONLY Status Badge cho Member
function ReadOnlyStatusBadge({ status }: { status: SlotStatus }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['AVAILABLE'];

  return (
    <span
      className="inline-flex items-center justify-center rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {s.label}
    </span>
  );
}

const deriveStudentId = (email?: string) => {
  if (!email) return '';
  return email.split('@')[0]?.toUpperCase() ?? '';
};

const renderPills = (
  rs: { interviewerName: string; interviewerEmail?: string }[],
  role: 'EB' | 'Head' | 'Member',
  meta: { strong: string },
  tones: { light: string; dark: string }
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

export function MemberInterviewSchedulingClient({
  department,
}: {
  department: InterviewDepartment;
}) {
  const interviewSlots = useInterviewSlots();
  const slots = useMemo(() => interviewSlots ?? [], [interviewSlots]);
  const availability = useAvailabilityRecords() ?? [];

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
                            availability,
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

                              <td className="px-4 py-3.5 border-l border-gray-100 align-middle">
                                {renderPills(
                                  assignedStaff.executiveBoard,
                                  'EB',
                                  meta,
                                  tones
                                )}
                              </td>
                              <td className="px-4 py-3.5 border-l border-gray-100 align-middle">
                                {renderPills(
                                  assignedStaff.heads,
                                  'Head',
                                  meta,
                                  tones
                                )}
                              </td>
                              <td className="px-4 py-3.5 border-l border-gray-100 align-middle">
                                {renderPills(
                                  assignedStaff.interviewers,
                                  'Member',
                                  meta,
                                  tones
                                )}
                              </td>

                              <td className="px-4 py-3.5 border-l border-gray-100">
                                <span className="text-[11px] font-black uppercase tracking-widest text-[#5E5E92]">
                                  {s.room}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 border-l border-gray-100">
                                <ReadOnlyStatusBadge
                                  status={b?.status || 'AVAILABLE'}
                                />
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
    </div>
  );
}

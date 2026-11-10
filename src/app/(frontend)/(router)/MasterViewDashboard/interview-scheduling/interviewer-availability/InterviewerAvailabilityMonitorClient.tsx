'use client';

import { ChevronDown, Link2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ShareLinkModal } from '@/app/(frontend)/(router)/MasterViewDashboard/interview-scheduling/ShareLinkModal';
import {
  useAvailabilityRecords,
  useInterviewLinks,
  useInterviewSlots,
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
  availabilityForSlot,
  buildMonitorRows,
  groupSlotsByDate,
  filterSlotsByAssignedDept,
} from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type { InterviewDepartment } from '@/types/interviewScheduling';

const COLS = [
  'Activity',
  'Time',
  'Executive Board',
  'Department Head',
  'Interviewers',
  'Room',
];

export function InterviewerAvailabilityMonitorClient() {
  const slots = useInterviewSlots();
  const availability = useAvailabilityRecords();
  const links = useInterviewLinks();

  const [department, setDepartment] = useState<InterviewDepartment>(
    'Technology Department'
  );
  // Mặc định mở tất cả các ngày
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const filteredSlots = useMemo(() => {
    return filterSlotsByAssignedDept(slots, department);
  }, [slots, department]);

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

  const tones = DEPARTMENT_COLORS[department];
  const meta = DEPARTMENT_META[department];

  const deriveStudentId = (email?: string) => {
    if (!email) return '';
    return email.split('@')[0]?.toUpperCase() ?? '';
  };

  const renderPills = (
    rs: { interviewerName: string; interviewerEmail?: string }[],
    role: 'EB' | 'Head' | 'Member'
  ) => {
    if (!rs.length) return <span className="text-gray-300">-</span>;

    return (
      <div className="mx-auto flex max-w-96 flex-wrap justify-center gap-1.5">
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
            >
              <span className="text-[11px] font-bold leading-tight">
                {r.interviewerName}
              </span>
              {studentId && (
                <span
                  className={cn(
                    'mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-black tracking-widest uppercase tabular-nums',
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
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-black text-[#0D1742] tracking-tight">
            Interviewer Roster
          </h2>
          <p className="text-sm font-medium text-[#5E5E92] mt-2">
            Monitor the declared availability of interviewers across
            departments.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <div
          role="tablist"
          aria-label="Department Filter"
          className="flex flex-wrap gap-2"
        >
          {DEPARTMENT_ORDER.map((d) => {
            const active = d === department;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDepartment(d)}
                style={
                  active
                    ? {
                        backgroundColor: DEPARTMENT_META[d].strong,
                        color: 'white',
                      }
                    : undefined
                }
                className={cn(
                  'rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-200 shadow-sm border border-transparent',
                  active
                    ? 'ring-2 ring-offset-1 ring-[#0D1742]/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                )}
              >
                {/* Luôn render Human Resources cho phòng HR trên các nút Tab */}
                {d === 'HR Department'
                  ? 'Human Resources'
                  : DEPARTMENT_META[d].short}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-5 py-2.5 text-sm font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#1a2b75] focus:outline-none focus:ring-2 focus:ring-[#0D1742]/50"
        >
          <Link2 className="h-4 w-4" aria-hidden /> Share Link
        </button>
      </div>

      <div className="space-y-6">
        {byDate.size === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-gray-200 bg-white p-12 shadow-sm">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100">
              <Users className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold text-[#0D1742]">
              No schedules available for this department
            </p>
            <p className="mt-1.5 text-xs font-medium text-gray-500">
              Generate and deploy master slots for this department before
              tracking availability.
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
                  style={{ backgroundColor: tones.dark }}
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
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-200 border-collapse text-center text-sm">
                      <thead>
                        <tr
                          style={{ backgroundColor: tones.medium }}
                          className="text-white"
                        >
                          {COLS.map((c) => (
                            <th
                              key={c}
                              className={cn(
                                'px-4 py-3 text-[10px] font-black tracking-widest uppercase'
                              )}
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {buildMonitorRows(daySlots).map((row) =>
                          row.type === 'lunch' ? (
                            <tr
                              key={row.key}
                              className="bg-gray-100/80 border-y border-gray-200"
                            >
                              <td
                                colSpan={COLS.length}
                                className="px-4 py-4 text-[11px] font-black tracking-[0.3em] uppercase text-gray-500 opacity-70"
                              >
                                LUNCH BREAK
                              </td>
                            </tr>
                          ) : (
                            (() => {
                              const a = availabilityForSlot(
                                availability,
                                row.slot.id,
                                department
                              );
                              // Tính toán cường độ (Intensity)
                              const totalRegistered =
                                a.executiveBoard.length +
                                a.heads.length +
                                a.interviewers.length;
                              const rowHighlight =
                                totalRegistered === 0
                                  ? 'bg-red-50/30'
                                  : 'hover:bg-gray-50';

                              return (
                                <tr
                                  key={row.slot.id}
                                  className={cn(
                                    'transition-colors',
                                    rowHighlight
                                  )}
                                >
                                  <td className="px-4 py-3.5 text-xs font-bold text-[#0D1742]">
                                    Session {row.session}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700 tabular-nums shadow-sm border border-gray-200">
                                      {slotRangeLabel(row.slot)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    {renderPills(a.executiveBoard, 'EB')}
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    {renderPills(a.heads, 'Head')}
                                  </td>
                                  <td className="px-4 py-3.5 align-middle">
                                    {renderPills(a.interviewers, 'Member')}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-[#5E5E92]">
                                      {row.slot.room}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })()
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ShareLinkModal
        open={shareOpen}
        title="Interviewer Availability Portal"
        caption="Share this link with Executive Board, Department Heads, and Members to declare their availability."
        links={[
          {
            label: 'Interviewer Roster Link',
            url: links?.internalUrl ?? '',
          },
        ]}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

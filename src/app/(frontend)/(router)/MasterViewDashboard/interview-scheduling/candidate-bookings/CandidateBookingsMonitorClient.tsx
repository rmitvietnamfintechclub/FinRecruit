'use client';

import { ChevronDown, Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ShareLinkModal } from '@/app/(frontend)/(router)/MasterViewDashboard/interview-scheduling/ShareLinkModal';
import {
  useAvailabilityRecords,
  useInterviewLinks,
  useInterviewSlots,
} from '@/hooks/use-interview-scheduling';
import { DEPARTMENT_META, DEPARTMENT_ORDER } from '@/lib/interview-scheduling/departments';
import { formatDateBand, slotRangeLabel } from '@/lib/interview-scheduling/format';
import { buildMonitorRows, cellState, groupSlotsByDate } from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type { InterviewDepartment, InterviewSlot } from '@/types/interviewScheduling';

type View = 'all' | InterviewDepartment;

// TODO(backend): no per-booking status exists yet (Completed / No Show). Display-only placeholder.
const STATUS_STYLES = {
  Scheduled: { bg: '#FEF9C2', border: '#FFF085', text: '#A65F00' },
  Available: { bg: '#DBF5FF', border: '#12C0FF', text: '#007BA7' },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {status}
    </span>
  );
}

export function CandidateBookingsMonitorClient() {
  const slots = useInterviewSlots();
  const availability = useAvailabilityRecords();
  const links = useInterviewLinks();

  const [view, setView] = useState<View>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const byDate = useMemo(() => groupSlotsByDate(slots), [slots]);

  function toggle(date: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const allCols = ['Activity', 'Time', ...DEPARTMENT_ORDER.map((d) => DEPARTMENT_META[d].full), 'Room'];
  const deptCols = ['Activity', 'Time', 'Candidate', 'Student ID', 'Room', 'Status'];
  const cols = view === 'all' ? allCols : deptCols;

  function rowsFor(daySlots: InterviewSlot[]) {
    if (view === 'all') return buildMonitorRows(daySlots);
    // Single department: only slots this department booked or could still offer.
    return buildMonitorRows(daySlots.filter((s) => cellState(s, availability, view) !== 'blocked'));
  }

  const pills: Array<{ value: View; label: string }> = [
    { value: 'all', label: 'All Departments' },
    ...DEPARTMENT_ORDER.map((d) => ({ value: d as View, label: DEPARTMENT_META[d].short })),
  ];

  return (
    <div className="space-y-5 rounded-2xl bg-[#F4F6FB] p-4 sm:p-6 dark:bg-[#0A0E16]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Department view" className="flex flex-wrap gap-2">
          {pills.map((p) => {
            const active = p.value === view;
            return (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(p.value)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-bold transition-colors',
                  active
                    ? 'bg-[#E6B656] text-[#010A63]'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-[#171717] dark:text-slate-300 dark:hover:bg-[#232838]'
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
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:opacity-90 dark:bg-[#171717] dark:ring-1 dark:ring-[#232838]"
        >
          <Link2 className="h-4 w-4" aria-hidden /> Share Link
        </button>
      </div>

      {byDate.size === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">No interview slots published yet.</p>
      ) : (
        [...byDate.entries()].map(([date, daySlots]) => {
          const open = !collapsed.has(date);
          return (
            <div key={date} className="overflow-hidden rounded-xl border border-[#232838] dark:bg-[#12151F]">
              <button
                type="button"
                onClick={() => toggle(date)}
                aria-expanded={open}
                className="flex w-full items-center justify-between bg-[#9A6F19] px-4 py-3 text-left text-sm font-extrabold tracking-wide text-white"
              >
                {formatDateBand(date, true)}
                <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} aria-hidden />
              </button>
              {open ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-center text-sm">
                    <thead>
                      <tr className="bg-[#E6B656] text-[#010A63]">
                        {cols.map((c) => (
                          <th key={c} className="px-3 py-2 text-xs font-extrabold tracking-wider uppercase">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsFor(daySlots).map((row) => {
                        if (row.type === 'lunch') {
                          return (
                            <tr key={row.key} className="bg-[#BB8822] text-white">
                              <td colSpan={cols.length} className="px-3 py-1.5 text-xs font-extrabold tracking-[0.3em]">LUNCH BREAK</td>
                            </tr>
                          );
                        }
                        const s = row.slot;
                        return (
                          <tr key={s.id} className="border-t border-white/40 bg-[#EAD6AF] text-slate-900">
                            <td className="px-3 py-2 font-bold">Session {row.session}</td>
                            <td className="px-3 py-2 font-semibold tabular-nums">{slotRangeLabel(s)}</td>
                            {view === 'all' ? (
                              DEPARTMENT_ORDER.map((d) => {
                                const state = cellState(s, availability, d);
                                if (state === 'booked') {
                                  return (
                                    <td key={d} className="px-3 py-2 leading-tight font-semibold">
                                      {s.bookedCandidateName}
                                      <br />
                                      <span className="text-xs font-medium opacity-70">{s.bookedCandidateStudentId}</span>
                                    </td>
                                  );
                                }
                                if (state === 'blocked') {
                                  return <td key={d} style={{ backgroundColor: DEPARTMENT_META[d].light }} aria-label="Unavailable" />;
                                }
                                return <td key={d} className="px-3 py-2">-</td>;
                              })
                            ) : (
                              <>
                                <td className="px-3 py-2 font-semibold">{s.bookedCandidateName ?? '-'}</td>
                                <td className="px-3 py-2">{s.bookedCandidateStudentId ?? '-'}</td>
                                <td className="px-3 py-2 font-semibold">{s.room}</td>
                                <td className="px-3 py-2">
                                  <StatusBadge status={s.status === 'BOOKED' ? 'Scheduled' : 'Available'} />
                                </td>
                              </>
                            )}
                            {view === 'all' ? <td className="px-3 py-2 font-semibold">{s.room}</td> : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })
      )}

      <ShareLinkModal
        open={shareOpen}
        title="Share Registration Link"
        url={links?.publicUrl ?? ''}
        caption="Share this link with candidates to register their interview slots."
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

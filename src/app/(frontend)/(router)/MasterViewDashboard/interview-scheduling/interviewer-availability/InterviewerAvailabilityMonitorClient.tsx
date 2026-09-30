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
import {
  availabilityForSlot,
  buildMonitorRows,
  groupSlotsByDate,
} from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type { InterviewDepartment } from '@/types/interviewScheduling';

const COLS = ['Activity', 'Time', 'Executive Board', 'Head', 'Interviewers', 'Room'];

export function InterviewerAvailabilityMonitorClient() {
  const slots = useInterviewSlots();
  const availability = useAvailabilityRecords();
  const links = useInterviewLinks();

  const [department, setDepartment] = useState<InterviewDepartment>('Technology Department');
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

  const names = (rs: { interviewerName: string }[]) =>
    rs.length ? (
      <div className="flex flex-wrap justify-center gap-1">
        {rs.map((r, i) => (
          <span key={`${r.interviewerName}-${i}`} className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-900">
            {r.interviewerName}
          </span>
        ))}
      </div>
    ) : (
      '-'
    );

  return (
    <div className="space-y-5 rounded-2xl bg-[#F4F6FB] p-4 sm:p-6 dark:bg-[#0A0E16]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Department" className="flex flex-wrap gap-2">
          {DEPARTMENT_ORDER.map((d) => {
            const active = d === department;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDepartment(d)}
                style={active ? { backgroundColor: DEPARTMENT_META[d].strong } : undefined}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-bold transition-colors',
                  active
                    ? 'text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-[#171717] dark:text-slate-300 dark:hover:bg-[#232838]'
                )}
              >
                {DEPARTMENT_META[d].short}
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
                className="flex w-full items-center justify-between bg-[#0E3559] px-4 py-3 text-left text-sm font-extrabold tracking-wide text-white"
              >
                {formatDateBand(date, true)}
                <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} aria-hidden />
              </button>
              {open ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-center text-sm">
                    <thead>
                      <tr className="bg-[#3D85C6] text-white">
                        {COLS.map((c) => (
                          <th key={c} className="px-3 py-2 text-xs font-extrabold tracking-wider uppercase">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {buildMonitorRows(daySlots).map((row) =>
                        row.type === 'lunch' ? (
                          <tr key={row.key} className="bg-[#363E8E] text-white">
                            <td colSpan={COLS.length} className="px-3 py-1.5 text-xs font-extrabold tracking-[0.3em]">LUNCH BREAK</td>
                          </tr>
                        ) : (
                          (() => {
                            const a = availabilityForSlot(availability, row.slot.id, department);
                            return (
                              <tr key={row.slot.id} className="border-t border-white/40 bg-[#9FC5E8]/50 text-slate-900 dark:bg-[#9FC5E8]/50">
                                <td className="px-3 py-2 font-bold">Session {row.session}</td>
                                <td className="px-3 py-2 font-semibold tabular-nums">{slotRangeLabel(row.slot)}</td>
                                <td className="px-3 py-2">{names(a.executiveBoard)}</td>
                                <td className="px-3 py-2">{names(a.heads)}</td>
                                <td className="px-3 py-2">{names(a.interviewers)}</td>
                                <td className="px-3 py-2 font-semibold">{row.slot.room}</td>
                              </tr>
                            );
                          })()
                        )
                      )}
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
        title="Share Availability Link"
        url={links?.internalUrl ?? ''}
        caption="Share this link with interviewers to register their interview availability."
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

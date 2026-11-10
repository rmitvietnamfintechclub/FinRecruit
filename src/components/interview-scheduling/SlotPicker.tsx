'use client';

import { ChevronDown, Calendar, MapPin, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import { DEPARTMENT_COLORS } from '@/lib/interview-scheduling/departmentColors';
import { DEPARTMENT_META } from '@/lib/interview-scheduling/departments';
import {
  formatDateBand,
  slotDuration,
  slotRangeLabel,
} from '@/lib/interview-scheduling/format';
import {
  groupSlotsByDate,
  groupSlotsByRoom,
} from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type {
  InterviewDepartment,
  InterviewerAvailabilityRecord,
  InterviewSlot,
} from '@/types/interviewScheduling';

type SlotPickerProps<T extends InterviewSlot> = {
  slots: T[];
  isSelected: (slot: T) => boolean;
  isDisabled?: (slot: T) => boolean;
  /** Tooltip for a chip (e.g. why it is disabled). */
  chipTitle?: (slot: T) => string | undefined;
  onToggle: (slot: T) => void;
  /** Department-themed band: primary-colored toggle header + support-colored content. Omit for a plain grid. */
  band?: { label: string; department: InterviewDepartment };
  availability?: InterviewerAvailabilityRecord[];
};

/** Date -> room -> chips grid, optionally under a collapsible colored department band. */
export function SlotPicker<T extends InterviewSlot>({
  slots,
  isSelected,
  isDisabled,
  chipTitle,
  onToggle,
  band,
  availability,
}: SlotPickerProps<T>) {
  const [open, setOpen] = useState(true);
  const byDate = useMemo(
    () => groupSlotsByDate(slots) as Map<string, T[]>,
    [slots]
  );

  const tones = band ? DEPARTMENT_COLORS[band.department] : null;

  const grid = (
    <div
      className={cn('space-y-8 transition-all duration-300', band && 'py-6')}
      style={tones ? { backgroundColor: `${tones.light}50` } : undefined}
    >
      {byDate.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Calendar className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-500">
            No interview slots available.
          </p>
        </div>
      ) : (
        [...byDate.entries()].map(([date, daySlots]) => (
          <div key={date} className="animate-in fade-in duration-300">
            {/* Header Ngày */}
            <div className="mb-4 flex items-center gap-2 px-4 sm:px-8">
              <Calendar className="h-5 w-5 text-[#DCB968]" />
              <h3 className="text-[15px] font-black tracking-wide text-[#0D1742] uppercase">
                {formatDateBand(date, true)}
              </h3>
            </div>

            <div className="space-y-6">
              {[...groupSlotsByRoom(daySlots).entries()].map(([room, list]) => (
                <div key={room} className="px-4 sm:px-8">
                  {/* Header Phòng */}
                  <div className="mb-3 flex items-center gap-1.5 text-[#5E5E92]">
                    <MapPin className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">
                      Room: {room}
                    </span>
                  </div>

                  {/* Grid chứa Chips */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {list.map((s) => {
                      const disabled = isDisabled?.(s) ?? false;
                      const selected = isSelected(s);
                      const titleMsg = chipTitle?.(s);

                      const deptName = band?.department;
                      const maxLimit = deptName
                        ? (s.maxMembersPerDept?.[deptName] ?? 4)
                        : 4;

                      // ĐẾM SỐ LƯỢNG MEMBER THỰC TẾ ĐÃ ĐĂNG KÝ CHO SLOT NÀY VÀ DEPARTMENT NÀY
                      const currentCount =
                        deptName && availability
                          ? availability.filter(
                              (r: InterviewerAvailabilityRecord) =>
                                r.slotId === s.id &&
                                r.department === deptName &&
                                r.interviewerRole === 'Member'
                            ).length
                          : 0;

                      const isFull = currentCount >= maxLimit;
                      const isCandidateBooked = deptName
                        ? s.bookings?.some(
                            (b) =>
                              b.department === deptName &&
                              b.status !== 'AVAILABLE'
                          )
                        : false;

                      const chipElement = (
                        <button
                          type="button"
                          onClick={() => !disabled && onToggle(s)}
                          disabled={disabled}
                          className={cn(
                            'relative flex w-full flex-col items-center justify-center rounded-2xl border p-3.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#0D1742] focus:ring-offset-2',
                            selected
                              ? 'border-[#0D1742] bg-[#0D1742] shadow-md ring-1 ring-[#0D1742]'
                              : disabled
                                ? 'cursor-not-allowed border-gray-100 bg-gray-50/50 opacity-60'
                                : 'border-gray-200 bg-white hover:border-[#0D1742]/30 hover:bg-gray-50 hover:shadow-sm'
                          )}
                        >
                          <span
                            className={cn(
                              'text-sm font-black tracking-tight',
                              selected
                                ? 'text-[#DCB968]'
                                : disabled
                                  ? 'text-gray-400'
                                  : 'text-gray-900'
                            )}
                          >
                            {slotRangeLabel(s)}
                          </span>
                          <span
                            className={cn(
                              'mt-1 text-[10px] font-bold uppercase tracking-widest',
                              selected ? 'text-white/80' : 'text-gray-400'
                            )}
                          >
                            {slotDuration(s)}
                          </span>

                          {deptName && (!disabled || isFull || isCandidateBooked) && (
                            <span
                              className={cn(
                                'mt-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase',
                                selected
                                  ? 'bg-white/20 text-[#DCB968]'
                                  : isFull
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              )}
                            >
                              {currentCount}/{maxLimit} Members
                            </span>
                          )}

                          {/* Icon cảnh báo nhỏ nếu bị disabled */}
                          {disabled && (
                            <Info className="absolute top-2 right-2 h-3 w-3 text-gray-400 opacity-50" />
                          )}
                        </button>
                      );

                      // Sử dụng Tooltip component đã wrap sẵn của bạn
                      if (disabled && titleMsg) {
                        return (
                          <Tooltip key={s.id} content={titleMsg}>
                            <div className="w-full h-full cursor-not-allowed">
                              {chipElement}
                            </div>
                          </Tooltip>
                        );
                      }

                      return (
                        <div key={s.id} className="w-full h-full">
                          {chipElement}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (!band) return <div className="w-full">{grid}</div>;

  return (
    <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ backgroundColor: DEPARTMENT_META[band.department].strong }}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-opacity hover:opacity-95"
      >
        <span className="text-[15px] font-black tracking-wide text-white">
          {band.label}
        </span>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              !open && 'rotate-90'
            )}
            aria-hidden
          />
        </div>
      </button>

      <div
        className={cn(
          'transition-all duration-300 ease-in-out origin-top',
          open ? 'max-h-500 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {grid}
      </div>
    </div>
  );
}

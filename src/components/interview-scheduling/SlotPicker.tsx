'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SlotChip } from '@/components/interview-scheduling/SlotChip';
import { formatDateBand, slotDuration, slotRangeLabel } from '@/lib/interview-scheduling/format';
import { groupSlotsByDate, groupSlotsByRoom } from '@/lib/interview-scheduling/reducer';
import { cn } from '@/lib/utils';
import type { InterviewSlot } from '@/types/interviewScheduling';

type SlotPickerProps<T extends InterviewSlot> = {
  slots: T[];
  isSelected: (slot: T) => boolean;
  isDisabled?: (slot: T) => boolean;
  onToggle: (slot: T) => void;
  /** Colored band header (department). Omit for a plain grid. */
  band?: { label: string; color: string };
};

/** Date -> room -> chips grid, optionally under a collapsible colored department band. */
export function SlotPicker<T extends InterviewSlot>({
  slots,
  isSelected,
  isDisabled,
  onToggle,
  band,
}: SlotPickerProps<T>) {
  const [open, setOpen] = useState(true);
  const byDate = useMemo(() => groupSlotsByDate(slots) as Map<string, T[]>, [slots]);

  const grid = (
    <div className="space-y-5 p-4">
      {byDate.size === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">No interview slots are available yet.</p>
      ) : (
        [...byDate.entries()].map(([date, daySlots]) => (
          <div key={date}>
            <p className="mb-2 text-sm font-extrabold tracking-wide">{formatDateBand(date)}</p>
            {[...groupSlotsByRoom(daySlots).entries()].map(([room, list]) => (
              <div key={room} className="mb-3">
                <p className="text-muted-foreground mb-1.5 text-[11px] font-bold tracking-wider uppercase">Room: {room}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <SlotChip
                      key={s.id}
                      label={slotRangeLabel(s)}
                      caption={slotDuration(s)}
                      state={isDisabled?.(s) ? 'disabled' : isSelected(s) ? 'selected' : 'idle'}
                      onClick={() => onToggle(s)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );

  if (!band) return <div className="bg-card border-border rounded-xl border">{grid}</div>;

  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ backgroundColor: band.color }}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-extrabold tracking-wide text-white"
      >
        {band.label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} aria-hidden />
      </button>
      {open ? grid : null}
    </div>
  );
}

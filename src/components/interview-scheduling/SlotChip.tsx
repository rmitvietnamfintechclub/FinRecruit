'use client';

import { cn } from '@/lib/utils';

export type SlotChipState = 'idle' | 'selected' | 'disabled';

type SlotChipProps = {
  label: string;
  caption: string;
  state: SlotChipState;
  onClick?: () => void;
  /** Native tooltip; put on a wrapper so it also shows on disabled chips. */
  title?: string;
};

export function SlotChip({ label, caption, state, onClick, title }: SlotChipProps) {
  const disabled = state === 'disabled';
  return (
    <span title={title} className="inline-flex">
    <button
      type="button"
      disabled={disabled}
      aria-pressed={state === 'selected'}
      onClick={onClick}
      className={cn(
        'flex min-w-[8.5rem] flex-col items-center rounded-lg px-3 py-2 text-center transition-colors',
        state === 'idle' &&
          'border border-[rgba(198,197,211,0.4)] bg-white text-black hover:border-[#16A34A]/60',
        state === 'selected' &&
          'border border-[#16A34A] bg-[#DCFCE7] text-black',
        disabled &&
          'cursor-not-allowed border-0 bg-[rgba(0,34,0,0.13)] text-[rgba(27,27,32,0.3)]'
      )}
    >
      <span className="text-sm font-bold tabular-nums">{label}</span>
      <span className="text-[11px] font-medium opacity-70">{caption}</span>
    </button>
    </span>
  );
}

'use client';

import { Check, CircleX, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ROUND_2_DECISIONS,
  type Round2Decision,
} from '@/lib/interview-cockpit/types';

const STYLE: Record<Round2Decision, string> = {
  Pass: 'border-[#a7f3d0] bg-[#d0fae5] text-[#006045] hover:border-emerald-400 hover:bg-[#a7f3d0] dark:border-[#a7f3d0] dark:bg-[#d0fae5] dark:text-[#006045] dark:hover:border-emerald-400 dark:hover:bg-[#a7f3d0]',
  Fail: 'border-[#fca5a5] bg-[#ffe2e2] text-[#e7000b] hover:border-red-400 hover:bg-[#fca5a5] dark:border-[#fca5a5] dark:bg-[#ffe2e2] dark:text-[#e7000b] dark:hover:border-red-400 dark:hover:bg-[#fca5a5]',
  'No Show':
    'border-[#ffb86a] bg-[#ffedd4] text-[#9f2d00] hover:border-orange-400 hover:bg-[#ffb86a] dark:border-[#ffb86a] dark:bg-[#ffedd4] dark:text-[#9f2d00] dark:hover:border-orange-400 dark:hover:bg-[#ffb86a]',
};

const DARK_INACTIVE_STYLE: Record<Round2Decision, string> = {
  Pass: 'dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/70 dark:hover:text-emerald-200',
  Fail: 'dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900/70 dark:hover:text-red-200',
  'No Show':
    'dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:bg-orange-900/70 dark:hover:text-orange-200',
};

const ICON = {
  Pass: Check,
  Fail: CircleX,
  'No Show': UserX,
};

export function DecisionBar({
  value,
  disabled,
  onChange,
  compact = false,
}: {
  value: Round2Decision | null;
  disabled?: boolean;
  onChange: (status: Round2Decision) => void;
  compact?: boolean;
}) {
  const hasDecision = value !== null;

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2',
        compact ? '' : 'sticky bottom-0 z-20 bg-card/95 py-3 backdrop-blur'
      )}
      role="group"
      aria-label="Round 2 decision"
    >
      {ROUND_2_DECISIONS.map((status) => {
        const Icon = ICON[status];
        const isSelected = value === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            title={
              status === 'No Show' ? 'No Show is recorded as Fail' : undefined
            }
            aria-label={
              status === 'No Show' ? 'No Show (recorded as Fail)' : status
            }
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-extrabold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:text-sm',
              STYLE[status],
              hasDecision && !isSelected && DARK_INACTIVE_STYLE[status],
              isSelected &&
                'ring-2 ring-blue-600 ring-offset-2 ring-offset-card'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {status}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { Check, CircleX, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ROUND_2_DECISIONS,
  type Round2Decision,
} from '@/lib/interview-cockpit/types';

const STYLE: Record<Round2Decision, string> = {
  Pass: 'border-[#a7f3d0] bg-[#d0fae5] text-[#006045] hover:bg-[#bcf6dc] dark:border-[#a7f3d0] dark:bg-[#d0fae5] dark:text-[#006045]',
  Fail: 'border-[#fca5a5] bg-[#ffe2e2] text-[#e7000b] hover:bg-[#ffd0d0] dark:border-[#fca5a5] dark:bg-[#ffe2e2] dark:text-[#e7000b]',
  'No Show':
    'border-[#ffb86a] bg-[#ffedd4] text-[#9f2d00] hover:bg-[#ffe1ba] dark:border-[#ffb86a] dark:bg-[#ffedd4] dark:text-[#9f2d00]',
};

const DARK_INACTIVE_STYLE: Record<Round2Decision, string> = {
  Pass: 'dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400',
  Fail: 'dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400',
  'No Show':
    'dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-400',
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
            title={
              status === 'No Show' ? 'No Show is recorded as Fail' : undefined
            }
            aria-label={
              status === 'No Show' ? 'No Show (recorded as Fail)' : status
            }
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:text-sm',
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

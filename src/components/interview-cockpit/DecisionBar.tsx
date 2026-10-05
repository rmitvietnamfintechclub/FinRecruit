'use client';

import { CalendarClock, Check, CircleX, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ROUND_2_STATUSES,
  type Round2Status,
} from '@/lib/interview-cockpit/types';

const STYLE: Record<Round2Status, string> = {
  Pending:
    'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40',
  Pass: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40',
  Fail: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40',
  'No Show':
    'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40',
};

const ICON = {
  Pending: CalendarClock,
  Pass: Check,
  Fail: CircleX,
  'No Show': UserX,
};

export function DecisionBar({
  value,
  disabled,
  disabledStatuses = [],
  disabledStatusReason,
  onChange,
  compact = false,
}: {
  value: Round2Status;
  disabled?: boolean;
  disabledStatuses?: Round2Status[];
  disabledStatusReason?: string;
  onChange: (status: Round2Status) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 sm:grid-cols-4',
        compact ? '' : 'sticky bottom-0 z-20 bg-card/95 py-3 backdrop-blur'
      )}
      role="group"
      aria-label="Round 2 decision"
    >
      {ROUND_2_STATUSES.map((status) => {
        const Icon = ICON[status];
        const statusDisabled = disabled || disabledStatuses.includes(status);
        return (
          <button
            key={status}
            type="button"
            disabled={statusDisabled}
            title={
              disabledStatuses.includes(status)
                ? disabledStatusReason
                : undefined
            }
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:text-sm',
              STYLE[status],
              value === status &&
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

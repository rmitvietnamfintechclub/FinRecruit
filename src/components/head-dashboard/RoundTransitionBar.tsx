'use client';

import { useState } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { AppNotice } from '@/components/feedback/AppNotice';
import type { LockRound1Result } from '@/types/roundTransition';

type RoundTransitionBarProps = {
  department: DepartmentType | null;
  evaluated: number;
  total: number;
  pending: number;
  isLocked: boolean;
  locking: boolean;
  onLock: () => Promise<LockRound1Result>;
};

export function RoundTransitionBar({
  department,
  evaluated,
  total,
  pending,
  isLocked,
  locking,
  onLock,
}: RoundTransitionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    variant: 'info' | 'error';
  } | null>(null);
  const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  const canLock = department !== null && pending === 0 && total > 0 && !isLocked;

  return (
    <section
      aria-label="Round 1 evaluation status"
      className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="w-full sm:max-w-md">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
          Round 1 Evaluation
        </p>
        <h2 className="text-foreground mt-1 text-xl font-black">
          {isLocked
            ? 'Locked'
            : `In progress - ${evaluated} of ${total} evaluated`}
        </h2>
        <div
          className="bg-muted mt-3 h-2 w-full overflow-hidden rounded"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={evaluated}
          aria-label="Round 1 evaluation progress"
        >
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${isLocked ? 100 : percentage}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        <button
          type="button"
          disabled={!canLock || locking}
          onClick={() => setConfirmOpen(true)}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLocked ? 'Round 1 Locked' : 'Confirm & Lock Round 1'}
        </button>
        {!isLocked && pending > 0 ? (
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Resolve {pending} pending application(s) to enable locking
          </p>
        ) : null}
      </div>

      {notice ? (
        <div className="w-full sm:w-auto">
          <AppNotice variant={notice.variant} onDismiss={() => setNotice(null)}>
            {notice.text}
          </AppNotice>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Lock Round 1 results?"
        description="Passed candidates move to the Round 2 interview pool and Round 1 becomes read-only. This cannot be undone from the dashboard."
        confirmLabel="Confirm & Lock"
        loading={locking}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          const result = await onLock();
          setConfirmOpen(false);
          if (result.success) {
            setNotice({
              text: 'Round 1 locked. Passed candidates are now in the Round 2 pool.',
              variant: 'info',
            });
          } else {
            setNotice({
              text: result.message ?? 'Failed to lock Round 1.',
              variant: 'error',
            });
          }
        }}
      />
    </section>
  );
}

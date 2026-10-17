'use client';

import { useState } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { AppNotice } from '@/components/feedback/AppNotice';
import type { LockRound1Result } from '@/types/roundTransition';
import { cn } from '@/lib/utils';

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
  const canLock =
    department !== null && pending === 0 && total > 0 && !isLocked;

  // 1. GIAO DIỆN KHI ĐÃ KHÓA VÒNG 1
  if (isLocked) {
    return (
      <section
        aria-label="Round 1 evaluation status"
        className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
          <i className="fa-solid fa-check" /> Round 1 Locked
        </span>
        <h2 className="text-xl font-black text-[#0D1742]">
          Round 1 Evaluation closed
        </h2>
        <p className="text-sm font-medium text-gray-500">
          Results are final. Passed candidates are in the Round 2 interview
          pool.
        </p>

        {notice ? (
          <div className="mt-2 w-full sm:w-auto">
            <AppNotice
              variant={notice.variant}
              onDismiss={() => setNotice(null)}
            >
              {notice.text}
            </AppNotice>
          </div>
        ) : null}
      </section>
    );
  }

  // 2. GIAO DIỆN KHI ĐANG TRONG QUÁ TRÌNH CHẤM
  return (
    <section
      aria-label="Round 1 evaluation status"
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full sm:max-w-md">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            Round 1 Evaluation
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#0D1742]">
            In progress — {evaluated} of {total} evaluated
          </h2>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={evaluated}
            aria-label="Round 1 evaluation progress"
          >
            <div
              className="h-full rounded-full bg-[#10B981] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            disabled={!canLock || locking}
            onClick={() => setConfirmOpen(true)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all',
              canLock
                ? 'bg-[#0D1742] text-[#DCB968] shadow-sm hover:bg-[#0D1742]/90'
                : 'cursor-not-allowed bg-gray-100 text-gray-400 opacity-80'
            )}
          >
            {locking ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-[#DCB968]" />
                Locking...
              </>
            ) : (
              <>
                {/* Ổ khóa xuất hiện khi Nút đang bị vô hiệu hóa */}
                {!canLock && <i className="fa-solid fa-lock" />}
                Confirm & Lock Round 1
              </>
            )}
          </button>
        </div>
      </div>

      {!isLocked && pending > 0 ? (
        <p className="mt-4 flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
          <i className="fa-solid fa-circle-info mr-2 opacity-80" />
          You still have {pending} pending application{pending !== 1 ? 's' : ''}
          . Resolve all to enable locking.
        </p>
      ) : null}

      {notice ? (
        <div className="mt-4 w-full sm:w-auto">
          <AppNotice variant={notice.variant} onDismiss={() => setNotice(null)}>
            {notice.text}
          </AppNotice>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Finalize Round 1?"
        variant="default"
        description={
          <div className="flex flex-col gap-4">
            <p className="text-gray-600">
              All <span className="font-bold text-emerald-600">Passed</span>{' '}
              candidates will be moved to the Round 2 interview pool, and this
              evaluation round will become{' '}
              <span className="font-bold text-gray-900">read-only</span>.
            </p>

            <div className="rounded-lg border border-[#F7D27F] bg-[#FFEFCA] p-3 text-xs font-semibold text-[#A28436]">
              <i className="fa-solid fa-triangle-exclamation mr-1.5" />
              This action cannot be undone from the dashboard. Make sure all
              results are accurate.
            </div>
          </div>
        }
        confirmLabel="Yes, Lock Round 1"
        loading={locking}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          const result = await onLock();
          setConfirmOpen(false);
          if (result.success) {
            setNotice({
              text: 'Round 1 finalized. Passed candidates are now in the Round 2 pool.',
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

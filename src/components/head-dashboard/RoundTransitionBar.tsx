'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { AppNotice } from '@/components/feedback/AppNotice';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';

export type LockResult = { success: boolean; message?: string };

export type RoundTransitionBarProps = {
  roundName: 'Round 1' | 'Round 2';
  evaluated: number;
  total: number;
  isLocked: boolean;
  locking: boolean;
  incomingSecondChoicePending?: number;

  canLock: boolean;
  isPendingLock: boolean;
  lockDisabledReason: string | null;

  lockedTitle: string;
  lockedDescription: string;
  lockedSuccessMessage: string;

  // --- THÊM PROP NÀY ---
  lockConfirmDescription: React.ReactNode;

  onLock: () => Promise<LockResult>;
  onGoToNextRound?: () => void;
  nextRoundLabel?: string;
};

export function RoundTransitionBar({
  roundName,
  evaluated,
  total,
  isLocked,
  locking,
  canLock,
  isPendingLock,
  lockDisabledReason,
  lockedTitle,
  lockedDescription,
  lockedSuccessMessage,
  lockConfirmDescription,
  onLock,
  onGoToNextRound,
  nextRoundLabel,
}: RoundTransitionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    variant: 'info' | 'error';
  } | null>(null);

  const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  if (isLocked) {
    return (
      <section
        aria-label={`${roundName} evaluation status`}
        className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
          <i className="fa-solid fa-check" /> {roundName} Locked
        </span>
        <h2 className="text-xl font-black text-[#0D1742]">{lockedTitle}</h2>
        <p className="text-sm font-medium text-gray-500">{lockedDescription}</p>

        {notice ? (
          <div className="mt-2 w-full">
            <AppNotice
              variant={notice.variant}
              title={
                notice.variant === 'info'
                  ? `${roundName} Locked Successfully`
                  : undefined
              }
              onDismiss={() => setNotice(null)}
              action={
                notice.variant === 'info' &&
                onGoToNextRound &&
                nextRoundLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      onGoToNextRound();
                      setNotice(null);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-[#0D1742] px-4 py-2 text-sm font-bold text-[#DCB968] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {nextRoundLabel} <i className="fa-solid fa-arrow-right" />
                  </button>
                ) : undefined
              }
            >
              {notice.text}
            </AppNotice>
          </div>
        ) : null}
      </section>
    );
  }

  const isWaitingSecondChoice =
    !isPendingLock &&
    Boolean(lockDisabledReason && lockDisabledReason.includes('2nd choice'));

  return (
    <TooltipProvider delayDuration={300}>
      <section
        aria-label={`${roundName} evaluation status`}
        className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="w-full sm:max-w-md">
            <div className="mb-2 flex w-full items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                {roundName} Evaluation
              </p>

              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                  isPendingLock
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : isWaitingSecondChoice
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                <i
                  className={`fa-solid ${
                    isPendingLock
                      ? 'fa-hourglass-half'
                      : isWaitingSecondChoice
                        ? 'fa-clock-rotate-left'
                        : 'fa-spinner fa-spin'
                  }`}
                />
                {isPendingLock
                  ? 'Pending Lock'
                  : isWaitingSecondChoice
                    ? 'Awaiting 2nd Choice'
                    : 'Evaluating'}
              </span>
            </div>

            <h2 className="text-xl font-black tracking-tight text-[#0D1742]">
              {total === 0 && !isWaitingSecondChoice
                ? 'No candidates'
                : isPendingLock
                  ? 'All evaluated — Ready to lock'
                  : isWaitingSecondChoice
                    ? 'All evaluated — Awaiting 2nd-choice reviews'
                    : `In progress — ${evaluated} of ${total} evaluated`}
            </h2>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={evaluated}
              aria-label={`${roundName} evaluation progress`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPendingLock
                    ? 'bg-amber-400'
                    : isWaitingSecondChoice
                      ? 'bg-purple-400'
                      : 'bg-[#10B981]'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {(() => {
              const actionButton = (
                <span
                  className={
                    !canLock
                      ? 'inline-block cursor-not-allowed'
                      : 'inline-block'
                  }
                >
                  <button
                    type="button"
                    disabled={!canLock || locking}
                    onClick={() => setConfirmOpen(true)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all disabled:pointer-events-none',
                      canLock
                        ? 'bg-[#0D1742] text-[#DCB968] shadow-sm hover:bg-[#0D1742]/90'
                        : 'bg-gray-100 text-gray-400 opacity-80'
                    )}
                  >
                    {locking ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-[#DCB968]" />
                        Locking...
                      </>
                    ) : (
                      <>
                        {!canLock && <i className="fa-solid fa-lock" />}
                        Confirm & Lock {roundName}
                      </>
                    )}
                  </button>
                </span>
              );

              return lockDisabledReason ? (
                <Tooltip content={lockDisabledReason}>{actionButton}</Tooltip>
              ) : (
                actionButton
              );
            })()}
          </div>
        </div>

        {lockDisabledReason &&
          (lockDisabledReason.includes('Resolve') ||
            lockDisabledReason.includes('2nd choice')) && (
            <p
              className={`mt-4 flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${
                lockDisabledReason.includes('2nd choice')
                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                  : 'border-blue-100 bg-blue-50 text-blue-700'
              }`}
            >
              <i
                className={`fa-solid ${
                  lockDisabledReason.includes('2nd choice')
                    ? 'fa-clock-rotate-left'
                    : 'fa-circle-info'
                } mr-2 opacity-80`}
              />
              {lockDisabledReason}
            </p>
          )}

        {notice ? (
          <div className="mt-4 w-full sm:w-auto">
            <AppNotice
              variant={notice.variant}
              onDismiss={() => setNotice(null)}
            >
              {notice.text}
            </AppNotice>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmOpen}
          title={`Finalize ${roundName}?`}
          variant="default"
          description={lockConfirmDescription} // <--- Gọi prop ở đây
          confirmLabel={`Yes, Lock ${roundName}`}
          loading={locking}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            const result = await onLock();
            setConfirmOpen(false);
            if (result.success) {
              setNotice({
                text: lockedSuccessMessage,
                variant: 'info',
              });
            } else {
              setNotice({
                text: result.message ?? `Failed to lock ${roundName}.`,
                variant: 'error',
              });
            }
          }}
        />
      </section>
    </TooltipProvider>
  );
}

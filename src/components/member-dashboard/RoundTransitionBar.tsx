'use client';

import { Tooltip } from '@/components/ui/Tooltip';

interface RoundTransitionBarProps {
  roundName: 'Round 1' | 'Round 2';
  department: string;
  evaluated: number;
  total: number;
  isLocked: boolean;
  isRecruitmentActive?: boolean;
  isLoading?: boolean;
  incomingSecondChoicePending?: number;
}

export function RoundTransitionBar({
  roundName,
  department,
  evaluated,
  total,
  isLocked,
  isRecruitmentActive = false,
  isLoading = false,
  incomingSecondChoicePending = 0,
}: RoundTransitionBarProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Loading evaluation status"
        className="mb-6 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-2 flex w-full sm:max-w-xl items-center justify-between">
          <div className="h-3 w-48 animate-pulse rounded-md bg-gray-200" />
          <div className="h-5 w-20 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="w-full sm:max-w-xl">
          <div className="mt-1 h-6 w-3/4 animate-pulse rounded-md bg-gray-200 sm:w-64" />
          <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-gray-100">
            <div className="h-full w-1/3 rounded-full bg-gray-200" />
          </div>
        </div>
      </section>
    );
  }

  const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  const incomingPending =
    roundName === 'Round 1' ? incomingSecondChoicePending : 0;

  const isPendingLock =
    !isLocked &&
    !isRecruitmentActive &&
    total > 0 &&
    evaluated === total &&
    incomingPending === 0;

  const isWaitingSecondChoice =
    !isLocked &&
    !isRecruitmentActive &&
    evaluated === total &&
    incomingPending > 0;

  return (
    <section
      aria-label={`${roundName} evaluation status`}
      className="mb-6 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-2 flex w-full sm:max-w-xl items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
          {roundName} Progress • {department}
        </p>

        {/* BADGE TRẠNG THÁI */}
        {isLocked ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">
            <i className="fa-solid fa-lock" /> Locked
          </span>
        ) : isPendingLock ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
            <i className="fa-solid fa-hourglass-half" /> Pending Lock
          </span>
        ) : isWaitingSecondChoice ? (
          <Tooltip
            content={`Waiting for ${incomingPending} candidate${incomingPending > 1 ? 's' : ''} with ${department} as 2nd choice to finish Round 1 evaluation.`}
          >
            <span className="inline-flex cursor-help items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-purple-700">
              <i className="fa-solid fa-clock-rotate-left" /> Awaiting 2nd
              Choice
            </span>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
            <i className="fa-solid fa-spinner fa-spin" /> Evaluating
          </span>
        )}
      </div>

      <div className="w-full sm:max-w-xl">
        <h2 className="text-xl font-black tracking-tight text-[#0D1742]">
          {total === 0 && incomingPending === 0
            ? 'No candidates'
            : isLocked
              ? 'Evaluation closed — Results are final'
              : isPendingLock
                ? 'All evaluated — Waiting to lock'
                : isWaitingSecondChoice
                  ? `Waiting for ${incomingPending} candidate${incomingPending > 1 ? 's' : ''} with ${department} as 2nd choice`
                  : `In progress — ${evaluated} of ${total} evaluated`}
        </h2>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={evaluated}
          aria-valuemin={0}
          aria-valuemax={total}
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
    </section>
  );
}

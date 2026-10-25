'use client';

interface RoundTransitionBarProps {
  department: string;
  evaluated: number;
  total: number;
  isLocked: boolean;
  isRecruitmentActive?: boolean;
  isLoading?: boolean; 
}

export function RoundTransitionBar({
  department,
  evaluated,
  total,
  isLocked,
  isRecruitmentActive = false,
  isLoading = false, 
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
  const isPendingLock = !isLocked && !isRecruitmentActive && evaluated === total;

  return (
    <section
      aria-label="Round 1 evaluation status"
      className="mb-6 flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-2 flex w-full sm:max-w-xl items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
          Round 1 Progress • {department}
        </p>

        {/* BADGE TRẠNG THÁI */}
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
            isLocked
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isPendingLock
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          <i
            className={`fa-solid ${
              isLocked
                ? 'fa-lock'
                : isPendingLock
                  ? 'fa-hourglass-half'
                  : 'fa-spinner fa-spin'
            }`}
          />
          {isLocked ? 'Locked' : isPendingLock ? 'Pending Lock' : 'Evaluating'}
        </span>
      </div>

      <div className="w-full sm:max-w-xl">
        <h2 className="text-xl font-black tracking-tight text-[#0D1742]">
          {total === 0
            ? 'No candidates'
            : isLocked
              ? 'Evaluation closed — Results are final'
              : isPendingLock
                ? `All evaluated — Waiting to lock`
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
              isPendingLock ? 'bg-amber-400' : 'bg-[#10B981]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </section>
  );
}
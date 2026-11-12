'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import { ROUND_TRANSITION_DEPARTMENTS } from '@/lib/round-transition/reducer';

type DepartmentProgress = {
  department: DepartmentType;
  evaluated: number;
  total: number;
  incomingSecondChoicePending?: number;
};

type RoundTransitionBarProps = {
  roundName: 'Round 1' | 'Round 2';
  department: DepartmentType | null;
  evaluated: number;
  total: number;
  isLocked: boolean;
  departmentStates?: Array<{
    department: string;
    isRound1Locked: boolean;
    isRound2Locked: boolean;
  }>;
  departmentStats?: DepartmentProgress[];
  isRecruitmentActive?: boolean;
};

export function RoundTransitionBar({
  roundName,
  department,
  evaluated,
  total,
  isLocked,
  departmentStates = [],
  departmentStats = [],
  isRecruitmentActive = false,
}: RoundTransitionBarProps) {
  const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  if (department) {
    const cleanTargetDept = department
      .replace(' Department', '')
      .trim()
      .toLowerCase();

    const currentDeptStat = departmentStats.find((s) => {
      const cleanStatDept = s.department
        .replace(' Department', '')
        .trim()
        .toLowerCase();
      return cleanStatDept === cleanTargetDept;
    });

    const incomingPending =
      roundName === 'Round 1'
        ? (currentDeptStat?.incomingSecondChoicePending ?? 0)
        : 0;

    const isPendingLock =
      !isLocked &&
      !isRecruitmentActive &&
      total > 0 &&
      evaluated === total &&
      incomingPending === 0;

    return (
      <section
        aria-label={`${roundName} evaluation status`}
        className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between w-full sm:max-w-xl mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            {roundName} Progress • {department}
          </p>
          {isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
              <i className="fa-solid fa-lock" /> Locked
            </span>
          ) : isPendingLock ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
              <i className="fa-solid fa-hourglass-half" /> Pending Lock
            </span>
          ) : incomingPending > 0 && evaluated === total ? (
            <span
              title={`Waiting for ${incomingPending} candidate(s) with ${department} as 2nd choice to finish 1st-choice evaluation`}
              className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-purple-700"
            >
              <i className="fa-solid fa-clock-rotate-left" /> +{incomingPending}{' '}
              2nd Choice
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
              <i className="fa-solid fa-spinner fa-spin" /> Evaluating
            </span>
          )}
        </div>

        <div className="w-full sm:max-w-xl">
          <h2 className="text-xl font-black tracking-tight text-[#0D1742]">
            {total === 0 && incomingPending === 0
              ? 'No candidates'
              : isLocked
                ? `Evaluation closed — Results are final`
                : isPendingLock
                  ? `All evaluated — Waiting to lock`
                  : evaluated === total && incomingPending > 0
                    ? `Waiting for ${incomingPending} 2nd-choice review${incomingPending > 1 ? 's' : ''}`
                    : `In progress — ${evaluated} of ${total} evaluated`}
          </h2>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={evaluated}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPendingLock
                  ? 'bg-amber-400'
                  : evaluated === total && incomingPending > 0
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

  const lockedCount = ROUND_TRANSITION_DEPARTMENTS.filter((dept) => {
    const state = departmentStates.find((s) => s.department === dept);
    return roundName === 'Round 1'
      ? state?.isRound1Locked
      : state?.isRound2Locked;
  }).length;

  const totalIncomingPending =
    roundName === 'Round 1'
      ? departmentStats.reduce(
          (sum, s) => sum + (s.incomingSecondChoicePending ?? 0),
          0
        )
      : 0;

  const isAllLocked = lockedCount === ROUND_TRANSITION_DEPARTMENTS.length;
  const isOverallPendingLock =
    !isAllLocked &&
    !isRecruitmentActive &&
    total > 0 &&
    evaluated === total &&
    totalIncomingPending === 0;

  return (
    <section
      aria-label={`${roundName} overall evaluation status`}
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-start">
        <div className="w-full lg:max-w-md shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              {roundName} Progress • All Departments
            </p>
            {isAllLocked ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                <i className="fa-solid fa-lock" /> All Locked
              </span>
            ) : isOverallPendingLock ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                <i className="fa-solid fa-hourglass-half" /> Pending Locks
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
                <i className="fa-solid fa-spinner fa-spin" /> Evaluating
              </span>
            )}
          </div>

          <h2 className="text-xl font-black tracking-tight text-[#0D1742]">
            {total === 0
              ? 'No candidates'
              : isAllLocked
                ? `Evaluation complete — Results are final`
                : isOverallPendingLock
                  ? `All evaluated — Waiting for locks`
                  : `In progress — ${evaluated} of ${total} evaluated`}
          </h2>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={evaluated}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverallPendingLock ? 'bg-amber-400' : 'bg-[#10B981]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="w-full flex-1 lg:pl-10 lg:border-l lg:border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
              Department Status
            </p>
            {lockedCount > 0 && (
              <span className="text-[10px] font-bold text-gray-500">
                {lockedCount}/{ROUND_TRANSITION_DEPARTMENTS.length} Locked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {ROUND_TRANSITION_DEPARTMENTS.map((dept) => {
              const cleanTargetDept = dept
                .replace(' Department', '')
                .trim()
                .toLowerCase();
              const state = departmentStates.find((s) => {
                const cleanDsDept = s.department
                  .replace(' Department', '')
                  .trim()
                  .toLowerCase();
                return cleanDsDept === cleanTargetDept;
              });
              const isDeptLocked =
                roundName === 'Round 1'
                  ? (state?.isRound1Locked ?? false)
                  : (state?.isRound2Locked ?? false);

              const deptStat = departmentStats.find((s) => {
                const cleanStatDept = s.department
                  .replace(' Department', '')
                  .trim()
                  .toLowerCase();
                return cleanStatDept === cleanTargetDept;
              });

              const deptEvaluated = deptStat?.evaluated ?? 0;
              const deptTotal = deptStat?.total ?? 0;
              const deptIncomingPending =
                roundName === 'Round 1'
                  ? (deptStat?.incomingSecondChoicePending ?? 0)
                  : 0;
              const isEmpty = deptTotal === 0 && deptIncomingPending === 0;

              const isDeptPendingLock =
                !isDeptLocked &&
                !isRecruitmentActive &&
                deptTotal > 0 &&
                deptEvaluated === deptTotal &&
                deptIncomingPending === 0;

              const isWaitingSecondChoice =
                !isDeptLocked &&
                !isRecruitmentActive &&
                deptEvaluated === deptTotal &&
                deptIncomingPending > 0;

              return (
                <div
                  key={dept}
                  title={
                    isWaitingSecondChoice
                      ? `Waiting for ${deptIncomingPending} candidate(s) with ${dept} as 2nd choice to finish 1st-choice evaluation`
                      : undefined
                  }
                  className={`flex flex-col p-3 rounded-xl border transition-colors ${
                    isDeptLocked
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : isDeptPendingLock
                        ? 'border-amber-200 bg-amber-50/50'
                        : isWaitingSecondChoice
                          ? 'border-purple-200 bg-purple-50/40'
                          : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold truncate pr-2 ${
                        isDeptLocked
                          ? 'text-emerald-900'
                          : isDeptPendingLock
                            ? 'text-amber-900'
                            : isWaitingSecondChoice
                              ? 'text-purple-900'
                              : 'text-[#0D1742]'
                      }`}
                    >
                      {dept.replace(' Department', '')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`text-[11px] font-black ${
                        isDeptLocked
                          ? 'text-emerald-700'
                          : isDeptPendingLock
                            ? 'text-amber-700'
                            : isWaitingSecondChoice
                              ? 'text-purple-700'
                              : 'text-[#5E5E92]'
                      }`}
                    >
                      {isEmpty ? '0' : `${deptEvaluated} / ${deptTotal}`}
                    </span>

                    {isDeptLocked ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/50">
                        <i className="fa-solid fa-lock" /> Locked
                      </span>
                    ) : isEmpty ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-500 bg-gray-100">
                        Empty
                      </span>
                    ) : isDeptPendingLock ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/50">
                        <i className="fa-solid fa-hourglass-half" /> Pending
                      </span>
                    ) : isWaitingSecondChoice ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/60">
                        <i className="fa-solid fa-clock-rotate-left" /> +
                        {deptIncomingPending} 2nd
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-50">
                        <i className="fa-solid fa-spinner fa-spin" /> Eval
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

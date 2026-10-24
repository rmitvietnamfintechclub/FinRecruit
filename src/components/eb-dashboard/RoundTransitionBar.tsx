'use client';

import type { DepartmentType } from '@/app/(backend)/types';
import { ROUND_TRANSITION_DEPARTMENTS } from '@/lib/round-transition/reducer';

type DepartmentProgress = {
  department: DepartmentType;
  evaluated: number;
  total: number;
};

type RoundTransitionBarProps = {
  department: DepartmentType | null; // null đại diện cho 'All'
  evaluated: number;
  total: number;
  isLocked: boolean;
  departmentStates?: Array<{
    department: string;
    isRound1Locked: boolean;
  }>;
  departmentStats?: DepartmentProgress[];
};

export function RoundTransitionBar({
  department,
  evaluated,
  total,
  isLocked,
  departmentStates = [],
  departmentStats = [],
}: RoundTransitionBarProps) {
  const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  const isEvaluatedAll = evaluated === total && total > 0;

  // 1. NẾU ĐANG CHỌN 1 PHÒNG BAN CỤ THỂ
  if (department) {
    return (
      <section
        aria-label="Round 1 evaluation status"
        className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between w-full sm:max-w-xl mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            Round 1 Progress • {department}
          </p>

          {/* BADGE TRẠNG THÁI RÕ RÀNG TRÁNH GÂY HIỂU LẦM */}
          {isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
              <i className="fa-solid fa-lock" /> Locked
            </span>
          ) : isEvaluatedAll ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
              <i className="fa-solid fa-unlock" /> Pending Lock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
              <i className="fa-solid fa-spinner fa-spin" /> Evaluating
            </span>
          )}
        </div>

        <div className="w-full sm:max-w-xl">
          <h2 className="text-xl font-black tracking-tight text-[#0D1742]">
            {total === 0
              ? 'No candidates'
              : isLocked
                ? `Evaluation closed — Results are final`
                : isEvaluatedAll
                  ? `Complete — ${evaluated} evaluated`
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
              className="h-full rounded-full bg-[#10B981] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </section>
    );
  }

  // 2. NẾU ĐANG CHỌN "ALL DEPARTMENTS" (Breakdown View)
  const lockedCount = ROUND_TRANSITION_DEPARTMENTS.filter((dept) => {
    const state = departmentStates.find((s) => s.department === dept);
    return state?.isRound1Locked;
  }).length;

  const isAllLocked = lockedCount === ROUND_TRANSITION_DEPARTMENTS.length;

  return (
    <section
      aria-label="Round 1 overall evaluation status"
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-start">
        {/* Cột trái: Tổng quan toàn bộ CLB */}
        <div className="w-full lg:max-w-md shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Round 1 Progress • All Departments
            </p>
            {isAllLocked ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                <i className="fa-solid fa-lock" /> All Locked
              </span>
            ) : isEvaluatedAll ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                <i className="fa-solid fa-unlock" /> Pending Locks
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
                ? `Complete — ${evaluated} evaluated`
                : isEvaluatedAll
                  ? `Evaluated — ${evaluated} candidates`
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
              className="h-full rounded-full bg-[#10B981] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Cột phải: Lưới trạng thái từng phòng ban */}
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
              // 1. TÌM TRẠNG THÁI KHÓA AN TOÀN
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
              const isDeptLocked = state?.isRound1Locked ?? false;

              // 2. TÌM SỐ LIỆU PROGRESS
              const deptStat = departmentStats.find((s) => {
                const cleanStatDept = s.department
                  .replace(' Department', '')
                  .trim()
                  .toLowerCase();
                return cleanStatDept === cleanTargetDept;
              });

              const deptEvaluated = deptStat?.evaluated ?? 0;
              const deptTotal = deptStat?.total ?? 0;

              const isEmpty = deptTotal === 0;
              const isDeptEvaluatedAll =
                !isEmpty && deptEvaluated === deptTotal;

              return (
                <div
                  key={dept}
                  className={`flex flex-col p-3 rounded-xl border transition-colors ${
                    isDeptLocked
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : isDeptEvaluatedAll
                        ? 'border-amber-200 bg-amber-50/50' // Highlight phòng ban quên khóa
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold truncate pr-2 ${
                        isDeptLocked
                          ? 'text-emerald-900'
                          : isDeptEvaluatedAll
                            ? 'text-amber-900'
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
                          : isDeptEvaluatedAll
                            ? 'text-amber-700'
                            : 'text-[#5E5E92]'
                      }`}
                    >
                      {isEmpty ? '0' : `${deptEvaluated} / ${deptTotal}`}
                    </span>

                    {/* BADGES CHO TỪNG CARD PHÒNG BAN */}
                    {isDeptLocked ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/50">
                        <i className="fa-solid fa-lock" /> Locked
                      </span>
                    ) : isEmpty ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-500 bg-gray-100">
                        Empty
                      </span>
                    ) : isDeptEvaluatedAll ? (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/50">
                        <i className="fa-solid fa-unlock" /> Pending
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

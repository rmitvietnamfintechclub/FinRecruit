'use client';

import { useState } from 'react';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import { useDepartmentStates } from '@/hooks/use-round-transition';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip } from '@/components/ui/Tooltip';

export type DepartmentProgress = {
  department: string;
  round1: {
    evaluated: number;
    total: number;
  };
  round2: {
    evaluated: number;
    total: number;
  };
};

interface DepartmentTransitionStripProps {
  isRecruitmentActive?: boolean;
  deptStats?: DepartmentProgress[];
}

export function DepartmentTransitionStrip({
  isRecruitmentActive = false,
  deptStats = [],
}: DepartmentTransitionStripProps) {
  const [selectedRound, setSelectedRound] = useState<'round1' | 'round2'>(
    'round1'
  );
  const states = useDepartmentStates();

  const totalDepts = HEAD_DEPARTMENTS.length;

  // 1. Tiến độ khóa Round 1
  const lockedR1Count = states.filter((s) => s.isRound1Locked).length;
  const isAllRound1Locked = totalDepts > 0 && lockedR1Count === totalDepts;
  const r1Percentage =
    totalDepts > 0 ? Math.round((lockedR1Count / totalDepts) * 100) : 0;

  // 2. Tiến độ khóa Round 2 (dựa vào cờ isRound2Locked)
  const lockedR2Count = states.filter(
    (s) => (s as { isRound2Locked?: boolean }).isRound2Locked
  ).length;
  const r2Percentage =
    totalDepts > 0 ? Math.round((lockedR2Count / totalDepts) * 100) : 0;

  const activeRound = isAllRound1Locked ? selectedRound : 'round1';

  const currentLockedCount =
    activeRound === 'round1' ? lockedR1Count : lockedR2Count;
  const currentPercentage =
    activeRound === 'round1' ? r1Percentage : r2Percentage;

  const progressColor =
    currentPercentage === 100
      ? 'from-emerald-400 to-green-500'
      : activeRound === 'round1'
        ? 'from-blue-500 to-indigo-600'
        : 'from-[#DCB968] to-amber-500';

  return (
    <Card className="rounded-[24px] shadow-sm border-gray-200 bg-white">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-black text-gray-900">
                Evaluation Status
              </CardTitle>
              {/* Segmented Switcher giữa Round 1 & Round 2 */}
              <div className="inline-flex items-center rounded-xl bg-gray-100 p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setSelectedRound('round1')}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                    activeRound === 'round1'
                      ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  )}
                >
                  Round 1
                </button>

                <Tooltip
                  side="top"
                  content={
                    !isAllRound1Locked ? (
                      <div className="space-y-1 text-center">
                        <p className="text-[11px] text-gray-200">
                          All {totalDepts} departments must lock Round 1
                          evaluations first.
                        </p>
                      </div>
                    ) : (
                      'Switch to Round 2 Interview Evaluation'
                    )
                  }
                >
                  <span className="inline-block">
                    <button
                      type="button"
                      disabled={!isAllRound1Locked}
                      onClick={() =>
                        isAllRound1Locked && setSelectedRound('round2')
                      }
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all',
                        activeRound === 'round2'
                          ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
                          : isAllRound1Locked
                            ? 'text-gray-500 hover:text-gray-900'
                            : 'text-gray-400 cursor-not-allowed opacity-50'
                      )}
                    >
                      {!isAllRound1Locked && (
                        <i className="fa-solid fa-lock text-[10px]" />
                      )}
                      <span>Round 2</span>
                    </button>
                  </span>
                </Tooltip>
              </div>
            </div>
            <CardDescription className="text-sm font-medium mt-1">
              {activeRound === 'round1'
                ? 'Review departments that have finalized and locked Round 1 candidate assessments.'
                : 'Review departments that have finalized and locked Round 2 interview evaluations.'}
            </CardDescription>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {currentLockedCount}{' '}
              <span className="text-gray-400 text-lg font-bold">
                / {totalDepts}
              </span>
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Locked
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Progress Bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full bg-linear-to-r transition-all duration-700 ease-out',
              progressColor,
              currentPercentage > 0 &&
                currentPercentage < 100 &&
                'after:absolute after:inset-0 after:animate-[shimmer_2s_infinite] after:bg-linear-to-r after:from-transparent after:via-white/20 after:to-transparent'
            )}
            style={{ width: `${currentPercentage}%` }}
          />
        </div>

        {/* 4 Cards hiển thị theo từng Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
          {HEAD_DEPARTMENTS.map((department) => {
            const stat = deptStats.find((s) => s.department === department);
            const deptState = states.find((s) => s.department === department);

            // LOGIC ROUND 1
            const isR1Locked = deptState?.isRound1Locked ?? false;
            const r1Data = stat?.round1 ?? { evaluated: 0, total: 0 };
            const isR1Pending =
              !isR1Locked &&
              !isRecruitmentActive &&
              r1Data.total > 0 &&
              r1Data.evaluated === r1Data.total;

            // LOGIC ROUND 2
            const isR2Locked =
              (deptState as { isRound2Locked?: boolean })?.isRound2Locked ??
              false;
            const r2Data = stat?.round2 ?? { evaluated: 0, total: 0 };
            const isR2Empty = r2Data.total === 0;
            const isR2Pending =
              !isR2Locked && !isR2Empty && r2Data.evaluated === r2Data.total;

            if (activeRound === 'round1') {
              return (
                <div
                  key={department}
                  className={cn(
                    'flex items-center justify-between w-full gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all duration-300 shadow-sm',
                    isR1Locked
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : isR1Pending
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                  )}
                >
                  <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <span className="truncate text-sm tracking-tighter">
                      {department}
                    </span>
                    <span className="text-[10px] font-medium opacity-70">
                      {r1Data.evaluated} / {r1Data.total}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'flex shrink-0 items-center justify-center rounded-full text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border',
                      isR1Locked
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isR1Pending
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                    )}
                  >
                    {isR1Locked ? (
                      <>
                        <i className="fa-solid fa-lock mr-1.5" /> Locked
                      </>
                    ) : isR1Pending ? (
                      <>
                        <i className="fa-solid fa-hourglass-half mr-1.5" />{' '}
                        Pending
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-1.5" />{' '}
                        Eval
                      </>
                    )}
                  </div>
                </div>
              );
            }

            // GIAO DIỆN ROUND 2: ĐẦY ĐỦ GRAD / PENDING / LOCKED
            return (
              <div
                key={department}
                className={cn(
                  'flex items-center justify-between w-full gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all duration-300 shadow-sm',
                  isR2Locked
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isR2Pending
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : isR2Empty
                        ? 'border-gray-200 bg-gray-50 text-gray-500'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                )}
              >
                <div className="flex flex-col min-w-0 flex-1 mr-2">
                  <span className="truncate text-sm tracking-tight">
                    {department}
                  </span>
                  <span className="text-[10px] font-medium opacity-70">
                    {r2Data.evaluated} / {r2Data.total}
                  </span>
                </div>

                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border',
                    isR2Locked
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isR2Pending
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : isR2Empty
                          ? 'bg-gray-100 text-gray-500 border-gray-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                  )}
                >
                  {isR2Locked ? (
                    <>
                      <i className="fa-solid fa-lock mr-1.5" /> Locked
                    </>
                  ) : isR2Pending ? (
                    <>
                      <i className="fa-solid fa-hourglass-half mr-1.5" />{' '}
                      Pending
                    </>
                  ) : isR2Empty ? (
                    'No Candidates'
                  ) : (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-1.5" /> Eval
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `,
        }}
      />
    </Card>
  );
}

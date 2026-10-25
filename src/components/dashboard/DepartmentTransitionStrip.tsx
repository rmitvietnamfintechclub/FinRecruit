'use client';

import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import { useDepartmentStates } from '@/hooks/use-round-transition';
import { lockedCount } from '@/lib/round-transition/reducer';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type DepartmentProgress = {
  department: string;
  evaluated: number;
  total: number;
};

interface DepartmentTransitionStripProps {
  isRecruitmentActive?: boolean;
  deptStats?: DepartmentProgress[];
}

export function DepartmentTransitionStrip({
  isRecruitmentActive = false,
  deptStats = [],
}: DepartmentTransitionStripProps) {
  const states = useDepartmentStates();
  const locked = lockedCount(states);
  const total = HEAD_DEPARTMENTS.length;
  const percentage = total > 0 ? Math.round((locked / total) * 100) : 0;

  const progressColor =
    percentage === 100
      ? 'from-emerald-400 to-green-500'
      : 'from-blue-400 to-indigo-500';

  return (
    <Card className="rounded-[24px] shadow-sm border-gray-200">
      <CardHeader className="pb-3 border-b border-gray-100/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-black text-gray-900">
              Round 1 Evaluation Status
            </CardTitle>
            <CardDescription className="text-sm font-medium mt-0.5">
              Departments that have finalized their Round 1 evaluation.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900 tracking-tight">
              {locked}{' '}
              <span className="text-gray-400 text-lg font-bold">/ {total}</span>
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Locked
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
          <div
            className={cn(
              'absolute left-0 top-0 h-full rounded-full bg-linear-to-r transition-all duration-1000 ease-out',
              progressColor,
              percentage > 0 &&
                percentage < 100 &&
                'after:absolute after:inset-0 after:animate-[shimmer_2s_infinite] after:bg-linear-to-r after:from-transparent after:via-white/20 after:to-transparent'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
          {HEAD_DEPARTMENTS.map((department) => {
            const isLocked =
              states.find((state) => state.department === department)
                ?.isRound1Locked ?? false;
            const stat = deptStats.find((s) => s.department === department);

            const isPendingLock =
              !isLocked &&
              !isRecruitmentActive &&
              stat &&
              stat.total > 0 &&
              stat.evaluated === stat.total;

            return (
              <div
                key={department}
                className={cn(
                  'flex items-center justify-between w-full gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all duration-300 shadow-sm',
                  isLocked
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isPendingLock
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                )}
              >
                <div className="flex flex-col min-w-0 flex-1 mr-2">
                  <span className="truncate text-sm tracking-tight">{department}</span>
                  {stat && (
                    <span className="text-[10px] font-medium opacity-70">
                      {stat.evaluated} / {stat.total}
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border',
                    isLocked
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isPendingLock
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                  )}
                >
                  {isLocked ? (
                    <>
                      <i className="fa-solid fa-lock mr-1.5" /> Locked
                    </>
                  ) : isPendingLock ? (
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

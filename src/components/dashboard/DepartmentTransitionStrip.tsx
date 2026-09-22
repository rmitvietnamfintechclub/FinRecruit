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

export function DepartmentTransitionStrip() {
  const states = useDepartmentStates();
  const locked = lockedCount(states);
  const total = HEAD_DEPARTMENTS.length;
  const percentage = total > 0 ? Math.round((locked / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Round 1 transition status</CardTitle>
        <CardDescription>
          Departments that have finalized their Round 1 evaluations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground text-lg font-black">
          {locked} / {total} departments locked
        </p>
        <div className="bg-muted h-2 w-full overflow-hidden rounded">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HEAD_DEPARTMENTS.map((department) => {
            const isLocked =
              states.find((state) => state.department === department)
                ?.isRound1Locked ?? false;
            return (
              <div
                key={department}
                className="border-border flex items-center justify-between gap-2 rounded-xl border p-4"
              >
                <span className="text-foreground truncate text-sm font-bold">
                  {department}
                </span>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
                    isLocked
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}
                >
                  {isLocked ? (
                    <i className="fa-solid fa-check" aria-hidden />
                  ) : (
                    <i className="fa-solid fa-clock" aria-hidden />
                  )}
                  {isLocked ? 'Locked' : 'In progress'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

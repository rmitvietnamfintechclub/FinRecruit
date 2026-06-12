'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppNotice } from '@/components/feedback/AppNotice';

type DashboardPayload = {
  success?: boolean;
  active?: {
    currentGeneration: string;
    currentSemester: string;
    isRecruitmentActive: boolean;
  };
  membersByDepartment?: Record<string, number>;
  waitingGuestCount?: number;
  message?: string;
};

const DEPT_SHORT: Record<(typeof HEAD_DEPARTMENTS)[number], string> = {
  'Technology Department': 'Technology',
  'Business Department': 'Business',
  'HR Department': 'HR',
  'Marketing Department': 'Marketing',
};

export function ExecutiveHomeClient() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/executive/dashboard', {
        credentials: 'include',
      });
      const json = (await res.json()) as DashboardPayload;
      if (!res.ok || !json.success) {
        setError(json.message ?? `Failed (${res.status})`);
        setData(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = data?.active;
  const recruitmentOn = Boolean(active?.isRecruitmentActive);

  return (
    <div className="space-y-8">
      {error ? (
        <AppNotice variant="error" onDismiss={() => setError(null)}>
          {error}
        </AppNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active cohort</CardTitle>
            <CardDescription>
              Generation and semester used for recruitment and new role grants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-muted/50 min-w-[140px] flex-1 rounded-xl px-4 py-3">
                    <p className="text-muted-foreground text-xs font-bold uppercase">
                      Generation
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {active?.currentGeneration ?? '—'}
                    </p>
                  </div>
                  <div className="bg-muted/50 min-w-[140px] flex-1 rounded-xl px-4 py-3">
                    <p className="text-muted-foreground text-xs font-bold uppercase">
                      Semester
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {active?.currentSemester ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-3 w-3 rounded-full ${recruitmentOn ? 'bg-green-500' : 'bg-red-500'}`}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold">
                    Recruitment:{' '}
                    <span
                      className={
                        recruitmentOn
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {recruitmentOn ? 'Open' : 'Closed'}
                    </span>
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending approval</CardTitle>
            <CardDescription>Guests in the waiting room</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-purple-600 dark:text-purple-400">
              {loading ? '—' : (data?.waitingGuestCount ?? 0)}
            </p>
            <Link
              href="/MasterViewDashboard/user-management"
              className="mt-3 inline-block text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              Open user management →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heads by department</CardTitle>
          <CardDescription>
            Active Department Head accounts per department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {HEAD_DEPARTMENTS.map((dept) => (
              <div
                key={dept}
                className="border-border rounded-xl border bg-muted/30 px-4 py-4 text-center"
              >
                <p className="text-muted-foreground text-xs font-bold uppercase">
                  {DEPT_SHORT[dept]}
                </p>
                <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">
                  {loading ? '—' : (data?.membersByDepartment?.[dept] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/MasterViewDashboard/candidates"
          className="border-border bg-card hover:border-blue-400 flex flex-col rounded-2xl border p-6 shadow-sm transition-colors"
        >
          <i className="fa-solid fa-users mb-3 text-2xl text-blue-600" />
          <span className="font-black">Candidates</span>
          <span className="text-muted-foreground mt-1 text-sm">
            Statistics, table, and Excel export
          </span>
        </Link>
        <Link
          href="/MasterViewDashboard/user-management"
          className="border-border bg-card hover:border-purple-400 flex flex-col rounded-2xl border p-6 shadow-sm transition-colors"
        >
          <i className="fa-solid fa-user-gear mb-3 text-2xl text-purple-600" />
          <span className="font-black">User management</span>
          <span className="text-muted-foreground mt-1 text-sm">
            Grant Head or Executive roles
          </span>
        </Link>
        <Link
          href="/MasterViewDashboard/system-config"
          className="border-border bg-card hover:border-emerald-400 flex flex-col rounded-2xl border p-6 shadow-sm transition-colors"
        >
          <i className="fa-solid fa-sliders mb-3 text-2xl text-emerald-600" />
          <span className="font-black">System Config</span>
          <span className="text-muted-foreground mt-1 text-sm">
            Generation, semester, recruitment toggle
          </span>
        </Link>
      </div>
    </div>
  );
}

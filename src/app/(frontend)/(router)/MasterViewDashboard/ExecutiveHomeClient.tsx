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

type HeadAccount = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
};

type DashboardPayload = {
  success?: boolean;
  active?: {
    currentGeneration: string;
    currentSemester: string;
    isRecruitmentActive: boolean;
  };
  headsByDepartment?: Record<string, HeadAccount[]>;
  waitingGuestCount?: number;
  message?: string;
};

const DEPT_SHORT: Record<(typeof HEAD_DEPARTMENTS)[number], string> = {
  'Technology Department': 'Technology',
  'Business Department': 'Business',
  'HR Department': 'HR',
  'Marketing Department': 'Marketing',
};

const DEPT_ACCENT: Record<
  (typeof HEAD_DEPARTMENTS)[number],
  { dot: string; ring: string; bg: string }
> = {
  'Technology Department': {
    dot: 'bg-blue-500',
    ring: 'ring-blue-200 dark:ring-blue-900/50',
    bg: 'from-blue-50/50 to-transparent dark:from-blue-950/20',
  },
  'Business Department': {
    dot: 'bg-amber-500',
    ring: 'ring-amber-200 dark:ring-amber-900/50',
    bg: 'from-amber-50/50 to-transparent dark:from-amber-950/20',
  },
  'HR Department': {
    dot: 'bg-pink-500',
    ring: 'ring-pink-200 dark:ring-pink-900/50',
    bg: 'from-pink-50/50 to-transparent dark:from-pink-950/20',
  },
  'Marketing Department': {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-200 dark:ring-emerald-900/50',
    bg: 'from-emerald-50/50 to-transparent dark:from-emerald-950/20',
  },
};

function HeadAvatar({
  head,
  className = '',
}: {
  head: HeadAccount;
  className?: string;
}) {
  const initial =
    (head.name?.trim()?.[0] ?? head.email?.[0] ?? '?').toUpperCase();

  if (head.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic OAuth URLs
      <img
        src={head.avatar}
        alt={head.name ?? head.email}
        className={`size-16 shrink-0 rounded-full border border-border object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xl font-bold text-muted-foreground shadow-sm ${className}`}
    >
      {initial}
    </div>
  );
}

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {HEAD_DEPARTMENTS.map((dept) => {
              const accent = DEPT_ACCENT[dept];
              const heads = data?.headsByDepartment?.[dept] ?? [];
              return (
                <div
                  key={dept}
                  className={`border-border relative overflow-hidden rounded-2xl border bg-linear-to-br ${accent.bg} p-5`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${accent.dot}`}
                      aria-hidden
                    />
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      {DEPT_SHORT[dept]}
                    </p>
                    <span className="ml-auto text-xs font-semibold text-muted-foreground">
                      {loading ? '—' : `${heads.length} head${heads.length === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {loading ? (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="size-16 shrink-0 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ) : heads.length === 0 ? (
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        className={`flex size-16 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/40 text-xl text-muted-foreground`}
                      >
                        <i className="fa-solid fa-user-slash" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-muted-foreground">
                          No active head
                        </p>
                        <Link
                          href="/MasterViewDashboard/user-management"
                          className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Grant a head →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {heads.map((h) => (
                        <li key={h.id} className="flex items-center gap-3">
                          <HeadAvatar
                            head={h}
                            className={`ring-2 ring-offset-2 ring-offset-card ${accent.ring}`}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-foreground">
                              {h.name?.trim() || h.email.split('@')[0]}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {h.email}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Link
          href="/MasterViewDashboard/system-logs"
          className="border-border bg-card hover:border-amber-400 flex flex-col rounded-2xl border p-6 shadow-sm transition-colors"
        >
          <i className="fa-solid fa-clipboard-list mb-3 text-2xl text-amber-600" />
          <span className="font-black">System Logs</span>
          <span className="text-muted-foreground mt-1 text-sm">
            Audit trail · role grants, failed intakes, config changes
          </span>
        </Link>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
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
import { DepartmentTransitionStrip } from '@/components/dashboard/DepartmentTransitionStrip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

// --- TYPES ---
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
  membersCountByDepartment?: Record<string, number>;
};

type StatusCount = {
  total: number;
  pass: number;
  fail: number;
  pending: number;
};

type StatisticsPayload = {
  success?: boolean;
  data?: {
    overall: StatusCount;
  };
};

type DepartmentProgress = {
  department: string;
  evaluated: number;
  total: number;
};

// --- UI CONFIG ---
const DEPT_UI: Record<
  (typeof HEAD_DEPARTMENTS)[number],
  { bg: string; text: string; icon: string }
> = {
  'Technology Department': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: 'fa-microchip',
  },
  'Business Department': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: 'fa-briefcase',
  },
  'HR Department': {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    icon: 'fa-users',
  },
  'Marketing Department': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: 'fa-bullhorn',
  },
};

// --- COMPONENTS ---
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AnimatedNumber = ({ value }: { value: number }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [direction, setDirection] = useState(1);

  if (value !== prevValue) {
    setDirection(value > prevValue ? 1 : -1);
    setPrevValue(value);
  }

  return (
    <>
      <style>{`
        @keyframes slideInUpFade { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes slideInDownFade { 0% { opacity: 0; transform: translateY(-15px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-number-up { animation: slideInUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-number-down { animation: slideInDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      <span
        key={value}
        className={`inline-block ${direction === 1 ? 'animate-number-up' : 'animate-number-down'}`}
      >
        {value}
      </span>
    </>
  );
};

// --- MAIN PAGE ---
export function ExecutiveHomeClient() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [stats, setStats] = useState<StatisticsPayload['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deptStats, setDeptStats] = useState<DepartmentProgress[]>([]);

  const { triggerSessionExpired } = useSessionExpired();

  const fetchCounts = useCallback(async (deptName: string | null) => {
    const dParam = deptName
      ? `department=${encodeURIComponent(deptName)}&`
      : '';
    const base = '/api/executive/candidates';

    try {
      const [rAll, rP] = await Promise.all([
        fetch(`${base}?${dParam}limit=1`, { credentials: 'include' }),
        fetch(`${base}?${dParam}status=Pending&limit=1`, {
          credentials: 'include',
        }),
      ]);

      const [jAll, jP] = await Promise.all([
        rAll.json().catch(() => ({})),
        rP.json().catch(() => ({})),
      ]);

      return {
        total: jAll.data?.count ?? 0,
        pending: jP.data?.count ?? 0,
      };
    } catch {
      return { total: 0, pending: 0 };
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [dashRes, statsRes, breakdownData] = await Promise.all([
        fetch('/api/executive/dashboard', { credentials: 'include' }),
        fetch('/api/executive/statistics', { credentials: 'include' }),
        // Lấy số liệu đếm của cả 4 phòng ban
        Promise.all(
          HEAD_DEPARTMENTS.map(async (d) => {
            const c = await fetchCounts(d);
            return {
              department: d,
              total: c.total,
              evaluated: Math.max(c.total - c.pending, 0),
            };
          })
        ),
      ]);

      const dashJson = (await dashRes.json()) as DashboardPayload;
      const statsJson = (await statsRes.json()) as StatisticsPayload;

      if (!dashRes.ok || !dashJson.success)
        throw new Error(
          dashJson.message ?? `Dashboard failed (${dashRes.status})`
        );
      if (!statsRes.ok || !statsJson.success)
        throw new Error('Statistics failed to load.');

      setDashboard(dashJson);
      setStats(statsJson.data ?? null);
      setDeptStats(breakdownData);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to load executive overview.';

      if (
        errorMessage.toLowerCase().includes('authentication required') ||
        errorMessage.includes('401')
      ) {
        triggerSessionExpired();
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [triggerSessionExpired, fetchCounts]);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const active = dashboard?.active;
  const recruitmentOn = Boolean(active?.isRecruitmentActive);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const overallStats = stats?.overall ?? {
    total: 0,
    pass: 0,
    fail: 0,
    pending: 0,
  };

  const hasPendingGuests = (dashboard?.waitingGuestCount ?? 0) > 0;
  const departmentsMissingHeads = HEAD_DEPARTMENTS.filter(
    (dept) => (dashboard?.headsByDepartment?.[dept]?.length ?? 0) === 0
  );

  // Biến điều kiện để tự động gập/mở Roster
  const showNeedsAttention =
    loading || hasPendingGuests || departmentsMissingHeads.length > 0;

  return (
    <div className="space-y-6 mt-4 animate-in fade-in duration-500 pb-6">
      {error && (
        <AppNotice variant="error" onDismiss={() => setError(null)}>
          {error}
        </AppNotice>
      )}

      {/* 1. HERO SECTION: ACTIVE PERIOD */}
      <section className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-white p-8 shadow-sm">
        <div className="absolute -right-20 -top-20 z-0 h-64 w-64 rounded-full bg-linear-to-br from-[#DCB968]/20 to-[#0D1742]/5 opacity-50 blur-3xl"></div>
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFEFCA] text-[#A28436] shadow-sm">
              <i className="fa-solid fa-bullseye text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#A28436]">
                Active Period
              </p>
              <h3 className="text-3xl font-black text-[#0D1742] mt-1">
                {loading ? (
                  <span className="opacity-50">Loading...</span>
                ) : (
                  <>
                    {active?.currentGeneration || '—'}{' '}
                    <span className="text-[#5E5E92] font-medium mx-1">/</span>{' '}
                    {active?.currentSemester || '—'}
                  </>
                )}
              </h3>
              <p className="text-sm font-medium text-[#5E5E92] mt-1">
                New form submissions and role assignments are mapped to this
                period.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-gray-50 p-5 border border-gray-100">
            <div className="sm:text-right">
              <p className="text-sm font-bold text-[#0D1742]">
                Recruitment Form
              </p>
              <p
                className={cn(
                  'text-xs font-semibold mt-0.5',
                  recruitmentOn ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {recruitmentOn ? 'Accepting Responses' : 'Form Closed'}
              </p>
            </div>
            <div className="flex items-center justify-center size-8 rounded-full bg-white shadow-sm border border-gray-200">
              <span
                className={cn(
                  'size-3 rounded-full',
                  recruitmentOn ? 'bg-emerald-500' : 'bg-red-500'
                )}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 3. DEPARTMENT ROSTER (RÕ TÊN HEAD + SỐ MEMBER) */}
        <Card
          className={`rounded-[24px] shadow-sm transition-all duration-500 ${showNeedsAttention ? 'lg:col-span-2' : 'lg:col-span-3'}`}
        >
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-black text-gray-900">
              Department Roster
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Leadership and member capacity per department.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <ul className="divide-y divide-gray-100">
                {[1, 2, 3, 4].map((i) => (
                  <li
                    key={i}
                    className="flex justify-between items-start gap-4 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <Skeleton className="size-10 rounded-lg mt-1" />
                      <div className="space-y-2 mt-1.5">
                        <Skeleton className="h-4 w-32" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="size-5 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-md mt-1" />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-gray-100">
                {HEAD_DEPARTMENTS.map((dept) => {
                  const heads = dashboard?.headsByDepartment?.[dept] ?? [];
                  const membersCount =
                    dashboard?.membersCountByDepartment?.[dept] ?? 0;
                  const ui = DEPT_UI[dept];

                  return (
                    <li
                      key={dept}
                      className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-lg mt-1 ${ui.bg} ${ui.text}`}
                        >
                          <i className={`fa-solid ${ui.icon}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">
                            {dept}
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {heads.length === 0 ? (
                              <p className="text-xs font-bold text-[#B82649]">
                                <i className="fa-solid fa-triangle-exclamation mr-1" />{' '}
                                No active head assigned
                              </p>
                            ) : (
                              heads.map((h) => (
                                <div
                                  key={h.id}
                                  className="flex items-center gap-2"
                                >
                                  <div className="size-5 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                    {h.avatar ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={h.avatar}
                                        alt="avatar"
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center bg-[#0D1742]/10 text-[8px] font-bold text-[#0D1742]">
                                        {(
                                          h.name?.trim()?.[0] ??
                                          h.email?.[0] ??
                                          '?'
                                        ).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-gray-700 truncate">
                                    {h.name?.trim() || h.email.split('@')[0]}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-14 sm:pl-0 sm:pt-1">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {membersCount} Members
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 4. ACTION CENTER (CHỈ HIỆN KHI CẦN THIẾT) */}
        {showNeedsAttention && (
          <div className="space-y-6">
            <Card className="rounded-[24px] shadow-sm bg-[#0D1742] text-white border-transparent">
              <CardHeader className="pb-2 border-b border-white/10">
                <CardTitle className="text-sm font-bold text-[#DCB968] uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-bolt" /> Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-0 p-0">
                {loading ? (
                  <div className="py-8 px-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-12 bg-white/20" />
                        <Skeleton className="h-3 w-24 bg-white/20" />
                      </div>
                      <Skeleton className="size-8 rounded-full bg-white/20" />
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {hasPendingGuests && (
                      <Link
                        href="/MasterViewDashboard/user-management"
                        className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors group"
                      >
                        <div>
                          <p className="text-2xl font-black text-white">
                            {dashboard?.waitingGuestCount}
                          </p>
                          <p className="text-xs font-medium text-gray-300 mt-0.5">
                            Pending Guests
                          </p>
                        </div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DCB968] text-[#0D1742] group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-arrow-right text-xs" />
                        </div>
                      </Link>
                    )}
                    {departmentsMissingHeads.length > 0 && (
                      <Link
                        href="/MasterViewDashboard/user-management"
                        className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors group"
                      >
                        <div>
                          <p className="text-2xl font-black text-red-400">
                            {departmentsMissingHeads.length}
                          </p>
                          <p className="text-xs font-medium text-gray-300 mt-0.5">
                            Missing Heads
                          </p>
                        </div>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-400 text-red-950 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-arrow-right text-xs" />
                        </div>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 5. STAGE GATES / TRANSITION STRIP (FULL WIDTH Ở CUỐI) */}
      <div className="pt-2">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.15em] text-gray-400 pl-2">
          Round Transitions
        </h2>
        <DepartmentTransitionStrip
          isRecruitmentActive={active?.isRecruitmentActive ?? false}
          deptStats={deptStats}
        />
      </div>
    </div>
  );
}

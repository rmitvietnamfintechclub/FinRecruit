'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CandidateTable, {
  type CandidateViewMode,
} from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import { AppNotice } from '@/components/feedback/AppNotice';
import { CohortBanner } from '@/components/feedback/CohortBanner';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';
import type { DepartmentType } from '@/app/(backend)/types';
import {
  findDepartmentState,
  ROUND_TRANSITION_DEPARTMENTS,
} from '@/lib/round-transition/reducer';
import { useDepartmentStates } from '@/hooks/use-round-transition';
import {
  RoundModeTabs,
  type RoundMode,
} from '@/components/member-dashboard/RoundModeTabs';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

// IMPORT COMPONENT VỪA TẠO VÀO ĐÂY
import { RoundTransitionBar } from '@/components/member-dashboard/RoundTransitionBar';

const PAGE_SIZE = 12;

const AnimatedNumber = ({ value }: { value: number }) => {
  return (
    <>
      <style>{`
        @keyframes slideInUpFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-number-up { animation: slideInUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      <span key={value} className="inline-block animate-number-up">
        {value}
      </span>
    </>
  );
};

type ActiveCohort = {
  generation: string;
  semester: string;
  isRecruitmentActive: boolean;
};

type ListApiResponse = {
  success: boolean;
  message?: string;
  candidates?: HeadDashboardListCandidate[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    emptyState?: string | null;
    activeCohort?: ActiveCohort;
    filters?: { status?: string | null; department?: string };
  };
};

export default function MemberDashboardClient() {
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>(
    []
  );
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listEmptyHint, setListEmptyHint] = useState<string | null>(null);
  const [activeCohort, setActiveCohort] = useState<ActiveCohort | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<string | null>(
    null
  );

  const [mode, setMode] = useState<RoundMode>('round1');
  const [viewMode, setViewMode] = useState<CandidateViewMode>('list');
  const [newCandidateNotice, setNewCandidateNotice] = useState(false);

  const prevListTotalRef = useRef<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);

  const departmentStates = useDepartmentStates();
  const { triggerSessionExpired } = useSessionExpired();

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const headDepartment: DepartmentType | null =
    assignedDepartment &&
    ROUND_TRANSITION_DEPARTMENTS.includes(assignedDepartment as DepartmentType)
      ? (assignedDepartment as DepartmentType)
      : null;

  // Lấy trạng thái khóa Vòng 1 từ Head
  const isRound1Locked = headDepartment
    ? (findDepartmentState(departmentStates, headDepartment)?.isRound1Locked ??
      false)
    : false;

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    passed: 0,
    failed: 0,
  });

  const refreshStats = useCallback(async () => {
    const base = '/api/member-dashboard/candidates';
    try {
      const [rAll, rP, rPa, rF] = await Promise.all([
        fetch(`${base}?limit=1`, { credentials: 'include' }),
        fetch(`${base}?status=Pending&limit=1`, { credentials: 'include' }),
        fetch(`${base}?status=Pass&limit=1`, { credentials: 'include' }),
        fetch(`${base}?status=Fail&limit=1`, { credentials: 'include' }),
      ]);
      const [jAll, jP, jPa, jF] = (await Promise.all([
        rAll.json(),
        rP.json(),
        rPa.json(),
        rF.json(),
      ])) as ListApiResponse[];
      if (!rAll.ok || !jAll.success) return;
      setStats({
        total: jAll.meta?.total ?? 0,
        pending: rP.ok && jP.success ? (jP.meta?.total ?? 0) : 0,
        passed: rPa.ok && jPa.success ? (jPa.meta?.total ?? 0) : 0,
        failed: rF.ok && jF.success ? (jF.meta?.total ?? 0) : 0,
      });
    } catch {}
  }, []);

  const loadList = useCallback(
    async (
      pageNum: number,
      append: boolean,
      options?: { isPoll?: boolean }
    ) => {
      if (pageNum === 1 && !append && !options?.isPoll) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const fetchLimit = options?.isPoll
          ? pageRef.current * PAGE_SIZE
          : PAGE_SIZE;
        const fetchPage = options?.isPoll ? 1 : pageNum;

        params.set('limit', String(fetchLimit));
        params.set('page', String(fetchPage));
        if (statusFilter !== 'All') params.set('status', statusFilter);
        const q = searchQuery.trim();
        if (q) params.set('search', q);

        const res = await fetch(`/api/member-dashboard/candidates?${params}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as ListApiResponse;

        if (!res.ok || !json.success) {
          if (!options?.isPoll) {
            setError(json.message ?? `Request failed (${res.status})`);
            if (!append) {
              setCandidates([]);
              setListEmptyHint(null);
            }
          }
          return;
        }

        const rows = json.candidates ?? [];
        const total = json.meta?.total ?? 0;

        if (options?.isPoll) {
          if (
            prevListTotalRef.current !== null &&
            total > prevListTotalRef.current
          ) {
            setNewCandidateNotice(true);
          }
          prevListTotalRef.current = total;
          setCandidates(rows);
          setListEmptyHint(
            rows.length === 0 ? (json.meta?.emptyState ?? null) : null
          );
        } else if (pageNum === 1 && !append) {
          prevListTotalRef.current = total;
          setCandidates(rows);
          setPage(1);
          setHasMore((json.meta?.totalPages ?? 0) > 1);
          setListEmptyHint(
            rows.length === 0 ? (json.meta?.emptyState ?? null) : null
          );
        } else if (append && pageNum > 1) {
          setCandidates((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newRows = rows.filter((r) => !existingIds.has(r.id));
            return [...prev, ...newRows];
          });
          setHasMore(pageNum < (json.meta?.totalPages ?? 0));
          setPage(pageNum);
        }

        if (json.meta?.activeCohort) setActiveCohort(json.meta.activeCohort);
        if (json.meta?.filters?.department)
          setAssignedDepartment(json.meta.filters.department);
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'Failed to load candidates.';
        if (
          errorMessage.toLowerCase().includes('authentication required') ||
          errorMessage.includes('401')
        ) {
          triggerSessionExpired();
          return;
        }
        if (!options?.isPoll) {
          setError(errorMessage);
          if (!append) setCandidates([]);
        }
      } finally {
        if (!options?.isPoll) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [statusFilter, searchQuery, triggerSessionExpired]
  );

  useEffect(() => {
    void loadList(1, false);
  }, [loadList]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const pollDashboard = useCallback(() => {
    void loadList(1, false, { isPoll: true });
    void refreshStats();
  }, [loadList, refreshStats]);

  useIntervalWhenVisible(pollDashboard, { enabled: !loading && !loadingMore });

  // Xử lý Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loading &&
          mode === 'round1'
        ) {
          void loadList(page + 1, true);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, loadList, mode]);

  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  const evaluatedCount = Math.max(stats.total - stats.pending, 0);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative space-y-6">
        {error && (
          <AppNotice
            variant="error"
            title="Could not load data"
            onDismiss={() => setError(null)}
            action={
              <button
                type="button"
                onClick={() => void loadList(1, false)}
                className="rounded-lg bg-[#B82649]/10 px-3 py-1.5 text-sm font-semibold text-[#B82649] hover:bg-[#B82649]/20"
              >
                Retry
              </button>
            }
          >
            {error}
          </AppNotice>
        )}

        {newCandidateNotice && (
          <AppNotice
            variant="info"
            title="New application received"
            onDismiss={() => setNewCandidateNotice(false)}
          >
            A new candidate has been added to your list.
          </AppNotice>
        )}

        {/* 1. Round Toggle */}
        {headDepartment || loading ? (
          <RoundModeTabs
            mode={mode}
            isLocked={isRound1Locked}
            isLoading={!headDepartment && loading}
            onChange={setMode}
          />
        ) : null}

        {/* 2. Cohort Banner */}
        <CohortBanner
          cohort={activeCohort}
          variant="default"
          scopeLabel={assignedDepartment ? `${assignedDepartment}` : undefined}
          mode={mode}
          isRound1Locked={isRound1Locked}
        />

        {/* 3. Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0EDFF] text-[#2C305F]">
              <i className="fa-solid fa-user-group text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2C305F]">
                Total
              </p>
              <p className="text-3xl font-black text-[#0D1742]">
                <AnimatedNumber value={stats.total} />
              </p>
              <p className="text-xs font-semibold text-[#5E5E92]">Applicants</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFEFCA] text-[#A28436]">
              <i className="fa-regular fa-clock text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A28436]">
                Pending
              </p>
              <p className="text-3xl font-black text-[#A28436]">
                <AnimatedNumber value={stats.pending} />
              </p>
              <p className="text-xs font-semibold text-[#A28436]/70">
                In Review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <i className="fa-solid fa-check text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Passed
              </p>
              <p className="text-3xl font-black text-emerald-600">
                <AnimatedNumber value={stats.passed} />
              </p>
              <p className="text-xs font-semibold text-emerald-600/70">
                Qualified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#B82649]/10 text-[#B82649]">
              <i className="fa-solid fa-xmark text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#B82649]">
                Failed
              </p>
              <p className="text-3xl font-black text-[#B82649]">
                <AnimatedNumber value={stats.failed} />
              </p>
              <p className="text-xs font-semibold text-[#B82649]/70">
                Rejected
              </p>
            </div>
          </div>
        </div>

        {/* KHÔNG RENDER VÒNG 1 KHI ĐANG Ở TAB VÒNG 2 */}
        {mode === 'round1' && (
          <>
            {/* 4. Filter / Action Bar */}
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full overflow-x-auto rounded-xl bg-gray-100 p-1 sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option);
                      setPage(1);
                    }}
                    className={`shrink-0 rounded-lg px-6 py-2 text-sm font-bold transition-all ${
                      statusFilter === option
                        ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
                        : 'text-gray-500 hover:text-[#0D1742]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full shrink-0 sm:w-72 lg:w-64 xl:w-72">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by sID or name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-11 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/50 focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] focus:outline-none"
                  />
                </div>

                <div className="flex rounded-xl bg-gray-100 p-1 shrink-0">
                  <Tooltip content="Grid View">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
                          : 'text-gray-500 hover:text-[#0D1742]'
                      }`}
                    >
                      <i className="fa-solid fa-grip" />
                    </button>
                  </Tooltip>
                  <Tooltip content="List View">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
                        viewMode === 'list'
                          ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
                          : 'text-gray-500 hover:text-[#0D1742]'
                      }`}
                    >
                      <i className="fa-solid fa-list" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* 5. Read-Only Progress Bar TÁCH COMPONENT MỚI */}
            <div className="relative mt-4">
              {(headDepartment || loading) && (
                <RoundTransitionBar
                  department={headDepartment ?? 'Loading...'}
                  evaluated={evaluatedCount}
                  total={stats.total}
                  isLocked={isRound1Locked}
                  isRecruitmentActive={
                    activeCohort?.isRecruitmentActive ?? false
                  }
                  isLoading={loading} 
                />
              )}

              {/* 6. Candidate Table */}
              {loading && !error && candidates.length === 0 ? (
                <div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center shadow-sm py-20">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-[#DCB968]" />
                  <p className="mt-4 text-sm font-bold text-[#0D1742]">
                    Loading candidates…
                  </p>
                </div>
              ) : (
                <div className="transition-opacity duration-300 opacity-100">
                  {candidates.length > 0 ? (
                    <>
                      <CandidateTable
                        candidates={candidates}
                        onUpdateStatus={() => {}}
                        viewMode={viewMode}
                        readOnly={true}
                        detailApi="member-dashboard"
                      />

                      {hasMore && (
                        <div
                          ref={observerTarget}
                          className="mt-6 flex justify-center py-6"
                        >
                          {loadingMore ? (
                            <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-2.5 shadow-sm">
                              <i className="fa-solid fa-spinner fa-spin text-[#DCB968]" />
                              <span className="text-xs font-bold text-[#0D1742]">
                                Loading more candidates...
                              </span>
                            </div>
                          ) : (
                            <div className="h-4 w-full" aria-hidden="true" />
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-sm">
                      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-gray-50">
                        <i className="fa-solid fa-folder-open text-3xl text-gray-400" />
                      </div>
                      <p className="text-xl font-black text-[#0D1742]">
                        No candidates found
                      </p>
                      <p className="mt-2 text-sm font-medium text-gray-500">
                        {listEmptyHint ??
                          'Try adjusting your search or filter settings.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* KHU VỰC VÒNG 2 */}
        {mode === 'round2' && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-sm">
              <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-blue-50">
                <i className="fa-solid fa-person-chalkboard text-3xl text-blue-500" />
              </div>
              <p className="text-xl font-black text-[#0D1742]">
                Round 2 Interview Area
              </p>
              <p className="mt-2 max-w-sm text-sm font-medium text-gray-500">
                The interview assessment tools for Members are coming soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

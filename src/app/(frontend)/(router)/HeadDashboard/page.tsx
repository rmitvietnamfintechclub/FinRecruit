'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CandidateTable, {
  type CandidateViewMode,
} from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import {
  patchCandidateStatus,
  type DashboardStatus,
  type ReroutePreview,
} from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';
import { AppNotice } from '@/components/feedback/AppNotice';
import { CohortBanner } from '@/components/feedback/CohortBanner';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';
import type { DepartmentType } from '@/app/(backend)/types';
import {
  findDepartmentState,
  ROUND_TRANSITION_DEPARTMENTS,
} from '@/lib/round-transition/reducer';
import {
  useDepartmentStates,
  useLockRound1,
} from '@/hooks/use-round-transition';
import {
  RoundModeTabs,
  type RoundMode,
} from '@/components/head-dashboard/RoundModeTabs';
import { RoundTransitionBar } from '@/components/head-dashboard/RoundTransitionBar';
import type { LockRound1Result } from '@/types/roundTransition';
import { HeadRound2SubNav } from './HeadDashboardShell';
import { HeadDashboardDialogs } from '@/components/head-dashboard/HeadDashboardDialogs';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

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
    filters?: {
      status?: string | null;
      department?: string;
    };
  };
};

export default function HeadDashboardPage() {
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>(
    []
  );
  const [statusFilter, setStatusFilter] = useState('All');
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
  const [round2Candidates, setRound2Candidates] = useState<
    HeadDashboardListCandidate[]
  >([]);
  const [round2Loading, setRound2Loading] = useState(false);
  const [round2Error, setRound2Error] = useState<string | null>(null);
  const departmentStates = useDepartmentStates();
  const { lock, pending: locking } = useLockRound1();

  const { triggerSessionExpired } = useSessionExpired();

  const observerTarget = useRef<HTMLDivElement>(null);

  const pageRef = useRef(1);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const headDepartment: DepartmentType | null =
    assignedDepartment &&
    ROUND_TRANSITION_DEPARTMENTS.includes(assignedDepartment as DepartmentType)
      ? (assignedDepartment as DepartmentType)
      : null;

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

  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    name: string;
    newStatus: DashboardStatus;
  } | null>(null);

  const [viewMode, setViewMode] = useState<CandidateViewMode>('list');
  const [patching, setPatching] = useState(false);
  const [patchNotice, setPatchNotice] = useState<string | null>(null);
  const [rerouteConfirm, setRerouteConfirm] = useState<{
    id: string;
    name: string;
    message: string;
    preview?: ReroutePreview;
  } | null>(null);
  const [newCandidateNotice, setNewCandidateNotice] = useState(false);
  const prevListTotalRef = useRef<number | null>(null);
  const [isLockingRound2, setIsLockingRound2] = useState(false);
  const [round2Locked, setRound2Locked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockSuccess, setLockSuccess] = useState(false);

  const [round2ConfirmAction, setRound2ConfirmAction] = useState<
    'lock' | 'unlock' | null
  >(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchRound2LockStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/head-dashboard/round2-status', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) return;
      setRound2Locked(data.isRound2Locked);
    } catch {}
  }, []);

  const handleLockRound2 = async () => {
    if (statsDisplay.pending > 0 || isLockingRound2) return;
    try {
      setIsLockingRound2(true);
      setLockError(null);
      const res = await fetch('/api/head-dashboard/lock-round-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to lock Round 2.');
      setRound2Locked(true);
      setRound2ConfirmAction(null);
    } catch (error) {
      setLockError(
        error instanceof Error ? error.message : 'Failed to lock Round 2.'
      );
    } finally {
      setIsLockingRound2(false);
    }
  };

  const handleUnlockRound2 = async () => {
    if (isLockingRound2) return;
    try {
      setIsLockingRound2(true);
      setLockError(null);
      const res = await fetch('/api/head-dashboard/lock-round-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to unlock Round 2.');
      setRound2Locked(false);
      setRound2ConfirmAction(null);
    } catch (error) {
      setLockError(
        error instanceof Error ? error.message : 'Failed to unlock Round 2.'
      );
    } finally {
      setIsLockingRound2(false);
    }
  };

  const handleExportExcel = async (round: 1 | 2, status: 'Pass' | 'Fail') => {
    if (exporting || !headDepartment) return;
    try {
      setExporting(true);
      setExportOpen(false);

      const endpoint =
        round === 1
          ? `/api/head-dashboard/export/round-1?status=${status}&department=${encodeURIComponent(headDepartment)}`
          : `/api/head-dashboard/export/round-2?status=${status}&department=${encodeURIComponent(headDepartment)}`;

      const res = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to export Excel file.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      link.download =
        round === 1
          ? `${headDepartment}_Round_1_${status}_List.xlsx`
          : `${headDepartment}_Round_2_Final_${status}_List.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to export Excel file.'
      );
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    void fetchRound2LockStatus();
  }, [fetchRound2LockStatus]);

  const refreshStats = useCallback(async () => {
    const base = '/api/head-dashboard/candidates';
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

        const res = await fetch(`/api/head-dashboard/candidates?${params}`, {
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
    [statusFilter, triggerSessionExpired]
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

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, loadList, mode]);

  const loadRound2 = useCallback(async () => {
    setRound2Loading(true);
    setRound2Error(null);
    try {
      const params = new URLSearchParams({
        status: 'Pass',
        page: '1',
        limit: '100',
      });
      const res = await fetch(`/api/head-dashboard/candidates?${params}`, {
        credentials: 'include',
      });
      const json = (await res.json()) as ListApiResponse;
      if (!res.ok || !json.success) {
        setRound2Candidates([]);
        setRound2Error(json.message ?? `Request failed (${res.status})`);
        return;
      }
      setRound2Candidates(json.candidates ?? []);
      setRound2Error(null);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to load the Round 2 pool.';

      if (
        errorMessage.toLowerCase().includes('authentication required') ||
        errorMessage.includes('401')
      ) {
        triggerSessionExpired();
        return;
      }

      setRound2Candidates([]);
      setRound2Error(errorMessage);
    } finally {
      setRound2Loading(false);
    }
  }, [triggerSessionExpired]);

  const handleLockRound1 = useCallback(async (): Promise<LockRound1Result> => {
    if (!headDepartment) {
      return { success: false, message: 'No department assignment found.' };
    }

    const result = await lock(headDepartment);

    if (result.success) {
      await Promise.all([loadList(1, false), refreshStats()]);
      setLockSuccess(true);
    }

    return result;
  }, [headDepartment, lock, loadList, refreshStats]);

  useEffect(() => {
    if (isRound1Locked && mode === 'round2') void loadRound2();
  }, [isRound1Locked, mode, loadRound2]);

  useIntervalWhenVisible(pollDashboard, {
    enabled: !loading && !loadingMore && !patching,
  });

  const handleUpdateStatusRequest = (
    id: string,
    newStatus: DashboardStatus
  ) => {
    const candidate = candidates.find((c) => c.id === id);
    if (candidate)
      setConfirmAction({ id, name: candidate.fullName, newStatus });
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    setPatching(true);
    setPatchNotice(null);
    try {
      const result = await patchCandidateStatus(
        confirmAction.id,
        confirmAction.newStatus
      );
      if (!result.ok) {
        if ('needsRerouteConfirm' in result && result.needsRerouteConfirm) {
          setRerouteConfirm({
            id: confirmAction.id,
            name: confirmAction.name,
            message: result.message,
            preview: result.reroutePreview,
          });
          setConfirmAction(null);
          return;
        }
        if (result.message) setPatchNotice(result.message);
        return;
      }
      setConfirmAction(null);
      await Promise.all([loadList(1, false), refreshStats()]);
    } catch (e) {
      setPatchNotice(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setPatching(false);
    }
  };

  const executeReroute = async () => {
    if (!rerouteConfirm) return;
    setPatching(true);
    setPatchNotice(null);
    try {
      const result = await patchCandidateStatus(rerouteConfirm.id, 'Fail', {
        confirmReroute: true,
      });
      if (!result.ok) {
        if (result.message) setPatchNotice(result.message);
        return;
      }
      setRerouteConfirm(null);
      await Promise.all([loadList(1, false), refreshStats()]);
    } catch (e) {
      setPatchNotice(e instanceof Error ? e.message : 'Reroute failed.');
    } finally {
      setPatching(false);
    }
  };

  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];
  const statsDisplay = useMemo(
    () => ({
      total: stats.total,
      pending: stats.pending,
      passed: stats.passed,
      failed: stats.failed,
    }),
    [stats]
  );

  const isExportDisabled =
    exporting || (mode === 'round1' ? !isRound1Locked : !round2Locked);
  const exportDisabledReason =
    mode === 'round1' && !isRound1Locked
      ? 'Confirm & Lock Round 1 to export results'
      : mode === 'round2' && !round2Locked
        ? 'Confirm & Lock Round 2 to export results'
        : undefined;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative space-y-6">
        {lockSuccess && (
          <AppNotice
            variant="info" 
            title="Round 1 Locked Successfully"
            onDismiss={() => setLockSuccess(false)}
            action={
              <button
                type="button"
                onClick={() => {
                  setMode('round2');
                  setLockSuccess(false);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#0D1742] px-4 py-2 text-sm font-bold text-[#DCB968] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Go to Round 2 <i className="fa-solid fa-arrow-right" />
              </button>
            }
          >
            All evaluations for Round 1 have been finalized. The interview pool is now unlocked and ready for Round 2.
          </AppNotice>
        )}

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

        {lockError && (
          <AppNotice variant="error" onDismiss={() => setLockError(null)}>
            {lockError}
          </AppNotice>
        )}
        {patchNotice && (
          <AppNotice variant="error" onDismiss={() => setPatchNotice(null)}>
            {patchNotice}
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
          variant="head"
          scopeLabel={assignedDepartment ? `${assignedDepartment}` : undefined}
          mode={mode}
          isRound1Locked={isRound1Locked}
          isRound2Locked={round2Locked}
        />

        {/* 3. Sub Nav (Chỉ hiển thị khi đang ở Round 2) */}
        {mode === 'round2' && <HeadRound2SubNav />}

        {/* 4. Stats Grid */}
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
                <AnimatedNumber value={statsDisplay.total} />
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
                <AnimatedNumber value={statsDisplay.pending} />
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
                <AnimatedNumber value={statsDisplay.passed} />
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
                <AnimatedNumber value={statsDisplay.failed} />
              </p>
              <p className="text-xs font-semibold text-[#B82649]/70">
                Rejected
              </p>
            </div>
          </div>
        </div>

        {/* 5. Filter / Action Bar */}
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full overflow-x-auto rounded-xl bg-gray-100 p-1 sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
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
            <Tooltip content={exportDisabledReason || 'Export list to Excel'}>
              <span
                className={
                  isExportDisabled
                    ? 'inline-block cursor-not-allowed'
                    : 'inline-block'
                }
              >
                <button
                  type="button"
                  onClick={() => setExportOpen((prev) => !prev)}
                  disabled={isExportDisabled}
                  className="relative flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-60"
                >
                  {exporting ? (
                    <i className="fa-solid fa-spinner fa-spin text-emerald-600" />
                  ) : (
                    <i className="fa-solid fa-file-excel text-emerald-600" />
                  )}
                  {exporting ? 'Exporting...' : 'Export Excel'}

                  {!exporting && (
                    <i
                      className={`fa-solid ${
                        isExportDisabled ? 'fa-lock' : 'fa-chevron-down'
                      } ml-1 text-xs text-gray-400 transition-transform ${
                        exportOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}

                  {exportOpen && !isExportDisabled && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                      <div className="mb-1 border-b border-gray-100 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Export Round {mode === 'round1' ? '1' : '2'}
                        </p>
                      </div>
                      <div className="px-1 pb-1">
                        <button
                          type="button"
                          onClick={() =>
                            void handleExportExcel(
                              mode === 'round1' ? 1 : 2,
                              'Pass'
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-gray-50"
                        >
                          <i className="fa-solid fa-check text-emerald-600" />{' '}
                          Passed candidates
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleExportExcel(
                              mode === 'round1' ? 1 : 2,
                              'Fail'
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-gray-50"
                        >
                          <i className="fa-solid fa-xmark text-[#B82649]" />{' '}
                          Failed candidates
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              </span>
            </Tooltip>

            <div className="flex rounded-xl bg-gray-100 p-1">
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

        {/* 6. Khu vực Bảng Danh Sách */}
        <div className="relative mt-4">
          {mode === 'round1' && headDepartment ? (
            <div className="mb-6">
              <RoundTransitionBar
                department={headDepartment}
                evaluated={Math.max(stats.total - stats.pending, 0)}
                total={stats.total}
                pending={stats.pending}
                isLocked={isRound1Locked}
                locking={locking}
                onLock={handleLockRound1}
              />
            </div>
          ) : null}

          {mode === 'round2' ? (
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Round 2 evaluation
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-gray-900">
                    {round2Locked
                      ? `Locked — ${statsDisplay.passed + statsDisplay.failed} evaluated`
                      : statsDisplay.pending === 0
                        ? `Complete — ${statsDisplay.passed + statsDisplay.failed} evaluated`
                        : `In progress — ${statsDisplay.passed + statsDisplay.failed} of ${statsDisplay.total} evaluated`}
                  </h2>
                  <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#0D1742] transition-all"
                      style={{
                        width: `${statsDisplay.total ? ((statsDisplay.passed + statsDisplay.failed) / statsDisplay.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRound2ConfirmAction(round2Locked ? 'unlock' : 'lock')
                  }
                  disabled={
                    isLockingRound2 ||
                    (!round2Locked && statsDisplay.pending > 0)
                  }
                  className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLockingRound2 ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2 text-[#DCB968]" />
                      {round2Locked ? 'Unlocking...' : 'Locking...'}
                    </>
                  ) : round2Locked ? (
                    <>
                      <i className="fa-solid fa-lock-open mr-2" />
                      Unlock Round 2
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lock mr-2" />
                      Confirm & Lock Round 2
                    </>
                  )}
                </button>
              </div>
              {statsDisplay.pending > 0 ? (
                <p className="mt-4 rounded-lg border border-[#F7D27F] bg-[#FFEFCA] px-3 py-2 text-xs font-semibold text-[#A28436]">
                  <i className="fa-solid fa-triangle-exclamation mr-2" />
                  You still have {statsDisplay.pending} pending candidate
                  {statsDisplay.pending === 1 ? '' : 's'}.
                </p>
              ) : null}
            </section>
          ) : null}

          {/* --- DUY NHẤT 1 TRẠNG THÁI LOADING BẰNG SPINNER CHO CẢ TRANG --- */}
          {(loading && mode === 'round1' && !error) ||
          (round2Loading && mode === 'round2' && !round2Error) ? (
            <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center shadow-sm py-20">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-[#DCB968]" />
              <p className="mt-4 text-sm font-bold text-[#0D1742]">
                Loading candidates…
              </p>
            </div>
          ) : (
            <div className="transition-opacity duration-300 opacity-100">
              {(mode === 'round2' ? round2Candidates : candidates).length >
              0 ? (
                <>
                  <CandidateTable
                    candidates={
                      mode === 'round2' ? round2Candidates : candidates
                    }
                    onUpdateStatus={
                      mode === 'round2'
                        ? () => undefined
                        : handleUpdateStatusRequest
                    }
                    viewMode={viewMode}
                    readOnly={mode === 'round2' || isRound1Locked}
                  />

                  {/* --- INFINITE SCROLL TARGET --- */}
                  {mode === 'round1' && hasMore && (
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
                    <i
                      className={`fa-solid ${
                        mode === 'round2' ? 'fa-people-group' : 'fa-folder-open'
                      } text-3xl text-gray-400`}
                    />
                  </div>
                  <p className="text-xl font-black text-[#0D1742]">
                    {mode === 'round2'
                      ? 'No candidates in the Round 2 pool yet'
                      : 'No candidates found'}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {mode === 'round2'
                      ? 'Passed Round 1 candidates will appear here.'
                      : (listEmptyHint ??
                        'Try adjusting your search or filter settings.')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <HeadDashboardDialogs
          confirmAction={confirmAction}
          onCloseStatus={() => setConfirmAction(null)}
          onConfirmStatus={() => void executeStatusChange()}
          isPatching={patching}
          rerouteConfirm={rerouteConfirm}
          onCloseReroute={() => setRerouteConfirm(null)}
          onConfirmReroute={() => void executeReroute()}
          round2ConfirmAction={round2ConfirmAction}
          onCloseRound2={() => setRound2ConfirmAction(null)}
          onConfirmRound2={() =>
            void (round2ConfirmAction === 'unlock'
              ? handleUnlockRound2()
              : handleLockRound2())
          }
          isLockingRound2={isLockingRound2}
        />
      </div>
    </TooltipProvider>
  );
}

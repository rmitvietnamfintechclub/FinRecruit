'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
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
import type { LockRound1Result } from '@/types/roundTransition';
import { HeadDashboardDialogs } from '@/components/head-dashboard/HeadDashboardDialogs';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';
import { Round1Evaluation } from './Round1Evaluation';
import { Round2Evaluation } from './Round2Evaluation';

const PAGE_SIZE = 12;

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
  // === STATE CHUNG ===
  const [mode, setMode] = useState<RoundMode>('round1');
  const [activeCohort, setActiveCohort] = useState<ActiveCohort | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<string | null>(
    null
  );
  const [viewMode, setViewMode] = useState<CandidateViewMode>('list');
  const { triggerSessionExpired } = useSessionExpired();
  const departmentStates = useDepartmentStates();

  // === ROUND 1 STATE ===
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>(
    []
  );
  const [statusFilterRound1, setStatusFilterRound1] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listEmptyHint, setListEmptyHint] = useState<string | null>(null);
  const { lock, pending: locking } = useLockRound1();
  const [statsRound1, setStatsRound1] = useState({
    total: 0,
    pending: 0,
    passed: 0,
    failed: 0,
  });

  // === ROUND 2 STATE ===
  const [round2Candidates, setRound2Candidates] = useState<
    HeadDashboardListCandidate[]
  >([]);
  const [round2Loading, setRound2Loading] = useState(false);
  const [round2Error, setRound2Error] = useState<string | null>(null);
  const [isLockingRound2, setIsLockingRound2] = useState(false);
  const [round2Locked, setRound2Locked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // === DIALOG & NOTICES ===
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    name: string;
    newStatus: DashboardStatus;
    targetRound: 1 | 2;
  } | null>(null);
  const [patching, setPatching] = useState(false);
  const [patchNotice, setPatchNotice] = useState<string | null>(null);
  const [rerouteConfirm, setRerouteConfirm] = useState<{
    id: string;
    name: string;
    message: string;
    preview?: ReroutePreview;
  } | null>(null);
  const [newCandidateNotice, setNewCandidateNotice] = useState(false);

  // === REFS ===
  const pageRef = useRef(1);
  const prevListTotalRef = useRef<number | null>(null);

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

  // === API ROUND 2 LOCK STATUS ===
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

  const handleLockRound2 = async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    if (isLockingRound2)
      return { success: false, message: 'Not ready to lock yet.' };
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
      return { success: true };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to lock Round 2.';
      setLockError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setIsLockingRound2(false);
    }
  };

  useEffect(() => {
    void fetchRound2LockStatus();
  }, [fetchRound2LockStatus]);

  // === API ROUND 1 STATS ===
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
      setStatsRound1({
        total: jAll.meta?.total ?? 0,
        pending: rP.ok && jP.success ? (jP.meta?.total ?? 0) : 0,
        passed: rPa.ok && jPa.success ? (jPa.meta?.total ?? 0) : 0,
        failed: rF.ok && jF.success ? (jF.meta?.total ?? 0) : 0,
      });
    } catch {}
  }, []);

  // === API ROUND 1 DATA ===
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
        if (statusFilterRound1 !== 'All')
          params.set('status', statusFilterRound1);

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
    [statusFilterRound1, triggerSessionExpired]
  );

  useEffect(() => {
    void loadList(1, false);
  }, [loadList]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  // === API ROUND 2 DATA ===
  const loadRound2 = useCallback(
    async (options?: { isPoll?: boolean }) => {
      if (!options?.isPoll) {
        setRound2Loading(true);
        setRound2Error(null);
      }
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
          if (!options?.isPoll) {
            setRound2Candidates([]);
            setRound2Error(json.message ?? `Request failed (${res.status})`);
          }
          return;
        }
        setRound2Candidates(json.candidates ?? []);
        if (!options?.isPoll) setRound2Error(null);
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
        if (!options?.isPoll) {
          setRound2Candidates([]);
          setRound2Error(errorMessage);
        }
      } finally {
        if (!options?.isPoll) setRound2Loading(false);
      }
    },
    [triggerSessionExpired]
  );

  // === POLLING ===
  const pollDashboard = useCallback(() => {
    if (mode === 'round1') {
      void loadList(1, false, { isPoll: true });
    } else if (mode === 'round2') {
      void loadRound2({ isPoll: true });
    }
    void refreshStats();
  }, [mode, loadList, loadRound2, refreshStats]);

  useIntervalWhenVisible(pollDashboard, {
    enabled: !loading && !loadingMore && !patching,
  });

  const handleLockRound1 = useCallback(async (): Promise<LockRound1Result> => {
    if (!headDepartment) {
      return { success: false, message: 'No department assignment found.' };
    }
    const result = await lock(headDepartment);
    if (result.success) {
      await Promise.all([loadList(1, false), refreshStats()]);
    }
    return result;
  }, [headDepartment, lock, loadList, refreshStats]);

  useEffect(() => {
    if (isRound1Locked && mode === 'round2') void loadRound2();
  }, [isRound1Locked, mode, loadRound2]);

  // === STATUS UPDATES ===
  const handleUpdateStatusRequestRound1 = (
    id: string,
    newStatus: DashboardStatus
  ) => {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return;
    setConfirmAction({
      id,
      name: candidate.fullName,
      newStatus,
      targetRound: 1,
    });
  };

  const handleUpdateStatusRequestRound2 = (
    id: string,
    newStatus: DashboardStatus
  ) => {
    const candidate = round2Candidates.find((c) => c.id === id);
    if (!candidate) return;
    setConfirmAction({
      id,
      name: candidate.fullName,
      newStatus,
      targetRound: 2,
    });
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    setPatching(true);
    setPatchNotice(null);
    try {
      const result = await patchCandidateStatus(
        confirmAction.id,
        confirmAction.newStatus,
        {
          targetRound: confirmAction.targetRound,
        }
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

      const updatedRound = confirmAction.targetRound;
      setConfirmAction(null);

      if (updatedRound === 1) {
        await Promise.all([loadList(1, false), refreshStats()]);
      } else {
        await Promise.all([loadRound2(), refreshStats()]); // Round 2 load lại
      }
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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative space-y-6">
        {/* NOTICES */}
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

        {/* TABS & COHORT */}
        {headDepartment || loading ? (
          <RoundModeTabs
            mode={mode}
            isLocked={isRound1Locked}
            isLoading={!headDepartment && loading}
            onChange={setMode}
          />
        ) : null}

        <CohortBanner
          cohort={activeCohort}
          variant="head"
          scopeLabel={assignedDepartment ? `${assignedDepartment}` : undefined}
          mode={mode}
          isRound1Locked={isRound1Locked}
          isRound2Locked={round2Locked}
        />

        {/* COMPONENTS CON - CÁC PROPS STATS/FILTERS ĐÃ ĐƯỢC CHUYỂN VÀO TRONG */}
        {mode === 'round1' ? (
          <Round1Evaluation
            headDepartment={headDepartment}
            candidates={candidates}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            listEmptyHint={listEmptyHint}
            page={page}
            stats={statsRound1} // Trực tiếp truyền stats của R1
            isRound1Locked={isRound1Locked}
            locking={locking}
            isRecruitmentActive={activeCohort?.isRecruitmentActive ?? false}
            viewMode={viewMode}
            statusFilter={statusFilterRound1}
            onSetStatusFilter={setStatusFilterRound1}
            onSetViewMode={setViewMode}
            onLoadMore={(p) => loadList(p, true)}
            onRetry={() => loadList(1, false)}
            onLockRound1={handleLockRound1}
            onGoToRound2={() => setMode('round2')}
            onUpdateStatusRequest={handleUpdateStatusRequestRound1}
          />
        ) : (
          <Round2Evaluation
            headDepartment={headDepartment}
            candidates={round2Candidates}
            loading={round2Loading}
            error={round2Error}
            round2Locked={round2Locked}
            isLockingRound2={isLockingRound2}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            onLockRound2={handleLockRound2}
            onUpdateStatusRequest={handleUpdateStatusRequestRound2}
          />
        )}

        {/* DIALOGS */}
        <HeadDashboardDialogs
          confirmAction={confirmAction}
          onCloseStatus={() => setConfirmAction(null)}
          onConfirmStatus={() => void executeStatusChange()}
          isPatching={patching}
          rerouteConfirm={rerouteConfirm}
          onCloseReroute={() => setRerouteConfirm(null)}
          onConfirmReroute={() => void executeReroute()}
        />
      </div>
    </TooltipProvider>
  );
}

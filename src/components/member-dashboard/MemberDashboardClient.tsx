'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
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
import { RoundModeTabs, type RoundMode } from '@/components/member-dashboard/RoundModeTabs';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

import { MemberRound1View } from './MemberRound1View';
import { MemberRound2View } from './MemberRound2View';

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
    filters?: { status?: string | null; department?: string };
  };
};

export default function MemberDashboardClient() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get('tab') === 'round2' ? 'round2' : 'round1') as RoundMode;
  const [activeCohort, setActiveCohort] = useState<ActiveCohort | null>(null);
  const [assignedDepartment, setAssignedDepartment] = useState<string | null>(null);
  const [mode, setMode] = useState<RoundMode>(initialMode);
  const [viewMode, setViewMode] = useState<CandidateViewMode>('list');
  const [newCandidateNotice, setNewCandidateNotice] = useState(false);
  
  const { triggerSessionExpired } = useSessionExpired();
  const departmentStates = useDepartmentStates();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // === ROUND 1 STATE ===
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>([]);
  const [statusFilterR1, setStatusFilterR1] = useState('All');
  const [pageR1, setPageR1] = useState(1);
  const [hasMoreR1, setHasMoreR1] = useState(false);
  const [loadingMoreR1, setLoadingMoreR1] = useState(false);
  const [listEmptyHintR1, setListEmptyHintR1] = useState<string | null>(null);
  const [statsR1, setStatsR1] = useState({ total: 0, pending: 0, passed: 0, failed: 0 });
  const prevListTotalRef = useRef<number | null>(null);
  const pageRef = useRef(1);

  // === ROUND 2 STATE ===
  const [round2Candidates, setRound2Candidates] = useState<HeadDashboardListCandidate[]>([]);
  const [loadingR2, setLoadingR2] = useState(false);
  const [errorR2, setErrorR2] = useState<string | null>(null);

  useEffect(() => {
    pageRef.current = pageR1;
  }, [pageR1]);

  const headDepartment: DepartmentType | null =
    assignedDepartment && ROUND_TRANSITION_DEPARTMENTS.includes(assignedDepartment as DepartmentType)
      ? (assignedDepartment as DepartmentType)
      : null;

  const isRound1Locked = headDepartment
    ? (findDepartmentState(departmentStates, headDepartment)?.isRound1Locked ?? false)
    : false;

  const isRound2Locked = headDepartment
    ? (findDepartmentState(departmentStates, headDepartment)?.isRound2Locked ?? false)
    : false;

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
        rAll.json(), rP.json(), rPa.json(), rF.json(),
      ])) as ListApiResponse[];

      if (!rAll.ok || !jAll.success) return;
      setStatsR1({
        total: jAll.meta?.total ?? 0,
        pending: rP.ok && jP.success ? (jP.meta?.total ?? 0) : 0,
        passed: rPa.ok && jPa.success ? (jPa.meta?.total ?? 0) : 0,
        failed: rF.ok && jF.success ? (jF.meta?.total ?? 0) : 0,
      });
    } catch {}
  }, []);

  const loadListR1 = useCallback(
    async (pageNum: number, append: boolean, options?: { isPoll?: boolean }) => {
      if (pageNum === 1 && !append && !options?.isPoll) setLoading(true);
      else if (pageNum > 1) setLoadingMoreR1(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const fetchLimit = options?.isPoll ? pageRef.current * PAGE_SIZE : PAGE_SIZE;
        const fetchPage = options?.isPoll ? 1 : pageNum;

        params.set('limit', String(fetchLimit));
        params.set('page', String(fetchPage));
        if (statusFilterR1 !== 'All') params.set('status', statusFilterR1);

        const res = await fetch(`/api/member-dashboard/candidates?${params}`, { credentials: 'include' });
        const json = (await res.json()) as ListApiResponse;

        if (!res.ok || !json.success) {
          if (!options?.isPoll) {
            setError(json.message ?? `Request failed (${res.status})`);
            if (!append) setCandidates([]);
          }
          return;
        }

        const rows = json.candidates ?? [];
        const total = json.meta?.total ?? 0;

        if (options?.isPoll) {
          if (prevListTotalRef.current !== null && total > prevListTotalRef.current) {
            setNewCandidateNotice(true);
          }
          prevListTotalRef.current = total;
          setCandidates(rows);
        } else if (pageNum === 1 && !append) {
          prevListTotalRef.current = total;
          setCandidates(rows);
          setPageR1(1);
          setHasMoreR1((json.meta?.totalPages ?? 0) > 1);
        } else if (append && pageNum > 1) {
          setCandidates((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newRows = rows.filter((r) => !existingIds.has(r.id));
            return [...prev, ...newRows];
          });
          setHasMoreR1(pageNum < (json.meta?.totalPages ?? 0));
          setPageR1(pageNum);
        }

        if (json.meta?.activeCohort) setActiveCohort(json.meta.activeCohort);
        if (json.meta?.filters?.department) setAssignedDepartment(json.meta.filters.department);
        setListEmptyHintR1(rows.length === 0 ? (json.meta?.emptyState ?? null) : null);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load candidates.';
        if (errorMessage.toLowerCase().includes('authentication required') || errorMessage.includes('401')) {
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
          setLoadingMoreR1(false);
        }
      }
    },
    [statusFilterR1, triggerSessionExpired]
  );

  const loadListR2 = useCallback(async (options?: { isPoll?: boolean }) => {
    if (!options?.isPoll) {
      setLoadingR2(true);
      setErrorR2(null);
    }
    try {
      const params = new URLSearchParams({ status: 'Pass', page: '1', limit: '500', populateInterview: 'true' });
      const res = await fetch(`/api/member-dashboard/candidates?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (!options?.isPoll) setErrorR2(json.message ?? `Request failed (${res.status})`);
        return;
      }
      setRound2Candidates(json.candidates ?? []);
    } catch (e) {
      if (!options?.isPoll) setErrorR2(e instanceof Error ? e.message : 'Failed to load Round 2 data.');
    } finally {
      if (!options?.isPoll) setLoadingR2(false);
    }
  }, []);

  useEffect(() => { void loadListR1(1, false); }, [loadListR1]);
  useEffect(() => { void refreshStats(); }, [refreshStats]);
  useEffect(() => { if (isRound1Locked && mode === 'round2') void loadListR2(); }, [isRound1Locked, mode, loadListR2]);

  const pollDashboard = useCallback(() => {
    if (mode === 'round1') {
      void loadListR1(1, false, { isPoll: true });
      void refreshStats();
    } else {
      void loadListR2({ isPoll: true });
    }
  }, [mode, loadListR1, refreshStats, loadListR2]);

  useIntervalWhenVisible(pollDashboard, { enabled: !loading && !loadingMoreR1 });

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative space-y-6">
        {newCandidateNotice && (
          <AppNotice variant="info" title="New application received" onDismiss={() => setNewCandidateNotice(false)}>
            A new candidate has been added to your list.
          </AppNotice>
        )}

        {(headDepartment || loading) && (
          <RoundModeTabs mode={mode} isLocked={isRound1Locked} isLoading={!headDepartment && loading} onChange={setMode} />
        )}

        <CohortBanner
          cohort={activeCohort}
          variant="default"
          scopeLabel={assignedDepartment ? `${assignedDepartment}` : undefined}
          mode={mode}
          isRound1Locked={isRound1Locked}
          isRound2Locked={isRound2Locked}
        />

        {mode === 'round1' ? (
          <MemberRound1View
            department={headDepartment}
            candidates={candidates}
            loading={loading}
            loadingMore={loadingMoreR1}
            hasMore={hasMoreR1}
            error={error}
            listEmptyHint={listEmptyHintR1}
            page={pageR1}
            stats={statsR1}
            statusFilter={statusFilterR1}
            viewMode={viewMode}
            isLocked={isRound1Locked}
            isRecruitmentActive={activeCohort?.isRecruitmentActive ?? false}
            onSetStatusFilter={(s) => { setStatusFilterR1(s); setPageR1(1); }}
            onSetViewMode={setViewMode}
            onLoadMore={(p) => loadListR1(p, true)}
            onRetry={() => loadListR1(1, false)}
          />
        ) : (
          <MemberRound2View
            department={headDepartment}
            candidates={round2Candidates}
            loading={loadingR2}
            error={errorR2}
            viewMode={viewMode}
            isLocked={isRound2Locked}
            onSetViewMode={setViewMode}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
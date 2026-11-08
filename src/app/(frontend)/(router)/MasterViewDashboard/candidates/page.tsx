'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import {
  masterViewDeptToApiDepartment,
  type ExecutiveListRow,
  type MasterViewDeptFilter,
} from '@/lib/executiveMasterViewMapping';
import { AppNotice } from '@/components/feedback/AppNotice';
import { CohortBanner } from '@/components/feedback/CohortBanner';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

import {
  RoundModeTabs,
  type RoundMode,
} from '@/components/eb-dashboard/RoundModeTabs';
import { useDepartmentStates } from '@/hooks/use-round-transition';
import {
  findDepartmentState,
  ROUND_TRANSITION_DEPARTMENTS,
} from '@/lib/round-transition/reducer';

import { MasterRound1View } from './MasterRound1View';
import { MasterRound2View } from './MasterRound2View';

export type ActiveCohort = {
  generation: string;
  semester: string;
  isRecruitmentActive: boolean;
};

export type DepartmentProgress = {
  department: DepartmentType;
  evaluated: number;
  total: number;
};

// Định nghĩa Type an toàn cho Department State từ hook API
export type DepartmentStateInfo = {
  department: DepartmentType;
  isRound1Locked: boolean;
  isRound2Locked: boolean;
};

const PAGE_SIZE = 12;

export default function MasterCandidatesPage() {
  // === STATE CHUNG ===
  const [activeCohort, setActiveCohort] = useState<ActiveCohort | null>(null);
  const [mode, setMode] = useState<RoundMode>('round1');
  const [deptFilter, setDeptFilter] = useState<MasterViewDeptFilter>('All');
  const [viewMode, setViewMode] = useState<CandidateViewMode>('list');
  const { triggerSessionExpired } = useSessionExpired();

  // Ép kiểu an toàn cho hook trả về
  const rawDepartmentStates = useDepartmentStates();
  const departmentStates =
    rawDepartmentStates as unknown as DepartmentStateInfo[];

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newCandidateNotice, setNewCandidateNotice] = useState(false);

  // === ROUND 1 STATE ===
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>(
    []
  );
  const [statusFilterRound1, setStatusFilterRound1] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [listEmptyHint, setListEmptyHint] = useState<string | null>(null);
  const [statsRound1, setStatsRound1] = useState({
    total: 0,
    pending: 0,
    passed: 0,
    failed: 0,
  });
  const [deptStats, setDeptStats] = useState<DepartmentProgress[]>([]);

  // === ROUND 2 STATE ===
  const [round2Candidates, setRound2Candidates] = useState<
    HeadDashboardListCandidate[]
  >([]);
  const [round2Loading, setRound2Loading] = useState(false);
  const [round2Error, setRound2Error] = useState<string | null>(null);

  // === REFS ===
  const pageRef = useRef(1);
  const prevListCountRef = useRef<number | null>(null);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // === LOCK STATUS COMPUTATION ===
  const isCurrentDeptLocked = useMemo(() => {
    if (deptFilter === 'All') return false;
    const apiDept = masterViewDeptToApiDepartment(deptFilter);
    if (!apiDept) return false;
    return (
      findDepartmentState(departmentStates, apiDept)?.isRound1Locked ?? false
    );
  }, [deptFilter, departmentStates]);

  const isAllDepartmentsLocked = useMemo(() => {
    if (!departmentStates || departmentStates.length === 0) return false;
    return ROUND_TRANSITION_DEPARTMENTS.every(
      (dept) =>
        findDepartmentState(departmentStates, dept)?.isRound1Locked === true
    );
  }, [departmentStates]);

  const isCurrentDeptRound2Locked = useMemo(() => {
    if (deptFilter === 'All') return false;
    const apiDept = masterViewDeptToApiDepartment(deptFilter);
    if (!apiDept) return false;

    const state = departmentStates.find((s) => s.department === apiDept);
    return state?.isRound2Locked ?? false;
  }, [deptFilter, departmentStates]);

  const isAllDepartmentsRound2Locked = useMemo(() => {
    if (!departmentStates || departmentStates.length === 0) return false;

    return ROUND_TRANSITION_DEPARTMENTS.every((dept) => {
      const state = departmentStates.find((s) => s.department === dept);
      return state?.isRound2Locked === true;
    });
  }, [departmentStates]);

  // Fetch counts động cho từng phòng ban (phục vụ Bar)
  const fetchCounts = useCallback(async (deptName: string | null) => {
    const dParam = deptName
      ? `department=${encodeURIComponent(deptName)}&`
      : '';
    const base = '/api/executive/candidates';

    try {
      const [rAll, rP, rPa, rF] = await Promise.all([
        fetch(`${base}?${dParam}limit=1`, { credentials: 'include' }),
        fetch(`${base}?${dParam}status=Pending&limit=1`, {
          credentials: 'include',
        }),
        fetch(`${base}?${dParam}status=Pass&limit=1`, {
          credentials: 'include',
        }),
        fetch(`${base}?${dParam}status=Fail&limit=1`, {
          credentials: 'include',
        }),
      ]);

      const [jAll, jP, jPa, jF] = await Promise.all([
        rAll.json().catch(() => ({})),
        rP.json().catch(() => ({})),
        rPa.json().catch(() => ({})),
        rF.json().catch(() => ({})),
      ]);

      return {
        total: jAll.data?.count ?? 0,
        pending: jP.data?.count ?? 0,
        passed: jPa.data?.count ?? 0,
        failed: jF.data?.count ?? 0,
      };
    } catch {
      return { total: 0, pending: 0, passed: 0, failed: 0 };
    }
  }, []);

  const loadAllData = useCallback(
    async (options?: { isPoll?: boolean }) => {
      if (!options?.isPoll) {
        setError(null);
        if (page === 1) setLoading(true);
        else setLoadingMore(true);
      }
      try {
        const apiDept = masterViewDeptToApiDepartment(deptFilter);
        const params = new URLSearchParams();
        if (apiDept) params.set('department', apiDept);
        if (statusFilterRound1 !== 'All')
          params.set('status', statusFilterRound1);

        // Paging cho R1
        const fetchLimit = options?.isPoll
          ? pageRef.current * PAGE_SIZE
          : PAGE_SIZE;
        const fetchPage = options?.isPoll ? 1 : page;
        params.set('limit', String(fetchLimit));
        params.set('page', String(fetchPage));

        const [statsJson, listJson, currentStats, breakdownData] =
          await Promise.all([
            fetch('/api/executive/statistics', { credentials: 'include' }).then(
              (r) => r.json().catch(() => ({}))
            ),
            fetch(`/api/executive/candidates?${params}`, {
              credentials: 'include',
            }).then((r) => r.json().catch(() => ({}))),
            fetchCounts(apiDept),
            deptFilter === 'All'
              ? Promise.all(
                  ROUND_TRANSITION_DEPARTMENTS.map(async (d) => {
                    const c = await fetchCounts(d);
                    return {
                      department: d as DepartmentType,
                      total: c.total,
                      evaluated: Math.max(c.total - c.pending, 0),
                    };
                  })
                )
              : Promise.resolve(null),
          ]);

        if (listJson.success === false) {
          if (listJson.status === 401) {
            triggerSessionExpired();
            return;
          }
          throw new Error(listJson.message || 'Failed to load candidates.');
        }

        if (statsJson.data?.activeCohort) {
          setActiveCohort(statsJson.data.activeCohort);
        } else if (listJson.data?.activeCohort) {
          setActiveCohort(listJson.data.activeCohort);
        }

        setStatsRound1(currentStats);
        if (breakdownData) setDeptStats(breakdownData);

        const rows = (listJson.data?.candidates || []).map(
          (c: ExecutiveListRow) => {
            return {
              id: c._id,
              fullName: c.fullName,
              email: c.email,
              department: c.department,
              status: c.status,
              round2Status: c.round2Status,
              routing: {
                currentStage:
                  c.department === c.choice2 && c.choice1 !== c.choice2
                    ? 'choice2'
                    : 'choice1',
              },
              choice1: c.choice1,
              choice2: c.choice2,
              interviewDate: c.interviewSlot?.date,
              interviewStartTime: c.interviewSlot?.startTime,
              interviewEndTime: c.interviewSlot?.endTime,
              interviewRoom: c.interviewSlot?.room,
              interviewAttendance: c.interviewSlot?.attendanceStatus,
              interviewSlotId: c.interviewSlot?.id,
              appliedAt: c.appliedAt,
            } as unknown as HeadDashboardListCandidate;
          }
        );

        const totalItems = listJson.data?.count ?? 0;
        if (
          options?.isPoll &&
          prevListCountRef.current !== null &&
          totalItems > prevListCountRef.current
        ) {
          setNewCandidateNotice(true);
        }
        prevListCountRef.current = totalItems;

        if (options?.isPoll || page === 1) {
          setCandidates(rows);
        } else {
          setCandidates((prev) => [...prev, ...rows]);
        }

        setHasMore(rows.length === PAGE_SIZE);
        setListEmptyHint(
          rows.length === 0
            ? 'Try adjusting your search or filter settings.'
            : null
        );
      } catch (e) {
        if (!options?.isPoll) {
          setError(e instanceof Error ? e.message : 'An error occurred.');
        }
      } finally {
        if (!options?.isPoll) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [deptFilter, statusFilterRound1, triggerSessionExpired, fetchCounts, page]
  );

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const loadRound2Data = useCallback(
    async (options?: { isPoll?: boolean }) => {
      if (!options?.isPoll) {
        setRound2Loading(true);
        setRound2Error(null);
      }
      try {
        const apiDept = masterViewDeptToApiDepartment(deptFilter);
        const params = new URLSearchParams({
          status: 'Pass',
          page: '1',
          limit: '500', 
        });
        if (apiDept) params.set('department', apiDept);
        
        // Bắt buộc phải có cờ này để backend populate data phỏng vấn
        params.set('populateInterview', 'true');

        const res = await fetch(`/api/executive/candidates?${params}`, {
          credentials: 'include',
        });
        const listJson = await res.json();

        if (!res.ok || listJson.success === false) {
          if (res.status === 401 || listJson.status === 401) {
            triggerSessionExpired();
            return;
          }
          if (!options?.isPoll) {
            setRound2Candidates([]);
            setRound2Error(
              listJson.message ?? `Request failed (${res.status})`
            );
          }
          return;
        }
const rows = (listJson.data?.candidates || []).map(
          (c: ExecutiveListRow & { 
            interviewSlot?: { 
              _id?: string; 
              id?: string; 
              date?: string; 
              startTime?: string; 
              endTime?: string; 
              room?: string;
              attendanceStatus?: 'COMPLETED' | 'NO_SHOW' | null; 
            } 
          }) => {
            // Xử lý an toàn dữ liệu interviewSlot populate từ DB
            const slot = c.interviewSlot;
            const interviewDate = slot?.date;
            const interviewStartTime = slot?.startTime;
            const interviewEndTime = slot?.endTime;
            const interviewRoom = slot?.room;
            
            const interviewAttendance = slot?.attendanceStatus;
            const interviewSlotId = slot?._id || slot?.id; // Tùy backend trả về id hay _id

            return {
              id: c._id,
              fullName: c.fullName,
              email: c.email,
              department: c.department,
              status: c.status,
              round2Status: c.round2Status,
              routing: {
                currentStage:
                  c.department === c.choice2 && c.choice1 !== c.choice2
                    ? 'choice2'
                    : 'choice1',
              },
              choice1: c.choice1,
              choice2: c.choice2,
              interviewDate,
              interviewStartTime,
              interviewEndTime,
              interviewRoom,
              interviewAttendance,
              interviewSlotId,
              appliedAt: c.appliedAt,
            } as unknown as HeadDashboardListCandidate;
          }
        );

        setRound2Candidates(rows);
        if (!options?.isPoll) setRound2Error(null);
      } catch (e) {
        if (!options?.isPoll) {
          setRound2Candidates([]);
          setRound2Error(
            e instanceof Error ? e.message : 'Failed to load Round 2 data.'
          );
        }
      } finally {
        if (!options?.isPoll) setRound2Loading(false);
      }
    },
    [deptFilter, triggerSessionExpired]
  );

  const pollDashboard = useCallback(() => {
    if (mode === 'round1') {
      void loadAllData({ isPoll: true });
    } else {
      void loadRound2Data({ isPoll: true });
    }
  }, [mode, loadAllData, loadRound2Data]);

  useIntervalWhenVisible(pollDashboard, { enabled: !loading });

  useEffect(() => {
    if (isAllDepartmentsLocked && mode === 'round2') void loadRound2Data();
  }, [isAllDepartmentsLocked, mode, loadRound2Data]);

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
                onClick={() => void loadAllData()}
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
            A new candidate has been added to the master list.
          </AppNotice>
        )}

        <div>
          <RoundModeTabs
            mode={mode}
            isLocked={isAllDepartmentsLocked}
            isLoading={!activeCohort && loading}
            onChange={setMode}
          />
        </div>

        <CohortBanner
          cohort={activeCohort}
          variant="executive"
          scopeLabel={
            deptFilter === 'All'
              ? 'Executive Board View · All Departments'
              : `Executive Board View · ${deptFilter} Department`
          }
          mode={mode}
          isRound1Locked={
            deptFilter === 'All' ? isAllDepartmentsLocked : isCurrentDeptLocked
          }
          isRound2Locked={
            deptFilter === 'All'
              ? isAllDepartmentsRound2Locked
              : isCurrentDeptRound2Locked
          }
        />

        {mode === 'round1' ? (
          <MasterRound1View
            candidates={candidates}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            listEmptyHint={listEmptyHint}
            page={page}
            stats={statsRound1}
            deptFilter={deptFilter}
            statusFilter={statusFilterRound1}
            viewMode={viewMode}
            isAllDepartmentsLocked={isAllDepartmentsLocked}
            isCurrentDeptLocked={isCurrentDeptLocked}
            departmentStates={departmentStates}
            departmentStats={deptStats}
            isRecruitmentActive={activeCohort?.isRecruitmentActive ?? false}
            onSetDeptFilter={(d) => {
              setDeptFilter(d);
              setPage(1);
            }}
            onSetStatusFilter={(s) => {
              setStatusFilterRound1(s);
              setPage(1);
            }}
            onSetViewMode={setViewMode}
            onLoadMore={(p) => setPage(p)}
            onRetry={() => loadAllData()}
          />
        ) : (
          <MasterRound2View
            candidates={round2Candidates}
            loading={round2Loading}
            error={round2Error}
            deptFilter={deptFilter}
            viewMode={viewMode}
            isCurrentDeptLocked={isCurrentDeptRound2Locked}
            isAllDepartmentsLocked={isAllDepartmentsRound2Locked}
            departmentStates={departmentStates}
            onSetDeptFilter={setDeptFilter}
            onSetViewMode={setViewMode}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

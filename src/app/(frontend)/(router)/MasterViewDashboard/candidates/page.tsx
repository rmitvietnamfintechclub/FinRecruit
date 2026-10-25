'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import CandidateTable, {
  type CandidateViewMode,
} from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import type { DepartmentType } from '@/app/(backend)/types';
import {
  MASTER_VIEW_DEPT_OPTIONS,
  mapExecutiveListItemToHeadRow,
  masterViewDeptToApiDepartment,
  type ExecutiveListRow,
  type MasterViewDeptFilter,
} from '@/lib/executiveMasterViewMapping';
import { AppNotice } from '@/components/feedback/AppNotice';
import { CohortBanner } from '@/components/feedback/CohortBanner';
import { emailLocalPart } from '@/lib/utils';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

import { RoundTransitionBar } from '@/components/eb-dashboard/RoundTransitionBar';
import {
  RoundModeTabs,
  type RoundMode,
} from '@/components/eb-dashboard/RoundModeTabs';
import { useDepartmentStates } from '@/hooks/use-round-transition';
import {
  findDepartmentState,
  ROUND_TRANSITION_DEPARTMENTS,
} from '@/lib/round-transition/reducer';

type ActiveCohort = {
  generation: string;
  semester: string;
  isRecruitmentActive: boolean;
};

type DepartmentProgress = {
  department: DepartmentType;
  evaluated: number;
  total: number;
};

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

export default function MasterCandidatesPage() {
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>(
    []
  );
  const [activeCohort, setActiveCohort] = useState<ActiveCohort | null>(null);

  // Lưu trữ số liệu cho top cards và breakdown
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    passed: 0,
    failed: 0,
  });
  const [deptStats, setDeptStats] = useState<DepartmentProgress[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // STATE ĐIỀU KHIỂN CHUYỂN VÒNG 1/VÒNG 2
  const [mode, setMode] = useState<RoundMode>('round1');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState<MasterViewDeptFilter>('All');

  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [visibleCount, setVisibleCount] = useState(12);
  const [viewMode, setViewMode] = useState<CandidateViewMode>('list');

  const observerTarget = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { triggerSessionExpired } = useSessionExpired();
  const prevListCountRef = useRef<number | null>(null);
  const [newCandidateNotice, setNewCandidateNotice] = useState(false);

  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  const departmentStates = useDepartmentStates();

  // 1. TRẠNG THÁI KHÓA CỦA RIÊNG PHÒNG BAN ĐANG FILTER (Dùng cho thanh Progress)
  const isCurrentDeptLocked = useMemo(() => {
    if (deptFilter === 'All') return false;
    const apiDept = masterViewDeptToApiDepartment(deptFilter);
    if (!apiDept) return false;

    return (
      findDepartmentState(departmentStates, apiDept)?.isRound1Locked ?? false
    );
  }, [deptFilter, departmentStates]);

  // 2. TRẠNG THÁI KHÓA TOÀN CỤC CỦA CẢ 4 PHÒNG BAN (Dùng để Unlock tab Round 2 & Khóa nút Export)
  const isAllDepartmentsLocked = useMemo(() => {
    if (!departmentStates || departmentStates.length === 0) return false;
    // Kiểm tra xem tất cả 4 phòng ban có đều đã khóa Vòng 1 chưa
    return ROUND_TRANSITION_DEPARTMENTS.every(
      (dept) =>
        findDepartmentState(departmentStates, dept)?.isRound1Locked === true
    );
  }, [departmentStates]);

  // Biến cờ chung cho tính năng Export
  const isExportDisabled = exporting || !isAllDepartmentsLocked;
  const exportDisabledReason = !isAllDepartmentsLocked
    ? 'Wait for all 4 Departments to lock their Round 1 evaluations before exporting.'
    : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t)) {
        setIsDeptDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(t)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const downloadExcelExport = useCallback(
    async (status: 'Pass' | 'Fail') => {
      if (isExportDisabled) return;

      setExportError(null);
      setExporting(true);
      setIsExportOpen(false);
      try {
        const res = await fetch(
          `/api/executive/export/round-1?status=${status}`,
          {
            credentials: 'include',
          }
        );
        if (!res.ok) {
          if (res.status === 401) {
            triggerSessionExpired();
            return;
          }
          const errJson = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(errJson?.message ?? `Export failed (${res.status})`);
        }
        const blob = await res.blob();
        const cd = res.headers.get('Content-Disposition');
        let filename = `Executive_Export_${status}_List.xlsx`;
        const m = cd?.match(/filename="([^"]+)"/);
        if (m?.[1]) filename = m[1];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        setExportError(e instanceof Error ? e.message : 'Export failed.');
      } finally {
        setExporting(false);
      }
    },
    [triggerSessionExpired, isExportDisabled]
  );

  // Helper fetch counts động
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
        setLoading(true);
      }
      try {
        const apiDept = masterViewDeptToApiDepartment(deptFilter);
        const params = new URLSearchParams();
        if (apiDept) params.set('department', apiDept);
        if (statusFilter !== 'All') params.set('status', statusFilter);

        const [statsJson, listJson, currentStats, breakdownData] =
          await Promise.all([
            fetch('/api/executive/statistics', { credentials: 'include' }).then(
              (r) => r.json().catch(() => ({}))
            ),
            fetch('/api/executive/candidates', { credentials: 'include' }).then(
              (r) => r.json().catch(() => ({}))
            ),
            fetchCounts(apiDept),
            deptFilter === 'All'
              ? Promise.all(
                  ROUND_TRANSITION_DEPARTMENTS.map(async (d) => {
                    const c = await fetchCounts(d);
                    return {
                      department: d,
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

        setStats(currentStats);

        if (breakdownData) {
          setDeptStats(breakdownData);
        }

        const rows = (listJson.data?.candidates || []).map(
          (c: ExecutiveListRow) => mapExecutiveListItemToHeadRow(c)
        );

        const count = listJson.data?.count ?? 0;
        if (
          options?.isPoll &&
          prevListCountRef.current !== null &&
          count > prevListCountRef.current
        ) {
          setNewCandidateNotice(true);
        }
        prevListCountRef.current = count;
        setCandidates(rows);
      } catch (e) {
        if (!options?.isPoll) {
          setError(e instanceof Error ? e.message : 'An error occurred.');
        }
      } finally {
        if (!options?.isPoll) {
          setLoading(false);
        }
      }
    },
    [deptFilter, statusFilter, triggerSessionExpired, fetchCounts]
  );

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const pollDashboard = useCallback(() => {
    void loadAllData({ isPoll: true });
  }, [loadAllData]);

  useIntervalWhenVisible(pollDashboard, { enabled: !loading });

  const filteredCandidates = useMemo(() => {
    let result = candidates;

    // 1. Lọc theo Phòng ban
    if (deptFilter !== 'All') {
      const filterStr = deptFilter.replace(' Department', '').toLowerCase();
      result = result.filter((candidate) => {
        const candDept = (candidate.department || '').toLowerCase();
        return candDept.includes(filterStr) || filterStr.includes(candDept);
      });
    }

    // 2. Lọc theo Trạng thái
    if (statusFilter !== 'All') {
      result = result.filter((candidate) => candidate.status === statusFilter);
    }

    // 3. Lọc theo Tìm kiếm sID/Name
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((candidate) => {
        const nameMatch = candidate.fullName.toLowerCase().includes(q);
        const idMatch = emailLocalPart(candidate.email)
          .toLowerCase()
          .includes(q);
        return nameMatch || idMatch;
      });
    }

    return result;
  }, [searchQuery, candidates, statusFilter, deptFilter]);

  const displayedCandidates = filteredCandidates.slice(0, visibleCount);
  const noopStatus = () => {};

  // XỬ LÝ INFINITE SCROLL CLIENT-SIDE:
  useEffect(() => {
    const hasMore = visibleCount < filteredCandidates.length;
    if (!hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => prev + 12);
            setLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1, rootMargin: '100px' } 
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, filteredCandidates.length, loadingMore, loading]);

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

        {exportError && (
          <AppNotice variant="error" onDismiss={() => setExportError(null)}>
            {exportError}
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
        />

        {/* Stats Grid */}
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

        {/* Filter / Action Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Cụm trái: Status Pills + Department Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Status Pills */}
              <div className="flex w-full overflow-x-auto rounded-xl bg-gray-100 p-1 sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filterOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option);
                      setVisibleCount(12);
                    }}
                    className={`shrink-0 rounded-lg px-6 py-2 text-sm font-bold transition-all duration-200 ${
                      statusFilter === option
                        ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
                        : 'text-gray-500 hover:text-[#0D1742]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Department Dropdown Filter */}
              <div
                className="relative w-full shrink-0 sm:w-56"
                ref={dropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white py-2 px-4 text-sm font-bold text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-[#0D1742]/50 focus:outline-none"
                >
                  <div className="flex min-w-0 items-center gap-2 truncate">
                    <i className="fa-solid fa-layer-group shrink-0 text-[#5E5E92]"></i>
                    <span className="truncate">
                      {deptFilter === 'All' ? 'All Departments' : deptFilter}
                    </span>
                  </div>
                  <i
                    className={`fa-solid fa-chevron-down text-gray-400 transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-180' : ''}`}
                  ></i>
                </button>
                {isDeptDropdownOpen && (
                  <div className="absolute top-full left-0 z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl duration-200">
                    {MASTER_VIEW_DEPT_OPTIONS.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => {
                          setDeptFilter(dept);
                          setVisibleCount(12);
                          setIsDeptDropdownOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                          deptFilter === dept
                            ? 'bg-[#0D1742] text-[#DCB968]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {dept === 'All' ? 'All Departments' : dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cụm phải: Search + View Mode + Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Search Input */}
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
                    setVisibleCount(12);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-11 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/50 focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] focus:outline-none"
                />
              </div>

              {/* Action Buttons: Export & Layout Toggle */}
              <div className="flex items-center gap-4 justify-between sm:justify-end">
                {/* Export Dropdown */}
                <div className="relative w-full sm:w-auto" ref={exportRef}>
                  {(() => {
                    const exportButtonNode = (
                      <span
                        className={
                          isExportDisabled ? 'inline-block cursor-not-allowed' : 'inline-block'
                        }
                      >
                        <button
                          type="button"
                          onClick={() => setIsExportOpen(!isExportOpen)}
                          disabled={isExportDisabled}
                          className="flex w-full sm:w-auto items-center justify-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm font-bold text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-600/50 focus:outline-none disabled:pointer-events-none disabled:opacity-60 whitespace-nowrap"
                        >
                          <span className="flex items-center gap-2">
                            <i
                              className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} text-emerald-600`}
                            />
                            {exporting ? 'Exporting…' : 'Export Excel'}
                          </span>
                          {!exporting && (
                            <i
                              className={`fa-solid ${isExportDisabled ? 'fa-lock' : 'fa-chevron-down'} text-gray-400 transition-transform duration-300 ${isExportOpen ? 'rotate-180' : ''}`}
                            />
                          )}
                        </button>
                      </span>
                    );

                    // CHỈ BỌC TOOLTIP KHI ĐANG BỊ KHÓA (CHƯA ĐỦ 4 BAN LOCK ROUND 1)
                    return isExportDisabled ? (
                      <Tooltip content={exportDisabledReason}>
                        {exportButtonNode}
                      </Tooltip>
                    ) : (
                      exportButtonNode
                    );
                  })()}

                  {isExportOpen && !isExportDisabled && (
                    <div className="absolute top-full right-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                      <div className="mb-1 border-b border-gray-100 px-3 py-2">
                        <p className="text-[10px] text-center font-black uppercase tracking-wider text-gray-400">
                          Master Export
                        </p>
                      </div>
                      <div className="px-1 pb-1">
                        <button
                          type="button"
                          onClick={() => void downloadExcelExport('Pass')}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-gray-50"
                        >
                          <i className="fa-solid fa-check text-emerald-600" />{' '}
                          Passed candidates
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadExcelExport('Fail')}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-gray-50"
                        >
                          <i className="fa-solid fa-xmark text-[#B82649]" />{' '}
                          Failed candidates
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Layout Toggle */}
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
          </div>
        </div>

        {/* Progress Bar & List Area */}
        <div className="relative mt-4">
          <div className="mb-6">
            <RoundTransitionBar
              department={
                deptFilter === 'All'
                  ? null
                  : masterViewDeptToApiDepartment(deptFilter)
              }
              evaluated={Math.max(stats.total - stats.pending, 0)}
              total={stats.total}
              isLocked={isCurrentDeptLocked} // ĐÃ ĐỔI THÀNH BIẾN MỚI
              departmentStates={departmentStates}
              departmentStats={deptStats}
              isRecruitmentActive={activeCohort?.isRecruitmentActive ?? false}
            />
          </div>

          {loading && !error ? (
            <div className="flex min-h-75 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center shadow-sm py-20">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-[#DCB968]" />
              <p className="mt-4 text-sm font-bold text-[#0D1742]">
                Loading candidates…
              </p>
            </div>
          ) : (
            <div className="transition-opacity duration-300 opacity-100">
              {filteredCandidates.length > 0 ? (
                <>
                  <CandidateTable
                    candidates={displayedCandidates}
                    onUpdateStatus={noopStatus}
                    viewMode={viewMode}
                    readOnly={true}
                    detailApi="executive" // Trỏ Modal về API executive view
                  />

                  {visibleCount < filteredCandidates.length && (
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
                    Try adjusting your search or filter settings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import CandidateTable from '@/components/ui/CandidateTable';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
import { RoundTransitionBar } from '@/components/eb-dashboard/RoundTransitionBar';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import {
  MASTER_VIEW_DEPT_OPTIONS,
  type MasterViewDeptFilter,
  masterViewDeptToApiDepartment,
} from '@/lib/executiveMasterViewMapping';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ROUND_TRANSITION_DEPARTMENTS } from '@/lib/round-transition/reducer';
import { Tooltip } from '@/components/ui/Tooltip';
import { emailLocalPart } from '@/lib/utils';
import type { DepartmentStateInfo } from './page';
import { DepartmentType } from '@/app/(backend)/types';

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

type MasterRound2ViewProps = {
  candidates: HeadDashboardListCandidate[];
  loading: boolean;
  error: string | null;
  deptFilter: MasterViewDeptFilter;
  viewMode: CandidateViewMode;

  isCurrentDeptLocked: boolean;
  isAllDepartmentsLocked: boolean;
  departmentStates: DepartmentStateInfo[];

  onSetDeptFilter: (d: MasterViewDeptFilter) => void;
  onSetViewMode: (m: CandidateViewMode) => void;
};

export function MasterRound2View({
  candidates,
  loading,
  error,
  deptFilter,
  viewMode,
  isCurrentDeptLocked,
  isAllDepartmentsLocked,
  departmentStates,
  onSetDeptFilter,
  onSetViewMode,
}: MasterRound2ViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t))
        setIsDeptDropdownOpen(false);
      if (exportRef.current && !exportRef.current.contains(t))
        setIsExportOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. TÍNH TOÁN STATS THEO BỘ LỌC PHÒNG BAN HIỆN TẠI
  const deptFilteredCandidates = useMemo(() => {
    if (deptFilter === 'All') return candidates;
    const filterStr = deptFilter.replace(' Department', '').toLowerCase();
    return candidates.filter((c) => {
      const candDept = (c.department || '').toLowerCase();
      return candDept.includes(filterStr) || filterStr.includes(candDept);
    });
  }, [candidates, deptFilter]);

  const round2Stats = useMemo(() => {
    let pending = 0;
    let passed = 0;
    let failed = 0;
    deptFilteredCandidates.forEach((c) => {
      const status = c.round2Status ?? 'Pending';
      if (status === 'Pending') pending++;
      else if (status === 'Pass') passed++;
      else if (status === 'Fail') failed++;
    });
    return { total: deptFilteredCandidates.length, pending, passed, failed };
  }, [deptFilteredCandidates]);

  // 2. LỌC ĐỂ HIỂN THỊ TRÊN BẢNG (áp dụng thêm status filter và search query)
  const fullyFilteredCandidates = useMemo(() => {
    let result = deptFilteredCandidates;
    if (statusFilter !== 'All') {
      result = result.filter(
        (c) => (c.round2Status ?? 'Pending') === statusFilter
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((c) => {
        const nameMatch = c.fullName.toLowerCase().includes(q);
        const idMatch = emailLocalPart(c.email).toLowerCase().includes(q);
        return nameMatch || idMatch;
      });
    }
    return result;
  }, [deptFilteredCandidates, statusFilter, searchQuery]);

  const displayedCandidates = fullyFilteredCandidates.slice(0, visibleCount);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasMore = visibleCount < fullyFilteredCandidates.length;
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((p) => p + 12);
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [visibleCount, fullyFilteredCandidates.length, loading]);

  const downloadExcelExport = async (status: 'Pass' | 'Fail') => {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    setIsExportOpen(false);
    try {
      const res = await fetch(
        `/api/executive/export/round-2?status=${status}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let filename = `Executive_Round_2_${status}_List.xlsx`;
      const m = cd?.match(/filename="([^"]+)"/);
      if (m?.[1]) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  return (
    <div className="relative animate-in fade-in duration-500 space-y-6">
      {error && (
        <AppNotice variant="error" title="Could not load data">
          {error}
        </AppNotice>
      )}
      {exportError && (
        <AppNotice variant="error" onDismiss={() => setExportError(null)}>
          {exportError}
        </AppNotice>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0EDFF] text-[#2C305F]">
            <i className="fa-solid fa-user-group text-2xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2C305F]">
              Total
            </p>
            <p className="text-3xl font-black text-[#0D1742]">
              <AnimatedNumber value={round2Stats.total} />
            </p>
            <p className="text-xs font-semibold text-[#5E5E92]">Applicants</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFEFCA] text-[#A28436]">
            <i className="fa-regular fa-clock text-2xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A28436]">
              Pending
            </p>
            <p className="text-3xl font-black text-[#A28436]">
              <AnimatedNumber value={round2Stats.pending} />
            </p>
            <p className="text-xs font-semibold text-[#A28436]/70">In Review</p>
          </div>
        </div>

        {/* Passed */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <i className="fa-solid fa-check text-2xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Passed
            </p>
            <p className="text-3xl font-black text-emerald-600">
              <AnimatedNumber value={round2Stats.passed} />
            </p>
            <p className="text-xs font-semibold text-emerald-600/70">
              Qualified
            </p>
          </div>
        </div>

        {/* Failed */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#B82649]/10 text-[#B82649]">
            <i className="fa-solid fa-xmark text-2xl" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#B82649]">
              Failed
            </p>
            <p className="text-3xl font-black text-[#B82649]">
              <AnimatedNumber value={round2Stats.failed} />
            </p>
            <p className="text-xs font-semibold text-[#B82649]/70">Rejected</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

            {/* Dept Dropdown */}
            <div className="relative w-full shrink-0 sm:w-56" ref={dropdownRef}>
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
                        onSetDeptFilter(dept);
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

            <div className="flex items-center gap-4 justify-between sm:justify-end">
              {/* Export Button */}
              <div className="relative w-full sm:w-auto" ref={exportRef}>
                <Tooltip
                  content={
                    !isAllDepartmentsLocked
                      ? 'Wait for all 4 Departments to lock their Round 2 evaluations before exporting.'
                      : 'Export List to Excel'
                  }
                >
                  <span
                    className={
                      !isAllDepartmentsLocked
                        ? 'inline-block cursor-not-allowed'
                        : 'inline-block'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      // 👇 ĐỒNG BỘ: Vô hiệu hóa khi đang export HOẶC chưa lock toàn bộ
                      disabled={!isAllDepartmentsLocked || exporting}
                      className="relative flex w-full sm:w-auto items-center justify-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm font-bold text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-600/50 focus:outline-none disabled:pointer-events-none disabled:opacity-60 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-2">
                        <i
                          className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} text-emerald-600`}
                        />
                        {exporting ? 'Exporting…' : 'Export Excel'}
                      </span>
                      {!exporting && (
                        <i
                          className={`fa-solid ${!isAllDepartmentsLocked ? 'fa-lock' : 'fa-chevron-down'} text-gray-400 transition-transform duration-300 ${isExportOpen ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>
                  </span>
                </Tooltip>
                {isExportOpen && !exporting && (
                  <div className="absolute top-full right-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                    <div className="mb-1 border-b border-gray-100 px-3 py-2">
                      <p className="text-[10px] text-center font-black uppercase tracking-wider text-gray-400">
                        Master Export Round 2
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

              {/* Layout Toggles */}
              <div className="flex rounded-xl bg-gray-100 p-1 shrink-0">
                <Tooltip content="Grid View">
                  <button
                    onClick={() => onSetViewMode('grid')}
                    className={`flex size-9 items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#0D1742] text-[#DCB968] shadow-sm' : 'text-gray-500 hover:text-[#0D1742]'}`}
                  >
                    <i className="fa-solid fa-grip" />
                  </button>
                </Tooltip>
                <Tooltip content="List View">
                  <button
                    onClick={() => onSetViewMode('list')}
                    className={`flex size-9 items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0D1742] text-[#DCB968] shadow-sm' : 'text-gray-500 hover:text-[#0D1742]'}`}
                  >
                    <i className="fa-solid fa-list" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        {/* THÊM THANH ROUND 2 TRANSITION BAR Ở ĐÂY ĐỂ ĐỒNG BỘ UI */}
        <div className="mb-6">
          <RoundTransitionBar
            roundName="Round 2"
            department={
              deptFilter === 'All'
                ? null
                : masterViewDeptToApiDepartment(deptFilter)
            }
            evaluated={Math.max(round2Stats.total - round2Stats.pending, 0)}
            total={round2Stats.total}
            isLocked={isCurrentDeptLocked}
            departmentStates={departmentStates}
            departmentStats={ROUND_TRANSITION_DEPARTMENTS.map(
              (dept: DepartmentType) => {
                const deptCands = candidates.filter(
                  (c) => c.department === dept
                ); // Lấy từ 'candidates' gốc, ko phải 'fullyFilteredCandidates'
                let p = 0;
                const pt = deptCands.length;
                deptCands.forEach((c) => {
                  if ((c.round2Status ?? 'Pending') === 'Pending') p++;
                });
                return {
                  department: dept,
                  total: pt,
                  evaluated: Math.max(pt - p, 0),
                };
              }
            )}
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
            {fullyFilteredCandidates.length > 0 ? (
              <>
                <CandidateTable
                  candidates={displayedCandidates}
                  onUpdateStatus={() => {}} // EB read-only
                  viewMode={viewMode}
                  readOnly={true}
                  detailApi="executive"
                  round={2}
                />
                {visibleCount < fullyFilteredCandidates.length && (
                  <div
                    ref={observerTarget}
                    className="mt-6 flex justify-center py-6"
                  >
                    <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-2.5 shadow-sm">
                      <i className="fa-solid fa-spinner fa-spin text-[#DCB968]" />
                      <span className="text-xs font-bold text-[#0D1742]">
                        Loading more candidates...
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-20 text-center shadow-sm">
                <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-gray-50">
                  <i
                    className={`fa-solid ${statusFilter === 'All' ? 'fa-people-group' : 'fa-folder-open'} text-3xl text-gray-400`}
                  />
                </div>
                <p className="text-xl font-black text-[#0D1742]">
                  {statusFilter === 'All'
                    ? 'No candidates in the Round 2 pool yet'
                    : 'No candidates match this filter'}
                </p>
                <p className="mt-2 max-w-md text-balance text-sm font-medium text-gray-500">
                  {statusFilter === 'All'
                    ? 'Passed Round 1 candidates will appear here.'
                    : 'Try selecting a different status.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

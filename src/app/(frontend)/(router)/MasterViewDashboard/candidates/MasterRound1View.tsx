'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import CandidateTable from '@/components/ui/CandidateTable';
import { RoundTransitionBar } from '@/components/eb-dashboard/RoundTransitionBar';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Tooltip } from '@/components/ui/Tooltip';
import { emailLocalPart } from '@/lib/utils';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import {
  MASTER_VIEW_DEPT_OPTIONS,
  type MasterViewDeptFilter,
  masterViewDeptToApiDepartment,
} from '@/lib/executiveMasterViewMapping';

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

type MasterRound1ViewProps = {
  candidates: HeadDashboardListCandidate[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  listEmptyHint: string | null;
  page: number;
  stats: { total: number; pending: number; passed: number; failed: number };
  deptFilter: MasterViewDeptFilter;
  statusFilter: string;
  viewMode: CandidateViewMode;
  isAllDepartmentsLocked: boolean;
  isCurrentDeptLocked: boolean;
  departmentStates: Array<{
    department: DepartmentType;
    isRound1Locked: boolean;
    isRound2Locked: boolean;
  }>;
  departmentStats: Array<{
    department: DepartmentType;
    evaluated: number;
    total: number;
  }>;
  isRecruitmentActive: boolean;
  onSetDeptFilter: (d: MasterViewDeptFilter) => void;
  onSetStatusFilter: (s: string) => void;
  onSetViewMode: (m: CandidateViewMode) => void;
  onLoadMore: (p: number) => void;
  onRetry: () => void;
};

export function MasterRound1View({
  candidates,
  loading,
  loadingMore,
  hasMore,
  error,
  listEmptyHint,
  page,
  stats,
  deptFilter,
  statusFilter,
  viewMode,
  isAllDepartmentsLocked,
  isCurrentDeptLocked,
  departmentStates,
  departmentStats,
  isRecruitmentActive,
  onSetDeptFilter,
  onSetStatusFilter,
  onSetViewMode,
  onLoadMore,
  onRetry,
}: MasterRound1ViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          onLoadMore(page + 1);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, onLoadMore]);

  const downloadExcelExport = async (status: 'Pass' | 'Fail') => {
    if (!isAllDepartmentsLocked || exporting) return;
    setExportError(null);
    setExporting(true);
    setIsExportOpen(false);
    try {
      const res = await fetch(
        `/api/executive/export/round-1?status=${status}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let filename = `Executive_Round_1_${status}_List.xlsx`;
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

  const filteredCandidates = useMemo(() => {
    let result = candidates;
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
  }, [searchQuery, candidates]);

  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  if (error) {
    return (
      <AppNotice
        variant="error"
        title="Could not load data"
        action={
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-[#B82649]/10 px-3 py-1.5 text-sm font-semibold text-[#B82649] hover:bg-[#B82649]/20"
          >
            Retry
          </button>
        }
      >
        {error}
      </AppNotice>
    );
  }

  return (
    <div className="relative animate-in fade-in duration-500 space-y-6">
      {exportError && (
        <AppNotice variant="error" onDismiss={() => setExportError(null)}>
          {exportError}
        </AppNotice>
      )}

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
            <p className="text-xs font-semibold text-[#A28436]/70">In Review</p>
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
            <p className="text-xs font-semibold text-[#B82649]/70">Rejected</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex w-full overflow-x-auto rounded-xl bg-gray-100 p-1 sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSetStatusFilter(option)}
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
            <div className="relative w-full shrink-0 sm:w-72 lg:w-64 xl:w-72">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Search by sID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-11 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/50 focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4 justify-between sm:justify-end">
              <div className="relative w-full sm:w-auto" ref={exportRef}>
                <Tooltip
                  content={
                    !isAllDepartmentsLocked
                      ? 'Wait for all 4 Departments to lock their Round 1 evaluations before exporting.'
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
                {isExportOpen && isAllDepartmentsLocked && (
                  <div className="absolute top-full right-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                    <div className="mb-1 border-b border-gray-100 px-3 py-2">
                      <p className="text-[10px] text-center font-black uppercase tracking-wider text-gray-400">
                        Master Export Round 1
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
        <div className="mb-6">
          <RoundTransitionBar
            roundName="Round 1"
            department={
              deptFilter === 'All'
                ? null
                : masterViewDeptToApiDepartment(deptFilter)
            }
            evaluated={Math.max(stats.total - stats.pending, 0)}
            total={stats.total}
            isLocked={isCurrentDeptLocked}
            departmentStates={departmentStates}
            departmentStats={departmentStats}
            isRecruitmentActive={isRecruitmentActive}
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
                  candidates={filteredCandidates}
                  onUpdateStatus={() => {}} // EB read-only
                  viewMode={viewMode}
                  readOnly={true}
                  detailApi="executive"
                  round={1}
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
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-20 text-center shadow-sm">
                <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-gray-50">
                  <i
                    className={`fa-solid ${statusFilter === 'All' ? 'fa-people-group' : 'fa-folder-open'} text-3xl text-gray-400`}
                  />
                </div>
                <p className="text-xl font-black text-[#0D1742]">
                  {statusFilter === 'All'
                    ? 'No candidates found'
                    : 'No candidates match this filter'}
                </p>
                <p className="mt-2 max-w-md text-balance text-sm font-medium text-gray-500">
                  {listEmptyHint ??
                    'Try adjusting your search or filter settings.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

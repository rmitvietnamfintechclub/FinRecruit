'use client';

import { useMemo, useState } from 'react';
import CandidateTable from '@/components/ui/CandidateTable';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import { RoundTransitionBar } from '@/components/head-dashboard/RoundTransitionBar';
import type { DashboardStatus } from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';
import type { DepartmentType } from '@/app/(backend)/types';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Tooltip } from '@/components/ui/Tooltip';

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

type Round2EvaluationProps = {
  headDepartment: DepartmentType | null;
  candidates: HeadDashboardListCandidate[];
  loading: boolean;
  error: string | null;
  round2Locked: boolean;
  isLockingRound2: boolean;
  viewMode: CandidateViewMode;
  onSetViewMode: (mode: CandidateViewMode) => void;
  onLockRound2: () => Promise<{ success: boolean; message?: string }>;
  onUpdateStatusRequest: (id: string, newStatus: DashboardStatus) => void;
};

export function Round2Evaluation({
  headDepartment,
  candidates,
  loading,
  error,
  round2Locked,
  isLockingRound2,
  viewMode,
  onSetViewMode,
  onLockRound2,
  onUpdateStatusRequest,
}: Round2EvaluationProps) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 1. TÍNH TOÁN STATS REAL-TIME TỪ ARRAY
  const round2Stats = useMemo(() => {
    let pending = 0;
    let passed = 0;
    let failed = 0;

    candidates.forEach((c) => {
      const status = c.round2Status ?? 'Pending';
      if (status === 'Pending') pending++;
      else if (status === 'Pass') passed++;
      else if (status === 'Fail') failed++;
    });

    return {
      total: candidates.length,
      pending,
      passed,
      failed,
      evaluated: passed + failed,
    };
  }, [candidates]);

  // 2. LỌC DANH SÁCH BẰNG CLIENT-SIDE
  const filteredCandidates = useMemo(() => {
    if (statusFilter === 'All') return candidates;
    return candidates.filter((c) => {
      const currentStatus = c.round2Status ?? 'Pending';
      return currentStatus === statusFilter;
    });
  }, [candidates, statusFilter]);

  const handleExportExcel = async (status: 'Pass' | 'Fail') => {
    if (exporting || !headDepartment) return;
    try {
      setExporting(true);
      setExportOpen(false);
      setExportError(null);

      const endpoint = `/api/head-dashboard/export/round-2?status=${status}&department=${encodeURIComponent(headDepartment)}`;
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
      link.download = `${headDepartment}_Round_2_Final_${status}_List.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Failed to export Excel file.'
      );
    } finally {
      setExporting(false);
    }
  };

  const isExportDisabled = exporting || !round2Locked;
  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  return (
    <div className="relative mt-4 animate-in fade-in duration-500 space-y-6">
      {exportError && (
        <AppNotice variant="error" onDismiss={() => setExportError(null)}>
          {exportError}
        </AppNotice>
      )}

      <RoundTransitionBar
        roundName="Round 2"
        evaluated={round2Stats.evaluated}
        total={round2Stats.total}
        isLocked={round2Locked}
        locking={isLockingRound2}
        canLock={
          round2Stats.pending === 0 && round2Stats.total > 0 && !round2Locked
        }
        isPendingLock={
          round2Stats.total > 0 && round2Stats.pending === 0 && !round2Locked
        }
        lockDisabledReason={
          round2Stats.pending > 0
            ? `Resolve ${round2Stats.pending} pending candidate${round2Stats.pending > 1 ? 's' : ''} to lock.`
            : null
        }
        lockedTitle="Round 2 Evaluation closed"
        lockedDescription="Results are final. Passed candidates are now ready for the Probation phase."
        lockedSuccessMessage="Round 2 has been successfully locked. Candidate statuses are now final."
        lockConfirmDescription={
          <div className="flex flex-col gap-4">
            <p className="text-gray-600">
              All <span className="font-bold text-emerald-600">Passed</span>{' '}
              candidates will advance to the Probation phase, and this
              evaluation round will become{' '}
              <span className="font-bold text-gray-900">read-only</span>.
            </p>
            <div className="rounded-lg border border-[#F7D27F] bg-[#FFEFCA] p-3 text-xs font-semibold text-[#A28436]">
              <i className="fa-solid fa-triangle-exclamation mr-1.5" />
              This action cannot be undone from the dashboard. Make sure all
              results are accurate.
            </div>
          </div>
        }
        onLock={onLockRound2}
      />

      {/* STATS GRID - TRỰC TIẾP LẤY TỪ round2Stats */}
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
              <AnimatedNumber value={round2Stats.total} />
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
              <AnimatedNumber value={round2Stats.pending} />
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
              <AnimatedNumber value={round2Stats.passed} />
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
              <AnimatedNumber value={round2Stats.failed} />
            </p>
            <p className="text-xs font-semibold text-[#B82649]/70">Rejected</p>
          </div>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
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
          <Tooltip
            content={
              round2Locked
                ? 'Export list to Excel'
                : 'Confirm & Lock Round 2 to export results'
            }
          >
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
                    } ml-1 text-xs text-gray-400 transition-transform ${exportOpen ? 'rotate-180' : ''}`}
                  />
                )}
                {exportOpen && !isExportDisabled && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                    <div className="mb-1 border-b border-gray-100 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Export Round 2
                      </p>
                    </div>
                    <div className="px-1 pb-1">
                      <button
                        type="button"
                        onClick={() => void handleExportExcel('Pass')}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-gray-50"
                      >
                        <i className="fa-solid fa-check text-emerald-600" />{' '}
                        Passed candidates
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleExportExcel('Fail')}
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
                onClick={() => onSetViewMode('grid')}
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
                onClick={() => onSetViewMode('list')}
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

      {loading && !error ? (
        <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-sm">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-[#DCB968]" />
          <p className="mt-4 text-sm font-bold text-[#0D1742]">
            Loading candidates…
          </p>
        </div>
      ) : filteredCandidates.length > 0 ? (
        <CandidateTable
          candidates={filteredCandidates} // Sử dụng danh sách ĐÃ LỌC
          onUpdateStatus={(id, newStatus) =>
            onUpdateStatusRequest(id, newStatus as DashboardStatus)
          }
          viewMode={viewMode}
          readOnly={round2Locked}
          round={2}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-20 text-center shadow-sm">
          <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-gray-50">
            <i
              className={`fa-solid ${
                statusFilter === 'All' ? 'fa-people-group' : 'fa-folder-open'
              } text-3xl text-gray-400`}
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
  );
}

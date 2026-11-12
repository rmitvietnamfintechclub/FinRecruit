'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import CandidateTable from '@/components/ui/CandidateTable';
import { RoundTransitionBar } from '@/components/member-dashboard/RoundTransitionBar';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Tooltip } from '@/components/ui/Tooltip';
import { emailLocalPart } from '@/lib/utils';
import type { CandidateViewMode } from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';

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

type MemberRound1ViewProps = {
  department: DepartmentType | null;
  candidates: HeadDashboardListCandidate[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  listEmptyHint: string | null;
  page: number;
  stats: { total: number; pending: number; passed: number; failed: number, incomingSecondChoicePending?: number; };
  statusFilter: string;
  viewMode: CandidateViewMode;
  isLocked: boolean;
  isRecruitmentActive: boolean;
  onSetStatusFilter: (s: string) => void;
  onSetViewMode: (m: CandidateViewMode) => void;
  onLoadMore: (p: number) => void;
  onRetry: () => void;
};

export function MemberRound1View({
  department,
  candidates,
  loading,
  loadingMore,
  hasMore,
  error,
  listEmptyHint,
  page,
  stats,
  statusFilter,
  viewMode,
  isLocked,
  isRecruitmentActive,
  onSetStatusFilter,
  onSetViewMode,
  onLoadMore,
  onRetry,
}: MemberRound1ViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);

  // Intersection Observer for Infinite Scroll
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

  // Client-side search filtering
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
  const evaluatedCount = Math.max(stats.total - stats.pending, 0);

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* STATS CARDS */}
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

      <div className="relative mt-4">
        <RoundTransitionBar
          roundName="Round 1"
          department={department ?? 'Loading...'}
          evaluated={evaluatedCount}
          total={stats.total}
          isLocked={isLocked}
          isRecruitmentActive={isRecruitmentActive}
          isLoading={loading && candidates.length === 0}
          incomingSecondChoicePending={stats.incomingSecondChoicePending ?? 0}
        />

        {loading && !error && candidates.length === 0 ? (
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
                  onUpdateStatus={() => {}} // Read-only for member
                  viewMode={viewMode}
                  readOnly={true}
                  detailApi="member-dashboard"
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

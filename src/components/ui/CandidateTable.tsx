'use client';

import { useState, useMemo } from 'react';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import { emailLocalPart } from '@/lib/utils';
import { formatFullDateTime } from '@/lib/formatRelativeTime';
import {
  SECOND_CHOICE_BADGE_LABEL,
  secondChoiceTooltip,
} from '@/lib/candidateRoutingCopy';
import CandidateModal from './CandidateModal';
import { Tooltip } from '@/components/ui/Tooltip';

export type CandidateViewMode = 'grid' | 'list';

interface CandidateTableProps {
  candidates: HeadDashboardListCandidate[];
  onUpdateStatus: (id: string, newStatus: 'Pass' | 'Fail' | 'Pending') => void;
  /** Executive MasterView: no PATCH status API yet — hide quick actions + pass readOnly to modal */
  readOnly?: boolean;
  detailApi?: 'head' | 'executive';
  /** Layout for the candidate list. Defaults to `'grid'` (card layout). */
  viewMode?: CandidateViewMode;
}

export default function CandidateTable({
  candidates,
  onUpdateStatus,
  readOnly = false,
  detailApi = 'head',
  viewMode = 'grid',
}: CandidateTableProps) {
  const [selectedCandidate, setSelectedCandidate] =
    useState<HeadDashboardListCandidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Sync the modal's data with fresh candidate from the list ---
  const displayedSelectedCandidate = useMemo(() => {
    if (!selectedCandidate) return null;
    const updated = candidates.find((c) => c.id === selectedCandidate.id);
    return updated || selectedCandidate;
  }, [selectedCandidate, candidates]);

  const handleViewDetails = (candidate: HeadDashboardListCandidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  // Chuẩn hóa Badge màu theo FinTech Club Palette
  const statusBadgeClass = (status: HeadDashboardListCandidate['status']) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm border ${
      status === 'Pass'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : status === 'Pending'
          ? 'border-[#F7D27F] bg-[#FFEFCA] text-[#A28436]'
          : 'border-[#B82649]/30 bg-[#B82649]/10 text-[#B82649]'
    }`;

  const statusIconClass = (status: HeadDashboardListCandidate['status']) =>
    status === 'Pass'
      ? 'fa-solid fa-check'
      : status === 'Pending'
        ? 'fa-solid fa-clock'
        : 'fa-solid fa-xmark';

  const appliedLabel = (candidate: HeadDashboardListCandidate) => {
    const appliedAt = candidate.createdAt ?? candidate.appliedAt;
    return formatFullDateTime(appliedAt);
  };

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-card-entry {
          animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0; 
        }
        @keyframes slideInLeftFade {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-row-entry {
          animation: slideInLeftFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>

      {viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* List Header (md+) */}
          <div className="hidden grid-cols-[1.7fr_1.3fr_1fr_0.9fr_minmax(220px,auto)] gap-4 bg-gray-50 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 md:grid">
            <div>Candidate</div>
            <div>Department</div>
            <div>Applied</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          <ul className="divide-y divide-gray-100">
            {candidates.map((candidate, index) => (
              <li
                key={candidate.id}
                className="group grid grid-cols-1 gap-3 px-5 py-4 transition-colors duration-200 animate-row-entry hover:bg-gray-50 md:grid-cols-[1.7fr_1.3fr_1fr_0.9fr_minmax(220px,auto)] md:items-center md:gap-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Candidate */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base text-blue-600 shadow-sm">
                    <i className="fa-solid fa-user" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900">
                      {candidate.fullName}
                    </p>
                    <p className="truncate text-xs font-bold text-gray-500">
                      {emailLocalPart(candidate.email)}
                    </p>
                  </div>
                </div>

                {/* Department */}
                <div className="flex flex-col items-start min-w-0">
                  <p className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400 md:hidden">
                    Department
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900">
                    {candidate.department}
                  </p>

                  {candidate.routing.currentStage === 'choice2' ? (
                    <Tooltip content={secondChoiceTooltip(candidate.choice1)}>
                      <span className="mt-1.5 inline-flex cursor-help items-center gap-1 rounded-full border border-[#E0D8FF] bg-[#F0EDFF] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#2C305F] shadow-sm">
                        <i className="fa-solid fa-share" aria-hidden />
                        {SECOND_CHOICE_BADGE_LABEL}
                      </span>
                    </Tooltip>
                  ) : null}
                </div>

                {/* Applied date */}
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400 md:hidden">
                    Applied
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900">
                    {appliedLabel(candidate)}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <span className={statusBadgeClass(candidate.status)}>
                    <i className={statusIconClass(candidate.status)} />
                    {candidate.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                  {!readOnly && (
                    <div className="flex items-center gap-2 mr-2">
                      <Tooltip content="Quick Pass">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(candidate.id, 'Pass')}
                          className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm transition-colors hover:bg-emerald-500 hover:text-white"
                        >
                          <i className="fa-solid fa-check"></i>
                        </button>
                      </Tooltip>
                      <Tooltip content="Quick Fail">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(candidate.id, 'Fail')}
                          className="flex size-9 items-center justify-center rounded-full bg-[#B82649]/10 text-[#B82649] shadow-sm transition-colors hover:bg-[#B82649] hover:text-white"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </Tooltip>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleViewDetails(candidate)}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#0D1742] px-4 text-xs font-bold text-[#DCB968] shadow-sm transition-colors hover:bg-[#0D1742]/90"
                  >
                    Review Profile
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate, index) => (
            <div
              key={candidate.id}
              className="group relative flex flex-col rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 animate-card-entry hover:-translate-y-1 hover:border-[#0D1742]/30 hover:shadow-xl sm:p-6 lg:p-7"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Card Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="line-clamp-1 text-xl font-black tracking-tight text-gray-900">
                    {candidate.fullName}
                  </h3>
                  <p className="mt-1 text-sm font-bold text-gray-500">
                    {emailLocalPart(candidate.email)}
                  </p>
                </div>
                <span className={statusBadgeClass(candidate.status)}>
                  <i className={statusIconClass(candidate.status)}></i>
                  {candidate.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="mb-8 flex flex-1 flex-col space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 shadow-sm">
                    <i className="fa-solid fa-graduation-cap"></i>
                  </div>
                  <div className="flex flex-1 flex-col items-start overflow-hidden pt-0.5">
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Current Department
                    </p>
                    <p className="truncate text-sm font-bold text-gray-900">
                      {candidate.department}
                    </p>
                    {candidate.routing.currentStage === 'choice2' && (
                      <Tooltip content={secondChoiceTooltip(candidate.choice1)}>
                        <span className="mt-1.5 inline-flex cursor-help items-center gap-1.5 rounded-full border border-[#E0D8FF] bg-[#F0EDFF] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#2C305F] shadow-sm">
                          <i
                            className="fa-solid fa-share shrink-0"
                            aria-hidden
                          />
                          {SECOND_CHOICE_BADGE_LABEL}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 shadow-sm">
                    <i className="fa-solid fa-cake-candles"></i>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Date of Birth
                    </p>
                    <p className="truncate text-sm font-bold text-gray-900">
                      {candidate.dob?.trim() ? candidate.dob : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 shadow-sm">
                    <i className="fa-regular fa-calendar-check"></i>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Applied On
                    </p>
                    <p className="truncate text-sm font-bold text-gray-900">
                      {appliedLabel(candidate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-5">
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <Tooltip content="Quick Pass">
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(candidate.id, 'Pass')}
                        className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm transition-colors hover:bg-emerald-500 hover:text-white"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                    </Tooltip>
                    <Tooltip content="Quick Fail">
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(candidate.id, 'Fail')}
                        className="flex size-10 items-center justify-center rounded-full bg-[#B82649]/10 text-[#B82649] shadow-sm transition-colors hover:bg-[#B82649] hover:text-white"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </Tooltip>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleViewDetails(candidate)}
                  className={`ml-auto inline-flex h-10 items-center justify-center rounded-xl bg-[#0D1742] px-5 text-sm font-bold text-[#DCB968] shadow-sm transition-colors hover:bg-[#0D1742]/90`}
                >
                  Review Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CandidateModal
        candidate={displayedSelectedCandidate}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdateStatus={onUpdateStatus}
        detailApi={detailApi}
        readOnly={readOnly}
      />
    </>
  );
}

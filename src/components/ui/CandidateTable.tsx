"use client";

import React, { useState, useMemo } from 'react';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import { emailLocalPart } from '@/lib/utils';
import {
  formatFullDateTime,
  formatRelativeTime,
} from '@/lib/formatRelativeTime';
import {
  SECOND_CHOICE_BADGE_LABEL,
  secondChoiceTooltip,
} from '@/lib/candidateRoutingCopy';
import { useRelativeNowTick } from '@/hooks/useRelativeNowTick';
import CandidateModal from './CandidateModal';

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
  const now = useRelativeNowTick();
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

  const statusBadgeClass = (status: HeadDashboardListCandidate['status']) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm border ${
      status === 'Pass'
        ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-900/50 dark:bg-green-900/30 dark:text-green-400'
        : status === 'Pending'
          ? 'border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-400'
          : 'border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400'
    }`;

  const statusIconClass = (status: HeadDashboardListCandidate['status']) =>
    status === 'Pass'
      ? 'fa-solid fa-check'
      : status === 'Pending'
        ? 'fa-solid fa-clock'
        : 'fa-solid fa-xmark';

  const appliedLabel = (candidate: HeadDashboardListCandidate) => {
    const appliedAt = candidate.createdAt ?? candidate.appliedAt;
    return {
      relative: formatRelativeTime(appliedAt, now),
      full: formatFullDateTime(appliedAt),
    };
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
        <div className="bg-card border-border overflow-x-auto rounded-2xl border shadow-sm">
          {/* List Header (md+) */}
          <div className="text-muted-foreground bg-muted/40 hidden md:grid md:grid-cols-[1.7fr_1.3fr_1fr_0.9fr_minmax(220px,auto)] gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-wider">
            <div>Candidate</div>
            <div>Department</div>
            <div>Applied</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          <ul className="divide-border divide-y">
            {candidates.map((candidate, index) => (
              <li
                key={candidate.id}
                className="animate-row-entry group hover:bg-muted/40 grid grid-cols-1 gap-3 px-5 py-4 transition-colors duration-200 md:grid-cols-[1.7fr_1.3fr_1fr_0.9fr_minmax(220px,auto)] md:items-center md:gap-4"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Candidate */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-base shadow-sm dark:bg-blue-900/30 dark:text-blue-400">
                    <i className="fa-solid fa-user" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-foreground truncate text-sm font-black"
                      title={candidate.fullName}
                    >
                      {candidate.fullName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs font-bold">
                      {emailLocalPart(candidate.email)}
                    </p>
                  </div>
                </div>

                {/* Department */}
                <div className="min-w-0">
                  <p className="text-muted-foreground/70 md:hidden text-[10px] font-black uppercase tracking-wider mb-0.5">
                    Department
                  </p>
                  <p className="text-foreground truncate text-sm font-bold">
                    {candidate.department}
                  </p>
                  <p className="text-muted-foreground truncate text-xs font-medium">
                    {candidate.generation}
                    {candidate.routing.currentStage === 'choice2' ? (
                      <span
                        className="ml-2 inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300"
                        title={secondChoiceTooltip(candidate.choice1)}
                      >
                        <i className="fa-solid fa-shuffle" aria-hidden />
                        {SECOND_CHOICE_BADGE_LABEL}
                      </span>
                    ) : null}
                  </p>
                </div>

                {/* Applied date */}
                <div className="min-w-0">
                  <p className="text-muted-foreground/70 md:hidden text-[10px] font-black uppercase tracking-wider mb-0.5">
                    Applied
                  </p>
                  <p
                    className="text-foreground truncate text-sm font-bold"
                    title={appliedLabel(candidate).full}
                  >
                    {appliedLabel(candidate).relative}
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
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(candidate.id, 'Pass')}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600 shadow-sm transition-colors hover:bg-green-500 hover:text-white dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white"
                        title="Quick Pass"
                      >
                        <i className="fa-solid fa-check" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(candidate.id, 'Fail')}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-sm transition-colors hover:bg-red-500 hover:text-white dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                        title="Quick Fail"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleViewDetails(candidate)}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-50 px-4 text-xs font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                  >
                    Review Profile
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate, index) => (
          <div 
            key={candidate.id} 
            className="animate-card-entry group relative flex flex-col rounded-[24px] border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 sm:p-6 lg:p-7 dark:hover:border-blue-800"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Card Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tight text-foreground line-clamp-1" title={candidate.fullName}>
                  {candidate.fullName}
                </h3>
                <p className="mt-1 text-sm font-bold text-muted-foreground">
                  {emailLocalPart(candidate.email)}
                </p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm border
                ${candidate.status === 'Pass' ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-900/50 dark:bg-green-900/30 dark:text-green-400' : ''}
                ${candidate.status === 'Pending' ? 'border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                ${candidate.status === 'Fail' ? 'border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-400' : ''}
              `}>
                <i className={`
                  ${candidate.status === 'Pass' ? 'fa-solid fa-check' : ''}
                  ${candidate.status === 'Pending' ? 'fa-solid fa-clock' : ''}
                  ${candidate.status === 'Fail' ? 'fa-solid fa-xmark' : ''}
                `}></i>
                {candidate.status}
              </span>
            </div>

            {candidate.routing.currentStage === 'choice2' && (
              <div className="-mt-2 mb-4">
                <span
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-violet-800 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300"
                  title={secondChoiceTooltip(candidate.choice1)}
                >
                  <i className="fa-solid fa-shuffle shrink-0" aria-hidden />
                  {SECOND_CHOICE_BADGE_LABEL}
                </span>
              </div>
            )}

            {/* Card Body */}
            <div className="mb-8 flex-1 flex flex-col space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm dark:bg-blue-900/30 dark:text-blue-400">
                  <i className="fa-solid fa-graduation-cap"></i>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 mb-0.5">Current Department</p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {candidate.department}{' '}
                    <span className="font-medium text-muted-foreground">
                      • {candidate.generation}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm dark:bg-blue-900/30 dark:text-blue-400">
                  <i className="fa-solid fa-cake-candles"></i>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 mb-0.5">Date of Birth</p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {candidate.dob?.trim() ? candidate.dob : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm dark:bg-blue-900/30 dark:text-blue-400">
                  <i className="fa-regular fa-calendar-check"></i>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 mb-0.5">Applied On</p>
                  <p
                    className="truncate text-sm font-bold text-foreground"
                    title={appliedLabel(candidate).full}
                  >
                    {appliedLabel(candidate).relative}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between border-t border-border pt-5 mt-auto">
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(candidate.id, 'Pass')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 transition-colors hover:bg-green-500 hover:text-white tooltip-trigger shadow-sm dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white"
                    title="Quick Pass"
                  >
                    <i className="fa-solid fa-check"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(candidate.id, 'Fail')}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-500 hover:text-white tooltip-trigger shadow-sm dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                    title="Quick Fail"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleViewDetails(candidate)}
                className={`inline-flex h-10 items-center justify-center rounded-xl bg-blue-50 px-5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-600 hover:text-white shadow-sm dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white ${readOnly ? 'ml-auto' : ''}`}
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
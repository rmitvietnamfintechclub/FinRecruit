"use client";

import React, { useState, useMemo } from 'react';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import { emailLocalPart } from '@/lib/utils';
import CandidateModal from './CandidateModal';

interface CandidateTableProps {
  candidates: HeadDashboardListCandidate[];
  onUpdateStatus: (id: string, newStatus: 'Pass' | 'Fail' | 'Pending') => void;
}

export default function CandidateTable({ candidates, onUpdateStatus }: CandidateTableProps) {
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
      `}</style>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate, index) => (
          <div 
            key={candidate.id} 
            className="animate-card-entry group relative flex flex-col rounded-[24px] border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800"
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
                  title={`Thí sinh đã qua vòng ban lựa chọn 1 (${candidate.choice1}), hiện xét tại ban của bạn.`}
                >
                  <i className="fa-solid fa-shuffle shrink-0" aria-hidden />
                  Lựa chọn 2
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
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 mb-0.5">Academic Info</p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {candidate.choice1}{' '}
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
                  <p className="truncate text-sm font-bold text-foreground">
                    {candidate.createdAt
                      ? new Date(candidate.createdAt).toLocaleDateString('en-GB')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between border-t border-border pt-5 mt-auto">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onUpdateStatus(candidate.id, 'Pass')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 transition-colors hover:bg-green-500 hover:text-white tooltip-trigger shadow-sm dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white"
                  title="Quick Pass"
                >
                  <i className="fa-solid fa-check"></i>
                </button>
                <button 
                  onClick={() => onUpdateStatus(candidate.id, 'Fail')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-500 hover:text-white tooltip-trigger shadow-sm dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                  title="Quick Fail"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              
              <button 
                onClick={() => handleViewDetails(candidate)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-50 px-5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-600 hover:text-white shadow-sm dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
              >
                Review Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      <CandidateModal 
        candidate={displayedSelectedCandidate}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdateStatus={onUpdateStatus}
      />
    </>
  );
}
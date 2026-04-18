"use client";

import React, { FC } from 'react';
import { ICandidateFrontend } from '@/types/frontend';

interface CandidateModalProps {
  candidate: ICandidateFrontend | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: 'Pass' | 'Fail' | 'Pending') => void;
}

export const CandidateModal: FC<CandidateModalProps> = ({ candidate, isOpen, onClose, onUpdateStatus }) => {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300">
      
      {/* MODAL CONTAINER: Flex column setup.
        Max height is 90% of screen. Hidden overflow keeps the rounded corners sharp. 
      */}
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-card border border-border shadow-2xl transition-transform duration-300 transform scale-100 font-sans overflow-hidden">
        
        {/* --- HEADER (Sticky at Top) --- */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card p-8">
          <h1 className="text-3xl font-black tracking-tight text-blue-950 dark:text-blue-400">
            Application Form - <span className="font-bold text-foreground">{candidate.fullName}</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-sm border
                ${candidate.status === 'Pass' ? 'border-green-200 bg-green-100 text-green-700' : ''}
                ${candidate.status === 'Pending' ? 'border-yellow-200 bg-yellow-100 text-yellow-700' : ''}
                ${candidate.status === 'Fail' ? 'border-red-200 bg-red-100 text-red-700' : ''}
              `}>
                <i className={`
                  ${candidate.status === 'Pass' ? 'fa-solid fa-check' : ''}
                  ${candidate.status === 'Pending' ? 'fa-solid fa-clock' : ''}
                  ${candidate.status === 'Fail' ? 'fa-solid fa-xmark' : ''}
                `}></i>
                {candidate.status}
              </span>
            
            <button 
              onClick={onClose} 
              className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>
        </div>

        {/* --- BODY (Scrollable Middle Section) --- */}
        <div className="flex-1 overflow-y-auto p-8 bg-card">
          <div className="space-y-10 max-w-3xl mx-auto">
            
            {/* I. Personal Information */}
            <section>
              <h2 className="text-xl font-bold tracking-tight text-blue-950 dark:text-blue-400 mb-6 flex items-center gap-3">
                 I. Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                {/* Row 1 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-regular fa-envelope"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Your sID Email <span className="text-red-500">*</span></p>
                    <p className="text-sm font-bold text-foreground truncate">{candidate.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-regular fa-user"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Your Name <span className="text-red-500">*</span></p>
                    <p className="text-sm font-bold text-foreground truncate">{candidate.fullName}</p>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-solid fa-birthday-cake"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Date of Birth <span className="text-red-500">*</span></p>
                    <p className="text-sm font-bold text-foreground truncate">{candidate.dob || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-solid fa-phone"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Your Phone Number <span className="text-red-500">*</span></p>
                    <p className="text-sm font-bold text-foreground truncate">{candidate.phone}</p>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="flex items-start gap-4 col-span-1 md:col-span-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-solid fa-graduation-cap"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Your Major and Academic Year <span className="text-red-500">*</span></p>
                    <p className="text-sm font-bold text-foreground truncate">{candidate.major || candidate.choice1} • {candidate.generation}</p>
                  </div>
                </div>

                {/* Row 4 (Links) */}
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-brands fa-facebook"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Your Facebook Profile Link <span className="text-red-500">*</span></p>
                    <a href={candidate.fbLink || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1.5">
                      View Facebook
                      <i className="fa-solid fa-up-right-from-square text-[10px]"></i>
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600/80 text-lg shadow-sm">
                    <i className="fa-regular fa-file-alt"></i>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-0.5">Please attach your CV <span className="text-red-500">*</span></p>
                    <a href={candidate.cvLink || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1.5">
                      View CV / Portfolio
                      <i className="fa-solid fa-up-right-from-square text-[10px]"></i>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* II. General Questions */}
            <section className="border-t border-border pt-8">
              <h2 className="text-xl font-bold tracking-tight text-blue-950 dark:text-blue-400 mb-6 flex items-center gap-3">
                 II. General Questions
              </h2>
              
              <div className="space-y-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="font-bold text-blue-950 mt-0.5">1.</div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-blue-950">
                      What are your plans for the year of 2026 and 2027? <span className="text-red-500">*</span>
                    </p>
                    {/* Using the dynamic candidate.plans_text data here now */}
                    <div className="w-full rounded-2xl bg-muted/40 p-6 border border-border text-sm font-medium text-foreground mt-3 leading-relaxed whitespace-pre-wrap shadow-inner">
                      {candidate.plans_text || 'No plans submitted.'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* --- FOOTER (Sticky at Bottom, Centered Buttons) --- */}
        <div className="flex shrink-0 items-center justify-center gap-6 border-t border-border bg-card p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
          <button 
            // Removed onClose() from here
            onClick={() => onUpdateStatus(candidate._id, 'Fail')}
            className="w-40 rounded-xl border-2 border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-md"
          >
            Fail
          </button>
          <button 
            // Removed onClose() from here
            onClick={() => onUpdateStatus(candidate._id, 'Pending')}
            className="w-40 rounded-xl border-2 border-yellow-200 bg-yellow-50 px-6 py-3 text-sm font-black text-yellow-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-yellow-500 hover:text-white hover:border-yellow-500 hover:shadow-md"
          >
            Pending
          </button>
          <button 
            // Removed onClose() from here
            onClick={() => onUpdateStatus(candidate._id, 'Pass')}
            className="w-40 rounded-xl border-2 border-green-200 bg-green-50 px-6 py-3 text-sm font-black text-green-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-md"
          >
            Pass
          </button>
        </div>

      </div>
    </div>
  );
};

export default CandidateModal;
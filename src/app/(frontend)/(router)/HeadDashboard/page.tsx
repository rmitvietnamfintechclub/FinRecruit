"use client";

import React, { useState, useMemo } from 'react';
import CandidateTable from '@/components/ui/CandidateTable';
import { ICandidateFrontend } from '@/types/frontend';

const AnimatedNumber = ({ value }: { value: number }) => {
  return (
    <>
      <style>{`
        @keyframes slideInUpFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInDownFade {
          0% { opacity: 0; transform: translateY(-15px); }
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

const initialMockCandidates: ICandidateFrontend[] = [
  { 
    _id: '1', 
    studentId: 's3123456', 
    fullName: 'Nguyen Dang Khoa', 
    email: 's3123456@rmit.edu.vn', 
    phone: '0123456789', 
    cvLink: '#', 
    choice1: 'Technology', 
    department: 'Technology', 
    status: 'Pending', 
    generation: 'Year 2', 
    semester: '2026A', 
    appliedAt: new Date().toISOString(),
    major: 'Software Engineering',
    dob: '15/09/2006'
  },
  { 
    _id: '2', 
    studentId: 's3987654', 
    fullName: 'Dang Hoang Gia Khanh', 
    email: 's3987654@rmit.edu.vn', 
    phone: '0987654321', 
    cvLink: '#', 
    choice1: 'Technology', 
    department: 'Technology', 
    status: 'Pass', 
    generation: 'Year 1', 
    semester: '2026A', 
    appliedAt: new Date().toISOString(),
    major: 'Software Engineering',
    dob: '22/03/2007'
  },
  { 
    _id: '3', 
    studentId: 's3156754', 
    fullName: 'Nguyen Thi Thu Huong', 
    email: 's3156754@rmit.edu.vn', 
    phone: '0742523454', 
    cvLink: '#', 
    choice1: 'Technology', 
    department: 'Technology', 
    status: 'Fail', 
    generation: 'Year 1', 
    semester: '2026A', 
    appliedAt: new Date().toISOString(),
    major: 'Information Technology',
    dob: '10/11/2007'
  },
  { 
    _id: '4', 
    studentId: 's3314566', 
    fullName: 'Chenh Hung Minh', 
    email: 's3314566@rmit.edu.vn', 
    phone: '0315136631', 
    cvLink: '#', 
    choice1: 'Technology', 
    department: 'Technology', 
    status: 'Pass', 
    generation: 'Year 1', 
    semester: '2026A', 
    appliedAt: new Date().toISOString(),
    major: 'Computer Science',
    dob: '05/01/2007'
  },
  { 
    _id: '5', 
    studentId: 's3676767', 
    fullName: 'Le Tan Vu', 
    email: 's3676767@rmit.edu.vn', 
    phone: '0945534667', 
    cvLink: '#', 
    choice1: 'Technology', 
    department: 'Technology', 
    status: 'Pending', 
    generation: 'Year 1', 
    semester: '2026A', 
    appliedAt: new Date().toISOString(),
    major: 'Information Technology',
    dob: '19/09/2007'
  },
  { 
    _id: '6', 
    studentId: 's3696969', 
    fullName: 'Nguyen Van Thinh', 
    email: 's3696969@rmit.edu.vn', 
    phone: '0357234569', 
    cvLink: '#', 
    choice1: 'Technology', 
    department: 'Technology', 
    status: 'Fail', 
    generation: 'Year 2', 
    semester: '2026A', 
    appliedAt: new Date().toISOString(),
    major: 'Data Science',
    dob: '27/12/2006'
  }
];

export default function HeadDashboardPage() {
  const [candidates, setCandidates] = useState<ICandidateFrontend[]>(initialMockCandidates);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(3);

  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; newStatus: 'Pass' | 'Fail' | 'Pending' } | null>(null);

  const handleUpdateStatusRequest = (id: string, newStatus: 'Pass' | 'Fail' | 'Pending') => {
    const candidate = candidates.find(c => c._id === id);
    if (candidate) {
      setConfirmAction({ id, name: candidate.fullName, newStatus });
    }
  };

  const executeStatusChange = () => {
    if (confirmAction) {
      setCandidates((prev) => prev.map((c) => (c._id === confirmAction.id ? { ...c, status: confirmAction.newStatus } : c)));
      setConfirmAction(null); 
    }
  };

  const stats = useMemo(() => ({
    total: candidates.length,
    pending: candidates.filter(c => c.status === 'Pending').length,
    passed: candidates.filter(c => c.status === 'Pass').length,
    failed: candidates.filter(c => c.status === 'Fail').length,
  }), [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || candidate.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || candidate.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, candidates]);

  const displayedCandidates = filteredCandidates.slice(0, visibleCount);
  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  return (
    <div className="space-y-8 relative">
      
      {/* Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80">Total</p>
            <p className="text-3xl font-black text-blue-600 leading-none mt-2">
              <AnimatedNumber value={stats.total} />
            </p>
            <p className="text-sm font-semibold text-blue-600/80 mt-1.5">Applicants</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center text-2xl">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-600/80">Pending</p>
            <p className="text-3xl font-black text-yellow-600 leading-none mt-2">
              <AnimatedNumber value={stats.pending} />
            </p>
            <p className="text-sm font-semibold text-yellow-600/80 mt-1.5">In Review</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-2xl">
            <i className="fa-solid fa-check"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-600/80">Passed</p>
            <p className="text-3xl font-black text-green-600 leading-none mt-2">
              <AnimatedNumber value={stats.passed} />
            </p>
            <p className="text-sm font-semibold text-green-600/80 mt-1.5">Qualified</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-2xl">
            <i className="fa-solid fa-xmark"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600/80">Failed</p>
            <p className="text-3xl font-black text-red-600 leading-none mt-2">
              <AnimatedNumber value={stats.failed} />
            </p>
            <p className="text-sm font-semibold text-red-600/80 mt-1.5">Rejected</p>
          </div>
        </div>
      </div>

      {/* Controls Bar: Vibrant Filter Tabs & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-xl w-fit">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => setStatusFilter(option)}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                statusFilter === option 
                  ? 'bg-blue-600 text-white shadow-md scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className="fa-solid fa-magnifying-glass text-muted-foreground"></i>
          </div>
          <input
            type="text"
            placeholder="Search by ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* Data Grid Container */}
      <div className="mt-4">
        {/* --- Pass the full 'candidates' array down to keep the modal synced! --- */}
        <CandidateTable 
          candidates={displayedCandidates} 
          allCandidates={candidates}
          onUpdateStatus={handleUpdateStatusRequest} 
        />
        
        {filteredCandidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-border shadow-sm mt-4">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
              <i className="fa-solid fa-folder-open text-3xl text-muted-foreground"></i>
            </div>
            <p className="text-xl font-black text-foreground">No candidates found</p>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Try adjusting your search or filter settings.</p>
          </div>
        )}

        {visibleCount < filteredCandidates.length && (
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setVisibleCount(filteredCandidates.length)} 
              className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-8 py-3 text-sm font-bold text-blue-600 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:bg-blue-50"
            >
              <i className="fa-solid fa-angle-down"></i> Load All Candidates
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-md rounded-[20px] bg-card border border-border p-8 shadow-2xl transition-transform duration-300 scale-100 font-sans">
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              Confirm Status Change
            </h3>
            
            {/* UPDATED: Dynamic Colors for Pass/Pending/Fail text! */}
            <p className="text-[15px] text-muted-foreground font-medium leading-relaxed">
              Are you sure you want to change the status of <span className="font-bold text-foreground">{confirmAction.name}</span> to{' '}
              <span className={`font-black ${
                confirmAction.newStatus === 'Pass' ? 'text-green-600 dark:text-green-400' :
                confirmAction.newStatus === 'Pending' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {confirmAction.newStatus}
              </span>?
            </p>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border-2 border-border bg-card px-6 py-2.5 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={executeStatusChange}
                className="rounded-xl border-2 border-blue-900 bg-blue-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 hover:border-blue-800"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
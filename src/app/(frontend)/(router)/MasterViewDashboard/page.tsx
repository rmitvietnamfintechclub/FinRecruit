"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import CandidateTable from '@/components/ui/CandidateTable';
import { ICandidateFrontend } from '@/types/frontend';

const AnimatedNumber = ({ value }: { value: number }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [direction, setDirection] = useState(1);

  if (value !== prevValue) {
    setDirection(value > prevValue ? 1 : -1);
    setPrevValue(value);
  }

  return (
    <>
      <style>{`
        @keyframes slideInUpFade { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes slideInDownFade { 0% { opacity: 0; transform: translateY(-15px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-number-up { animation: slideInUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-number-down { animation: slideInDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      <span key={value} className={`inline-block ${direction === 1 ? 'animate-number-up' : 'animate-number-down'}`}>
        {value}
      </span>
    </>
  );
};

const masterMockCandidates: ICandidateFrontend[] = [
  { _id: '1', studentId: 's3123456', fullName: 'Nguyen Dang Khoa', email: 's3123456@rmit.edu.vn', phone: '0123456789', cvLink: '#', choice1: 'Technology', department: 'Technology', status: 'Pending', generation: 'Year 2', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Software Engineering', dob: '15/08/2005' },
  { _id: '2', studentId: 's3987654', fullName: 'Dang Hoang Gia Khanh', email: 's3987654@rmit.edu.vn', phone: '0987654321', cvLink: '#', choice1: 'Technology', department: 'Technology', status: 'Pass', generation: 'Year 3', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Information Technology', dob: '22/03/2004' },
  { _id: '3', studentId: 's3156754', fullName: 'Nguyen Thi Thu Huong', email: 's3156754@rmit.edu.vn', phone: '0742523454', cvLink: '#', choice1: 'Business', department: 'Business', status: 'Pending', generation: 'Year 1', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Economics & Finance', dob: '10/11/2004' },
  { _id: '4', studentId: 's3314566', fullName: 'Chenh Hung Minh', email: 's3314566@rmit.edu.vn', phone: '0315136631', cvLink: '#', choice1: 'Business', department: 'Business', status: 'Pass', generation: 'Year 2', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Logistics', dob: '05/01/2005' },
  { _id: '5', studentId: 's3676767', fullName: 'Le Tan Vu', email: 's3676767@rmit.edu.vn', phone: '0945534667', cvLink: '#', choice1: 'Marketing', department: 'Marketing', status: 'Pending', generation: 'Year 2', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Digital Marketing', dob: '19/09/2004' },
  { _id: '6', studentId: 's3696969', fullName: 'Nguyen Van Thinh', email: 's3696969@rmit.edu.vn', phone: '0357234569', cvLink: '#', choice1: 'Human Resources', department: 'Human Resources', status: 'Fail', generation: 'Year 1', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Business Administration', dob: '27/12/2005' },
  { _id: '7', studentId: 's3888888', fullName: 'Hoang Vu Nhat Thong', email: 's3888888@rmit.edu.vn', phone: '0912345678', cvLink: '#', choice1: 'Human Resources', department: 'Human Resources', status: 'Pending', generation: 'Year 3', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Finance', dob: '12/05/2004' },
  { _id: '8', studentId: 's3999999', fullName: 'Truong Quoc Tri', email: 's3999999@rmit.edu.vn', phone: '0987654322', cvLink: '#', choice1: 'Marketing', department: 'Marketing', status: 'Pass', generation: 'Year 2', semester: '2026A', appliedAt: new Date().toISOString(), major: 'Digital Marketing', dob: '08/08/2005' }
];

export default function MasterDashboardPage() {
  const [candidates, setCandidates] = useState<ICandidateFrontend[]>(masterMockCandidates);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Custom Dropdown States
  const [deptFilter, setDeptFilter] = useState('All');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [visibleCount, setVisibleCount] = useState(3);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; newStatus: 'Pass' | 'Fail' | 'Pending' } | null>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateStatusRequest = (id: string, newStatus: 'Pass' | 'Fail' | 'Pending') => {
    const candidate = candidates.find(c => c._id === id);
    if (candidate) setConfirmAction({ id, name: candidate.fullName, newStatus });
  };

  const executeStatusChange = () => {
    if (confirmAction) {
      setCandidates((prev) => prev.map((c) => (c._id === confirmAction.id ? { ...c, status: confirmAction.newStatus } : c)));
      setConfirmAction(null); 
    }
  };

  const stats = useMemo(() => {
    const deptCandidates = deptFilter === 'All' ? candidates : candidates.filter(c => c.department === deptFilter);
    return {
      total: deptCandidates.length,
      pending: deptCandidates.filter(c => c.status === 'Pending').length,
      passed: deptCandidates.filter(c => c.status === 'Pass').length,
      failed: deptCandidates.filter(c => c.status === 'Fail').length,
    };
  }, [candidates, deptFilter]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || candidate.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || candidate.status === statusFilter;
      const matchesDept = deptFilter === 'All' || candidate.department === deptFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [searchQuery, statusFilter, deptFilter, candidates]);

  const displayedCandidates = filteredCandidates.slice(0, visibleCount);
  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];
  const departmentOptions = ['All', 'Technology', 'Business', 'Human Resources', 'Marketing'];

  return (
    <div className="space-y-8 relative">
      
      {/* Count Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-users"></i></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80">Total</p>
            <p className="text-3xl font-black text-blue-600 leading-none mt-2"><AnimatedNumber value={stats.total} /></p>
            <p className="text-sm font-semibold text-blue-600/80 mt-1.5">Applicants</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-clock"></i></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-600/80">Pending</p>
            <p className="text-3xl font-black text-yellow-600 leading-none mt-2"><AnimatedNumber value={stats.pending} /></p>
            <p className="text-sm font-semibold text-yellow-600/80 mt-1.5">In Review</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-check"></i></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-600/80">Passed</p>
            <p className="text-3xl font-black text-green-600 leading-none mt-2"><AnimatedNumber value={stats.passed} /></p>
            <p className="text-sm font-semibold text-green-600/80 mt-1.5">Qualified</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-2xl"><i className="fa-solid fa-xmark"></i></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600/80">Failed</p>
            <p className="text-3xl font-black text-red-600 leading-none mt-2"><AnimatedNumber value={stats.failed} /></p>
            <p className="text-sm font-semibold text-red-600/80 mt-1.5">Rejected</p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-card p-4 rounded-xl shadow-sm border border-border gap-4">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-muted/40 rounded-xl w-fit shrink-0">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => {
                setStatusFilter(option);
                setVisibleCount(3);
              }}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                statusFilter === option ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          
          {/* --- Custom Interactive Dropdown Menu --- */}
          <div className="relative w-full sm:w-56 shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-input bg-background py-3 px-4 text-sm font-bold text-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
            >
              <div className="flex items-center gap-2 truncate">
                <i className="fa-solid fa-layer-group text-blue-600/80 dark:text-blue-400"></i>
                <span className="truncate">{deptFilter === 'All' ? 'All Departments' : deptFilter}</span>
              </div>
              <i className={`fa-solid fa-chevron-down text-muted-foreground transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isDeptDropdownOpen && (
              <div className="absolute top-full right-0 z-20 mt-2 w-full sm:w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                {departmentOptions.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      setDeptFilter(dept);
                      setVisibleCount(3);
                      setIsDeptDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-sm font-bold rounded-lg transition-colors duration-150 ${
                      deptFilter === dept 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {dept === 'All' ? 'All Departments' : dept}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* --------------------------------------------- */}

          {/* Search Bar */}
          <div className="relative w-full sm:w-72 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground"></i>
            </div>
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(3);
              }}
              className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-all hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
            />
          </div>
        </div>
      </div>

      {/* Data Grid Container */}
      <div className="mt-4">
        <CandidateTable candidates={displayedCandidates} allCandidates={candidates} onUpdateStatus={handleUpdateStatusRequest} />
        
        {filteredCandidates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-border shadow-sm mt-4">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-5"><i className="fa-solid fa-folder-open text-3xl text-muted-foreground"></i></div>
            <p className="text-xl font-black text-foreground">No candidates found</p>
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-md rounded-[20px] bg-card border border-border p-8 shadow-2xl transition-transform scale-100">
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-4">Confirm Status Change</h3>
            <p className="text-[15px] text-muted-foreground font-medium leading-relaxed">
              Are you sure you want to change the status of <span className="font-bold text-foreground">{confirmAction.name}</span> to{' '}
              <span className={`font-black ${confirmAction.newStatus === 'Pass' ? 'text-green-600' : confirmAction.newStatus === 'Pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                {confirmAction.newStatus}
              </span>?
            </p>
            <div className="mt-8 flex items-center justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="rounded-xl border-2 border-border bg-card px-6 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Cancel</button>
              <button onClick={executeStatusChange} className="rounded-xl border-2 border-blue-900 bg-blue-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
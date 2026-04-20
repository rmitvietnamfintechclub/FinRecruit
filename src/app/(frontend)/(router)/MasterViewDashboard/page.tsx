'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import CandidateTable from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import type { DepartmentType } from '@/app/(backend)/types';
import {
  MASTER_VIEW_DEPT_OPTIONS,
  mapExecutiveListItemToHeadRow,
  masterViewDeptToApiDepartment,
  type ExecutiveListRow,
  type MasterViewDeptFilter,
} from '@/lib/executiveMasterViewMapping';
import { emailLocalPart } from '@/lib/utils';

type StatusCount = {
  total: number;
  pass: number;
  fail: number;
  pending: number;
};

type StatisticsPayload = {
  overall: StatusCount;
  byDepartment: Partial<Record<DepartmentType, StatusCount>>;
};

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
      <span
        key={value}
        className={`inline-block ${direction === 1 ? 'animate-number-up' : 'animate-number-down'}`}
      >
        {value}
      </span>
    </>
  );
};

export default function MasterDashboardPage() {
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>([]);
  const [statistics, setStatistics] = useState<StatisticsPayload | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [deptFilter, setDeptFilter] = useState<MasterViewDeptFilter>('All');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadStatistics = useCallback(async () => {
    setStatsError(null);
    setLoadingStats(true);
    try {
      const res = await fetch('/api/executive/statistics', { credentials: 'include' });
      const json = (await res.json()) as {
        success?: boolean;
        data?: StatisticsPayload;
        message?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        setStatsError(json.message ?? `Statistics error (${res.status})`);
        setStatistics(null);
        return;
      }
      setStatistics({
        overall: json.data.overall,
        byDepartment: json.data.byDepartment,
      });
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to load statistics.');
      setStatistics(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    setListError(null);
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      const dept = masterViewDeptToApiDepartment(deptFilter);
      if (dept) params.set('department', dept);
      if (statusFilter !== 'All') params.set('status', statusFilter);

      const qs = params.toString();
      const res = await fetch(
        `/api/executive/candidates${qs ? `?${qs}` : ''}`,
        { credentials: 'include' }
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: { candidates: ExecutiveListRow[] };
        message?: string;
      };
      if (!res.ok || !json.success || !json.data?.candidates) {
        setListError(json.message ?? `Candidates error (${res.status})`);
        setCandidates([]);
        return;
      }
      const rows = json.data.candidates.map((c) => mapExecutiveListItemToHeadRow(c));
      setCandidates(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load candidates.');
      setCandidates([]);
    } finally {
      setLoadingList(false);
    }
  }, [deptFilter, statusFilter]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const stats = useMemo(() => {
    if (!statistics) {
      return { total: 0, pending: 0, passed: 0, failed: 0 };
    }
    if (deptFilter === 'All') {
      const o = statistics.overall;
      return {
        total: o.total,
        pending: o.pending,
        passed: o.pass,
        failed: o.fail,
      };
    }
    const apiDept = masterViewDeptToApiDepartment(deptFilter);
    if (!apiDept) {
      return { total: 0, pending: 0, passed: 0, failed: 0 };
    }
    const d = statistics.byDepartment[apiDept];
    if (!d) {
      return { total: 0, pending: 0, passed: 0, failed: 0 };
    }
    return {
      total: d.total,
      pending: d.pending,
      passed: d.pass,
      failed: d.fail,
    };
  }, [statistics, deptFilter]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((candidate) => {
      const nameMatch = candidate.fullName.toLowerCase().includes(q);
      const idMatch = emailLocalPart(candidate.email).toLowerCase().includes(q);
      return nameMatch || idMatch;
    });
  }, [searchQuery, candidates]);

  const displayedCandidates = filteredCandidates.slice(0, visibleCount);
  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  const noopStatus = () => {
    /* Executive board: status PATCH API not implemented — CandidateTable/modal are read-only */
  };

  return (
    <div className="relative space-y-8">
      {(statsError || listError) && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {statsError && <p>{statsError}</p>}
          {listError && <p>{listError}</p>}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Thay đổi trạng thái Pass/Fail/Pending từ MasterView cần API Executive (hiện chỉ xem và duyệt
        chi tiết).
      </p>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-blue-100 text-2xl text-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80">Total</p>
            <p className="text-3xl font-black leading-none text-blue-600 mt-2">
              {loadingStats ? '—' : <AnimatedNumber value={stats.total} />}
            </p>
            <p className="text-sm font-semibold text-blue-600/80 mt-1.5">Applicants</p>
          </div>
        </div>
        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-yellow-100 text-2xl text-yellow-600 flex items-center justify-center">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-600/80">Pending</p>
            <p className="text-3xl font-black leading-none text-yellow-600 mt-2">
              {loadingStats ? '—' : <AnimatedNumber value={stats.pending} />}
            </p>
            <p className="text-sm font-semibold text-yellow-600/80 mt-1.5">In Review</p>
          </div>
        </div>
        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-green-100 text-2xl text-green-600 flex items-center justify-center">
            <i className="fa-solid fa-check"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-600/80">Passed</p>
            <p className="text-3xl font-black leading-none text-green-600 mt-2">
              {loadingStats ? '—' : <AnimatedNumber value={stats.passed} />}
            </p>
            <p className="text-sm font-semibold text-green-600/80 mt-1.5">Qualified</p>
          </div>
        </div>
        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-red-100 text-2xl text-red-600 flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600/80">Failed</p>
            <p className="text-3xl font-black leading-none text-red-600 mt-2">
              {loadingStats ? '—' : <AnimatedNumber value={stats.failed} />}
            </p>
            <p className="text-sm font-semibold text-red-600/80 mt-1.5">Rejected</p>
          </div>
        </div>
      </div>

      <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="bg-muted/40 flex w-fit shrink-0 items-center gap-2 rounded-xl p-1.5">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setStatusFilter(option);
                setVisibleCount(3);
              }}
              className={`rounded-lg px-6 py-2.5 text-sm font-bold transition-all duration-200 ${
                statusFilter === option
                  ? 'scale-105 bg-blue-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-4 lg:w-auto sm:flex-row">
          <div className="relative w-full shrink-0 sm:w-56" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
              className="border-input bg-background flex w-full items-center justify-between rounded-xl border py-3 px-4 text-sm font-bold text-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:border-blue-400 focus:ring-2 focus:ring-blue-600/50 focus:outline-none"
            >
              <div className="flex min-w-0 items-center gap-2 truncate">
                <i className="fa-solid fa-layer-group shrink-0 text-blue-600/80 dark:text-blue-400"></i>
                <span className="truncate">
                  {deptFilter === 'All' ? 'All Departments' : deptFilter}
                </span>
              </div>
              <i
                className={`fa-solid fa-chevron-down text-muted-foreground transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-180' : ''}`}
              ></i>
            </button>

            {isDeptDropdownOpen && (
              <div className="border-border bg-card animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-20 mt-2 w-full rounded-xl border p-1.5 shadow-xl duration-200 sm:w-56">
                {MASTER_VIEW_DEPT_OPTIONS.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => {
                      setDeptFilter(dept);
                      setVisibleCount(3);
                      setIsDeptDropdownOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-4 py-2.5 text-sm font-bold transition-colors duration-150 ${
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

          <div className="relative w-full shrink-0 sm:w-72">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground"></i>
            </div>
            <input
              type="text"
              placeholder="Search by sID or name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(3);
              }}
              className="border-input bg-background placeholder:text-muted-foreground w-full rounded-xl border py-3 pr-4 pl-11 text-sm text-foreground shadow-sm transition-all hover:border-blue-400 focus:ring-2 focus:ring-blue-600/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        {loadingList ? (
          <p className="text-muted-foreground text-sm">Loading candidates…</p>
        ) : (
          <CandidateTable
            candidates={displayedCandidates}
            onUpdateStatus={noopStatus}
            readOnly
            detailApi="executive"
          />
        )}

        {!loadingList && filteredCandidates.length === 0 && (
          <div className="bg-card border-border mt-4 flex flex-col items-center justify-center rounded-2xl border py-20 text-center shadow-sm">
            <div className="bg-muted/50 mb-5 flex h-20 w-20 items-center justify-center rounded-full">
              <i className="fa-solid fa-folder-open text-muted-foreground text-3xl"></i>
            </div>
            <p className="text-foreground text-xl font-black">No candidates found</p>
          </div>
        )}

        {!loadingList && visibleCount < filteredCandidates.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount(filteredCandidates.length)}
              className="border-border bg-card text-blue-600 hover:bg-blue-50 inline-flex items-center gap-2 rounded-xl border px-8 py-3 text-sm font-bold shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <i className="fa-solid fa-angle-down"></i> Load All Candidates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

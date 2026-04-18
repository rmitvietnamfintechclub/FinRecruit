'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CandidateTable from '@/components/ui/CandidateTable';
import type { HeadDashboardListCandidate } from '@/types/headDashboard';
import {
  patchCandidateStatus,
  type DashboardStatus,
} from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';

const PAGE_SIZE = 9;

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

type ListApiResponse = {
  success: boolean;
  message?: string;
  candidates?: HeadDashboardListCandidate[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    emptyState?: string | null;
    filters?: {
      search?: string;
      status?: string | null;
      department?: string;
    };
  };
};

export default function HeadDashboardPage() {
  const [candidates, setCandidates] = useState<HeadDashboardListCandidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listEmptyHint, setListEmptyHint] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    passed: 0,
    failed: 0,
  });

  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    name: string;
    newStatus: DashboardStatus;
  } | null>(null);

  const [patching, setPatching] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const refreshStats = useCallback(async () => {
    const base = '/api/head-dashboard/candidates';
    try {
      const [rAll, rP, rPa, rF] = await Promise.all([
        fetch(`${base}?limit=1`, { credentials: 'include' }),
        fetch(`${base}?status=Pending&limit=1`, { credentials: 'include' }),
        fetch(`${base}?status=Pass&limit=1`, { credentials: 'include' }),
        fetch(`${base}?status=Fail&limit=1`, { credentials: 'include' }),
      ]);
      const [jAll, jP, jPa, jF] = (await Promise.all([
        rAll.json(),
        rP.json(),
        rPa.json(),
        rF.json(),
      ])) as ListApiResponse[];
      if (!rAll.ok || !jAll.success) return;
      setStats({
        total: jAll.meta?.total ?? 0,
        pending: rP.ok && jP.success ? (jP.meta?.total ?? 0) : 0,
        passed: rPa.ok && jPa.success ? (jPa.meta?.total ?? 0) : 0,
        failed: rF.ok && jF.success ? (jF.meta?.total ?? 0) : 0,
      });
    } catch {
      /* keep previous stats */
    }
  }, []);

  const loadList = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_SIZE));
        params.set('page', String(pageNum));
        const q = debouncedSearch.trim();
        if (q) params.set('search', q);
        if (statusFilter !== 'All') params.set('status', statusFilter);

        const res = await fetch(`/api/head-dashboard/candidates?${params}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as ListApiResponse;
        if (!res.ok || !json.success) {
          setError(json.message ?? `Request failed (${res.status})`);
          if (!append) {
            setCandidates([]);
            setListEmptyHint(null);
          }
          return;
        }
        const rows = json.candidates ?? [];
        setCandidates((prev) => (append && pageNum > 1 ? [...prev, ...rows] : rows));
        const totalPages = json.meta?.totalPages ?? 0;
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
        setListEmptyHint(
          rows.length === 0 ? json.meta?.emptyState ?? null : null
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load candidates.');
        if (!append) setCandidates([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  useEffect(() => {
    void loadList(1, false);
  }, [loadList]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const handleUpdateStatusRequest = (id: string, newStatus: DashboardStatus) => {
    const candidate = candidates.find((c) => c.id === id);
    if (candidate) {
      setConfirmAction({ id, name: candidate.fullName, newStatus });
    }
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    setPatching(true);
    try {
      const { ok, message } = await patchCandidateStatus(
        confirmAction.id,
        confirmAction.newStatus
      );
      if (!ok) {
        if (message && message !== 'Đã hủy.') {
          window.alert(message);
        }
        return;
      }
      setConfirmAction(null);
      await Promise.all([loadList(1, false), refreshStats()]);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setPatching(false);
    }
  };

  const filterOptions = ['All', 'Pending', 'Pass', 'Fail'];

  const statsDisplay = useMemo(
    () => ({
      total: stats.total,
      pending: stats.pending,
      passed: stats.passed,
      failed: stats.failed,
    }),
    [stats]
  );

  if (loading && candidates.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600" />
        <p className="mt-4 text-sm font-semibold">Loading candidates…</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-semibold">Could not load data</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadList(1, false)}
            className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-red-900 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-100 dark:hover:bg-red-900/70"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-600">
            <i className="fa-solid fa-users" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80">
              Total
            </p>
            <p className="mt-2 text-3xl font-black leading-none text-blue-600">
              <AnimatedNumber value={statsDisplay.total} />
            </p>
            <p className="mt-1.5 text-sm font-semibold text-blue-600/80">
              Applicants
            </p>
          </div>
        </div>

        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-2xl text-yellow-600">
            <i className="fa-solid fa-clock" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-600/80">
              Pending
            </p>
            <p className="mt-2 text-3xl font-black leading-none text-yellow-600">
              <AnimatedNumber value={statsDisplay.pending} />
            </p>
            <p className="mt-1.5 text-sm font-semibold text-yellow-600/80">
              In Review
            </p>
          </div>
        </div>

        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-100 text-2xl text-green-600">
            <i className="fa-solid fa-check" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-600/80">
              Passed
            </p>
            <p className="mt-2 text-3xl font-black leading-none text-green-600">
              <AnimatedNumber value={statsDisplay.passed} />
            </p>
            <p className="mt-1.5 text-sm font-semibold text-green-600/80">
              Qualified
            </p>
          </div>
        </div>

        <div className="bg-card border-border flex items-center gap-5 rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-1">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-100 text-2xl text-red-600">
            <i className="fa-solid fa-xmark" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600/80">
              Failed
            </p>
            <p className="mt-2 text-3xl font-black leading-none text-red-600">
              <AnimatedNumber value={statsDisplay.failed} />
            </p>
            <p className="mt-1.5 text-sm font-semibold text-red-600/80">
              Rejected
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="bg-muted/40 flex w-fit items-center gap-2 rounded-xl p-1.5">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatusFilter(option)}
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

        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <i className="fa-solid fa-magnifying-glass text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-blue-600/50 w-full rounded-xl border py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-blue-600 focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4">
        <CandidateTable
          candidates={candidates}
          onUpdateStatus={handleUpdateStatusRequest}
        />

        {candidates.length === 0 && !loading && (
          <div className="bg-card border-border mt-4 flex flex-col items-center justify-center rounded-2xl border py-20 text-center shadow-sm">
            <div className="bg-muted/50 mb-5 flex h-20 w-20 items-center justify-center rounded-full">
              <i className="fa-solid fa-folder-open text-muted-foreground text-3xl" />
            </div>
            <p className="text-foreground text-xl font-black">No candidates found</p>
            <p className="text-muted-foreground mt-2 text-sm font-medium">
              {listEmptyHint ??
                'Try adjusting your search or filter settings.'}
            </p>
          </div>
        )}

        {hasMore && candidates.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadList(page + 1, true)}
              className="bg-card border-border text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 inline-flex items-center gap-2 rounded-xl border px-8 py-3 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md disabled:opacity-60"
            >
              {loadingMore ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                <i className="fa-solid fa-angle-down" />
              )}
              Load more
            </button>
          </div>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-card border-border scale-100 rounded-[20px] border p-8 font-sans shadow-2xl transition-transform duration-300">
            <h3 className="text-foreground mb-4 text-2xl font-bold tracking-tight">
              Confirm status change
            </h3>
            <p className="text-muted-foreground text-[15px] leading-relaxed font-medium">
              Change status for{' '}
              <span className="text-foreground font-bold">{confirmAction.name}</span>{' '}
              to{' '}
              <span
                className={`font-black ${
                  confirmAction.newStatus === 'Pass'
                    ? 'text-green-600 dark:text-green-400'
                    : confirmAction.newStatus === 'Pending'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                }`}
              >
                {confirmAction.newStatus}
              </span>
              ?
            </p>
            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={patching}
                onClick={() => setConfirmAction(null)}
                className="border-border bg-card text-foreground hover:bg-muted rounded-xl border-2 px-6 py-2.5 text-sm font-bold shadow-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={patching}
                onClick={() => void executeStatusChange()}
                className="rounded-xl border-2 border-blue-900 bg-blue-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:border-blue-800 hover:bg-blue-800 disabled:opacity-60"
              >
                {patching ? '…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

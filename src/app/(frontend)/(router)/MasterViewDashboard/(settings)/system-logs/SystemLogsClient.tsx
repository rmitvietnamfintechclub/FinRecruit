'use client';

import * as React from 'react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

// --- TYPES ---
type Level = 'info' | 'warning' | 'error';
type Category = 'candidate' | 'role' | 'system-config' | 'security' | 'system';

type Actor = {
  userId?: string;
  email?: string;
  role?: string;
} | null;

type Target = {
  userId?: string;
  email?: string;
  candidateId?: string;
  msFormResponseId?: string;
  label?: string;
} | null;

type SystemLog = {
  id: string;
  level: Level;
  category: Category;
  action: string;
  message: string;
  performedBy: Actor;
  target: Target;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
};

type Payload = {
  success?: boolean;
  message?: string;
  items?: SystemLog[];
  total?: number;
  page?: number;
  pageSize?: number;
};

// --- CONFIG ---
const LEVEL_OPTIONS: Array<{ value: Level | 'all'; label: string }> = [
  { value: 'all', label: 'All Levels' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

const CATEGORY_OPTIONS: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'role', label: 'Role & User' },
  { value: 'security', label: 'Security' },
  { value: 'system-config', label: 'System Config' },
  { value: 'system', label: 'System' },
];

const LEVEL_STYLES: Record<Level, { dot: string; bg: string; text: string }> = {
  info: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 border-blue-100',
    text: 'text-blue-700',
  },
  warning: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 border-amber-100',
    text: 'text-amber-700',
  },
  error: {
    dot: 'bg-red-500',
    bg: 'bg-red-50 border-red-100',
    text: 'text-red-700',
  },
};

const CATEGORY_LABEL: Record<Category, string> = {
  candidate: 'Candidate',
  role: 'Role',
  security: 'Security',
  'system-config': 'System Config',
  system: 'System',
};

// --- UTILS ---
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return iso;
  }
}

function actorLabel(actor: Actor): string {
  if (!actor) return 'System';
  return actor.email || actor.userId || 'Unknown';
}

function targetLabel(target: Target): string {
  if (!target) return '—';
  return (
    target.label ||
    target.email ||
    target.msFormResponseId ||
    target.userId ||
    target.candidateId ||
    '—'
  );
}

// --- MAIN COMPONENT ---
export function SystemLogsClient() {
  const [level, setLevel] = React.useState<Level | 'all'>('all');
  const [category, setCategory] = React.useState<Category | 'all'>('all');
  const [q, setQ] = React.useState('');
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(25);

  const [items, setItems] = React.useState<SystemLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const { triggerSessionExpired } = useSessionExpired();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // CENTRALIZED API WRAPPER
  const fetchApi = React.useCallback(
    async (url: string, options?: RequestInit): Promise<Payload | null> => {
      const res = await fetch(url, { ...options, credentials: 'include' });

      if (res.redirected && res.url.toLowerCase().includes('login')) {
        triggerSessionExpired();
        return null;
      }

      const json = (await res.json()) as Payload;

      if (!res.ok || !json.success) {
        const msg = json.message || `Error ${res.status}`;
        if (
          msg.toLowerCase().includes('authentication required') ||
          msg.includes('401')
        ) {
          triggerSessionExpired();
          return null;
        }
        throw new Error(msg);
      }
      return json;
    },
    [triggerSessionExpired]
  );

  const load = React.useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('level', level);
        params.set('category', category);
        if (q.trim()) params.set('q', q.trim());
        if (from) params.set('from', new Date(from).toISOString());
        if (to) params.set('to', new Date(to).toISOString());
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));

        const json = await fetchApi(
          `/api/executive/system-logs?${params.toString()}`
        );
        if (!json) return;

        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
      } catch (e) {
        if (!isSilent)
          setError(
            e instanceof Error ? e.message : 'Failed to load audit logs.'
          );
        setItems([]);
        setTotal(0);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [level, category, q, from, to, page, pageSize, fetchApi]
  );

  // Reset to page 1 whenever filters change.
  React.useEffect(() => {
    setPage(1);
  }, [level, category, q, from, to, pageSize]);

  // SMART AUTO-POLLING: Cứ 10s tự refresh ngầm, NHƯNG sẽ TẠM NGƯNG nếu user đang mở xem chi tiết một row (tránh giật UI).
  React.useEffect(() => {
    void load(false);
    const interval = setInterval(() => {
      setExpanded((prev) => {
        if (prev.size === 0) {
          void load(true);
        }
        return prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setLevel('all');
    setCategory('all');
    setQ('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-6 my-4 animate-in fade-in duration-500">
      {error && (
        <AppNotice variant="error" onDismiss={() => setError(null)}>
          {error}
        </AppNotice>
      )}

      {/* FILTER BAR & DATA TABLE (SaaS Container) */}
      <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* COMPACT FILTER BAR */}
        <div className="flex flex-col xl:flex-row gap-4 p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by message, action, email or target..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] shadow-sm transition-all placeholder:text-gray-400"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level | 'all')}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] shadow-sm cursor-pointer outline-none"
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | 'all')}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#0D1742] focus:ring-1 focus:ring-[#0D1742] shadow-sm cursor-pointer outline-none"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* DateTime Range Picker */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm focus-within:border-[#0D1742] focus-within:ring-1 focus-within:ring-[#0D1742]">
              <input
                type="datetime-local"
                className="bg-transparent text-sm font-medium outline-none text-gray-700"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-gray-300 px-1">→</span>
              <input
                type="datetime-local"
                className="bg-transparent text-sm font-medium outline-none text-gray-700"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            {(q || level !== 'all' || category !== 'all' || from || to) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-3 h-10.5"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="overflow-x-auto min-h-100">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300 mb-4" />
              <p className="text-sm font-bold text-gray-400">
                Loading audit trail...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <i className="fa-solid fa-clipboard-list text-4xl text-gray-300 mb-4" />
              <p className="text-base font-bold text-[#0D1742]">
                No events match your criteria
              </p>
              <p className="text-sm text-[#5E5E92] mt-1">
                Try widening your date range or clearing filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                <tr>
                  <th className="px-5 py-4 w-1/4">Event</th>
                  <th className="px-5 py-4 w-2/4 hidden md:table-cell">
                    Message
                  </th>
                  <th className="px-5 py-4 w-1/4 text-right">Actor & Time</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((log) => {
                  const isOpen = expanded.has(log.id);
                  const lvl = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpanded(log.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-gray-50',
                          isOpen && 'bg-gray-50/80 shadow-inner'
                        )}
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-1.5 flex size-2 shrink-0 rounded-full',
                                lvl.dot
                              )}
                            />
                            <div>
                              <p className="font-bold text-[#0D1742] tracking-tight">
                                {log.action}
                              </p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-0.5">
                                {CATEGORY_LABEL[log.category] || log.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top hidden md:table-cell">
                          <p className="text-sm font-medium text-gray-700 line-clamp-2 pr-4">
                            {log.message}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <p className="text-sm font-bold text-[#0D1742] truncate pl-4">
                            {actorLabel(log.performedBy)}
                          </p>
                          <p className="text-[11px] font-bold text-gray-400 mt-0.5 whitespace-nowrap">
                            {formatDate(log.timestamp)}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-middle text-right">
                          <i
                            className={cn(
                              'fa-solid fa-chevron-left text-xs text-gray-300 transition-transform',
                              isOpen && '-rotate-90 text-[#0D1742]'
                            )}
                          />
                        </td>
                      </tr>

                      {/* INLINE EXPANSION VIEW (Terminal Style) */}
                      {isOpen && (
                        <tr className="bg-gray-50 shadow-inner">
                          <td
                            colSpan={4}
                            className="p-0 border-y border-gray-100"
                          >
                            <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                              <div className="space-y-5">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                                    Target Identity
                                  </p>
                                  <p className="text-sm font-semibold text-[#0D1742] break-all">
                                    {targetLabel(log.target)}
                                  </p>
                                  {log.target?.msFormResponseId && (
                                    <p className="text-xs font-medium text-[#5E5E92] mt-1 break-all">
                                      MS Form: {log.target.msFormResponseId}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                                    Network Context
                                  </p>
                                  <p className="text-sm font-mono font-medium text-gray-600 break-all">
                                    {log.ipAddress || '—'}
                                  </p>
                                  <p
                                    className="text-xs font-medium text-gray-400 mt-1.5 leading-relaxed line-clamp-3"
                                    title={log.userAgent || ''}
                                  >
                                    {log.userAgent || '—'}
                                  </p>
                                </div>
                              </div>

                              <div className="lg:col-span-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                                  Metadata / Payload
                                </p>
                                {log.metadata &&
                                Object.keys(log.metadata).length > 0 ? (
                                  <div className="bg-[#0D1742] rounded-xl p-4 overflow-x-auto shadow-sm">
                                    <pre className="text-xs text-[#DCB968] font-mono leading-relaxed">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                ) : (
                                  <div className="bg-white rounded-xl p-4 border border-dashed border-gray-300 flex items-center justify-center h-24 shadow-sm">
                                    <p className="text-sm text-gray-400 font-bold">
                                      No metadata attached to this event.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {items.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Show
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-[#0D1742] cursor-pointer shadow-sm"
              >
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
              <span className="text-xs font-medium text-gray-500 ml-2 hidden md:inline-block">
                Showing{' '}
                <strong className="text-[#0D1742]">
                  {total === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-[#0D1742]">
                  {Math.min(page * pageSize, total)}
                </strong>{' '}
                of <strong className="text-[#0D1742]">{total}</strong> entries
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={loading || page <= 1}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <i className="fa-solid fa-angles-left" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
                className="h-8 px-3 rounded-lg text-xs font-bold"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || page >= totalPages}
                className="h-8 px-3 rounded-lg text-xs font-bold"
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={loading || page >= totalPages}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <i className="fa-solid fa-angles-right" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

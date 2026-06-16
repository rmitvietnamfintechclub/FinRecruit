'use client';

import Link from 'next/link';
import * as React from 'react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  filters?: {
    levels?: string[];
    categories?: string[];
  };
};

const LEVEL_OPTIONS: Array<{ value: Level | 'all'; label: string }> = [
  { value: 'all', label: 'All levels' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

const CATEGORY_OPTIONS: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'role', label: 'Role / User' },
  { value: 'security', label: 'Security' },
  { value: 'system-config', label: 'System Config' },
  { value: 'system', label: 'System' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const LEVEL_STYLES: Record<
  Level,
  { dot: string; badge: string; text: string }
> = {
  info: {
    dot: 'bg-blue-500',
    badge:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300',
    text: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    dot: 'bg-amber-500',
    badge:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-300',
  },
  error: {
    dot: 'bg-red-500',
    badge:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
    text: 'text-red-700 dark:text-red-300',
  },
};

const CATEGORY_LABEL: Record<Category, string> = {
  candidate: 'Candidate',
  role: 'Role',
  security: 'Security',
  'system-config': 'System Config',
  system: 'System',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
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

const inputClass =
  'border-input bg-background w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/40';

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = React.useCallback(async () => {
    setLoading(true);
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

      const res = await fetch(`/api/executive/system-logs?${params.toString()}`, {
        credentials: 'include',
      });
      const json = (await res.json()) as Payload;
      if (!res.ok || !json.success) {
        setError(json.message ?? `Failed (${res.status})`);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load system logs.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [level, category, q, from, to, page, pageSize]);

  // Reset to page 1 whenever filters change.
  React.useEffect(() => {
    setPage(1);
  }, [level, category, q, from, to, pageSize]);

  React.useEffect(() => {
    void load();
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/MasterViewDashboard"
            className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <i className="fa-solid fa-arrow-left mr-2" aria-hidden />
            MasterView
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-bold text-foreground">System Logs</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <i className="fa-solid fa-rotate mr-2" aria-hidden />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-black tracking-tight">System Logs</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Audit trail of role grants, system-config changes, candidate intake
          failures, and security events. Entries are kept for 90 days.
        </p>
      </div>

      {error ? (
        <AppNotice variant="error" onDismiss={() => setError(null)}>
          {error}
        </AppNotice>
      ) : null}

      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-black">Filters</CardTitle>
          <CardDescription>
            Combine filters to drill into a specific incident.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Level | 'all')}
              className={inputClass}
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Category | 'all')
              }
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Search
            </label>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="message, action, email, msFormResponseId…"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              From
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              To
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Page size
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={inputClass}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={
                level === 'all' && category === 'all' && !q && !from && !to
              }
            >
              <i className="fa-solid fa-xmark mr-2" aria-hidden />
              Clear filters
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-base font-black">Events</CardTitle>
          <CardDescription>
            Most recent first. Click a row to expand metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-muted-foreground space-y-3 py-12 text-center text-sm">
              <i className="fa-solid fa-spinner fa-spin text-2xl" />
              <p>Loading events…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="border-border rounded-xl border border-dashed py-16 text-center">
              <i className="fa-solid fa-clipboard-list text-muted-foreground mb-3 text-3xl" />
              <p className="font-bold">No events match the current filters</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Try clearing filters or widening the date range.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Time</th>
                      <th className="px-4 py-3 text-left font-bold">Level</th>
                      <th className="px-4 py-3 text-left font-bold">Category</th>
                      <th className="px-4 py-3 text-left font-bold">Action</th>
                      <th className="px-4 py-3 text-left font-bold">Message</th>
                      <th className="px-4 py-3 text-left font-bold">Performed by</th>
                      <th className="px-4 py-3 text-left font-bold">Target</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((log) => {
                      const isOpen = expanded.has(log.id);
                      const lvl = LEVEL_STYLES[log.level];
                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-muted/30',
                              isOpen && 'bg-muted/40'
                            )}
                            onClick={() => toggleExpanded(log.id)}
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(log.timestamp)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn('uppercase', lvl.badge)}
                              >
                                <span
                                  className={cn(
                                    'mr-1 inline-block size-2 rounded-full',
                                    lvl.dot
                                  )}
                                />
                                {log.level}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-muted-foreground">
                              {CATEGORY_LABEL[log.category] ?? log.category}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold">
                                {log.action}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <p className="line-clamp-2 max-w-md font-semibold text-foreground">
                                {log.message}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs">
                              <span className="font-semibold text-foreground">
                                {actorLabel(log.performedBy)}
                              </span>
                              {log.performedBy?.role ? (
                                <span className="ml-1 text-muted-foreground">
                                  · {log.performedBy.role}
                                </span>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              {targetLabel(log.target)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <i
                                className={cn(
                                  'fa-solid fa-chevron-right text-xs text-muted-foreground transition-transform',
                                  isOpen && 'rotate-90'
                                )}
                                aria-hidden
                              />
                            </td>
                          </tr>
                          {isOpen ? (
                            <tr className="bg-muted/20">
                              <td colSpan={8} className="px-4 py-4">
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-2 text-xs">
                                    <p className="font-bold uppercase tracking-wider text-muted-foreground">
                                      Context
                                    </p>
                                    <dl className="space-y-1.5">
                                      <div className="flex gap-2">
                                        <dt className="w-28 shrink-0 font-semibold text-muted-foreground">
                                          ID
                                        </dt>
                                        <dd className="break-all font-mono">
                                          {log.id}
                                        </dd>
                                      </div>
                                      <div className="flex gap-2">
                                        <dt className="w-28 shrink-0 font-semibold text-muted-foreground">
                                          Timestamp
                                        </dt>
                                        <dd>{formatDate(log.timestamp)}</dd>
                                      </div>
                                      {log.performedBy?.email ? (
                                        <div className="flex gap-2">
                                          <dt className="w-28 shrink-0 font-semibold text-muted-foreground">
                                            Actor
                                          </dt>
                                          <dd className="break-all">
                                            {log.performedBy.email}
                                            {log.performedBy.userId
                                              ? ` (${log.performedBy.userId})`
                                              : ''}
                                          </dd>
                                        </div>
                                      ) : null}
                                      {log.target?.email ||
                                      log.target?.label ||
                                      log.target?.userId ||
                                      log.target?.candidateId ||
                                      log.target?.msFormResponseId ? (
                                        <div className="flex gap-2">
                                          <dt className="w-28 shrink-0 font-semibold text-muted-foreground">
                                            Target
                                          </dt>
                                          <dd className="break-all">
                                            {targetLabel(log.target)}
                                            {log.target?.userId
                                              ? ` (${log.target.userId})`
                                              : ''}
                                            {log.target?.msFormResponseId
                                              ? ` · MS Form: ${log.target.msFormResponseId}`
                                              : ''}
                                          </dd>
                                        </div>
                                      ) : null}
                                      {log.ipAddress ? (
                                        <div className="flex gap-2">
                                          <dt className="w-28 shrink-0 font-semibold text-muted-foreground">
                                            IP
                                          </dt>
                                          <dd className="font-mono">
                                            {log.ipAddress}
                                          </dd>
                                        </div>
                                      ) : null}
                                      {log.userAgent ? (
                                        <div className="flex gap-2">
                                          <dt className="w-28 shrink-0 font-semibold text-muted-foreground">
                                            User-Agent
                                          </dt>
                                          <dd className="break-all">
                                            {log.userAgent}
                                          </dd>
                                        </div>
                                      ) : null}
                                    </dl>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <p className="font-bold uppercase tracking-wider text-muted-foreground">
                                      Metadata
                                    </p>
                                    {log.metadata &&
                                    Object.keys(log.metadata).length > 0 ? (
                                      <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed">
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    ) : (
                                      <p className="text-muted-foreground">
                                        No metadata.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                Page <span className="font-bold text-foreground">{page}</span>{' '}
                of <span className="font-bold text-foreground">{totalPages}</span>
                {' · '}
                showing{' '}
                <span className="font-bold text-foreground">
                  {(page - 1) * pageSize + 1}
                </span>
                –
                <span className="font-bold text-foreground">
                  {Math.min(page * pageSize, total)}
                </span>{' '}
                of <span className="font-bold text-foreground">{total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || page <= 1}
                  onClick={() => setPage(1)}
                >
                  <i className="fa-solid fa-angles-left" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fa-solid fa-angle-left mr-1" aria-hidden />
                  Prev
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <i className="fa-solid fa-angle-right ml-1" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  <i className="fa-solid fa-angles-right" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

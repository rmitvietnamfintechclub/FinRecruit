'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, UserX, XCircle } from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { DecisionBar } from './DecisionBar';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type {
  Round2CandidateSummary,
  Round2Status,
} from '@/lib/interview-cockpit/types';

export function Round2DashboardClient() {
  const [candidates, setCandidates] = useState<Round2CandidateSummary[]>([]);
  const [filter, setFilter] = useState<'All' | Round2Status>('All');
  const [pendingAction, setPendingAction] = useState<{
    candidate: Round2CandidateSummary;
    status: Round2Status;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void interviewCockpitRepository
      .listCandidates()
      .then(setCandidates)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : 'Could not load interviews.'
        )
      );
  }, []);
  const stats = useMemo(
    () => ({
      total: candidates.length,
      pending: candidates.filter((item) => item.status === 'Pending').length,
      pass: candidates.filter((item) => item.status === 'Pass').length,
      fail: candidates.filter((item) => item.status === 'Fail').length,
      noShow: candidates.filter((item) => item.status === 'No Show').length,
    }),
    [candidates]
  );
  const completed = candidates.length > 0 && stats.pending === 0;
  const visible =
    filter === 'All'
      ? candidates
      : candidates.filter((item) => item.status === filter);
  const commit = async () => {
    if (!pendingAction) return;
    await interviewCockpitRepository.setStatus(
      pendingAction.candidate.id,
      pendingAction.status
    );
    setCandidates((current) =>
      current.map((item) =>
        item.id === pendingAction.candidate.id
          ? { ...item, status: pendingAction.status }
          : item
      )
    );
    setPendingAction(null);
  };
  return (
    <div className="space-y-6">
      {error && <AppNotice variant="error">{error}</AppNotice>}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-purple-600">
              Active cohort
            </p>
            <h1 className="mt-1 text-2xl font-black text-blue-950 dark:text-blue-300">
              2026B · Gen 7
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Department Head view · Technology Department
            </p>
          </div>
          <div
            className={
              completed
                ? 'rounded-full bg-emerald-100 px-4 py-2 text-sm font-extrabold text-emerald-800'
                : 'rounded-full bg-blue-100 px-4 py-2 text-sm font-extrabold text-blue-800'
            }
          >
            {completed ? '● ROUND 2 COMPLETED' : '● INTERVIEWS IN PROGRESS'}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {completed
            ? 'All interviews are finished. Ready for the probation round.'
            : 'Conducting interviews and evaluating candidates.'}
        </p>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Total', stats.total, Clock3, 'text-blue-600'],
          ['Pending', stats.pending, Clock3, 'text-amber-600'],
          ['Passed', stats.pass, CheckCircle2, 'text-emerald-600'],
          ['Failed', stats.fail, XCircle, 'text-red-600'],
          ['No Show', stats.noShow, UserX, 'text-orange-600'],
        ].map(([label, value, Icon, colorClass]) => {
          const CardIcon = Icon as typeof Clock3;
          return (
            <div
              key={label as string}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <CardIcon className={`h-5 w-5 ${colorClass as string}`} />
              <p className="mt-3 text-xs font-extrabold uppercase text-muted-foreground">
                {label as string}
              </p>
              <p className="text-2xl font-black">{value as number}</p>
            </div>
          );
        })}
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {(['All', 'Pending', 'Pass', 'Fail', 'No Show'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`min-h-9 rounded-lg px-2 py-2 text-xs font-bold sm:px-3 ${filter === status ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  {status}
                </button>
              )
            )}
          </div>
          <Link
            href="/HeadDashboard/interview-settings"
            className="w-full rounded-xl border border-purple-300 px-4 py-2 text-center text-sm font-bold text-purple-700 sm:w-auto"
          >
            Question Template & Scoring
          </Link>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {visible.map((candidate) => (
            <article
              key={candidate.id}
              className="grid gap-4 rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">
                    {candidate.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.studentId} · {candidate.generation}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-extrabold">
                  {candidate.status}
                </span>
              </div>
              <dl className="grid grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <dt className="text-[10px] font-extrabold uppercase text-muted-foreground">
                    Department
                  </dt>
                  <dd className="mt-1 font-semibold">{candidate.department}</dd>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <dt className="text-[10px] font-extrabold uppercase text-muted-foreground">
                    Interview slot
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {candidate.interviewSlot}
                  </dd>
                </div>
              </dl>
              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Quick decision
                </p>
                <DecisionBar
                  compact
                  value={candidate.status}
                  disabled={candidate.status !== 'Pending'}
                  onChange={(status) =>
                    status !== 'Pending' &&
                    setPendingAction({ candidate, status })
                  }
                />
              </div>
              <Link
                href={`/InterviewCockpit/${candidate.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-50 px-4 py-2.5 font-extrabold text-blue-600 hover:bg-blue-100"
              >
                Access Cockpit
              </Link>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Candidate</th>
                <th className="p-4">Department</th>
                <th className="p-4">Interview slot</th>
                <th className="p-4">Status</th>
                <th className="p-4">Quick decision</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((candidate) => (
                <tr key={candidate.id} className="border-t border-border">
                  <td className="p-4">
                    <p className="font-extrabold">{candidate.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.studentId} · {candidate.generation}
                    </p>
                  </td>
                  <td className="p-4">{candidate.department}</td>
                  <td className="p-4">{candidate.interviewSlot}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold">
                      {candidate.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <DecisionBar
                      compact
                      value={candidate.status}
                      disabled={candidate.status !== 'Pending'}
                      onChange={(status) =>
                        status !== 'Pending' &&
                        setPendingAction({ candidate, status })
                      }
                    />
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/InterviewCockpit/${candidate.id}`}
                      className="inline-flex whitespace-nowrap rounded-xl bg-blue-50 px-4 py-2.5 font-extrabold text-blue-600 hover:bg-blue-100"
                    >
                      Access Cockpit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ConfirmDialog
        open={pendingAction !== null}
        title={`Confirm ${pendingAction?.status ?? ''}`}
        description="This Round 2 result is terminal. You will not be able to change it from the dashboard after confirmation."
        confirmLabel="Confirm result"
        variant={pendingAction?.status === 'Pass' ? 'default' : 'destructive'}
        onConfirm={() => void commit()}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

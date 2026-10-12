'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Medal, Trophy, Users } from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Round2StatusBadge } from '@/components/interview-cockpit/Round2StatusBadge';
import { cn } from '@/lib/utils';
import type { BackendRound2Status } from '@/lib/interview-cockpit/types';

type RankingScope = 'department' | 'all';

type RankingCandidate = {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  department: string;
  round2Status: BackendRound2Status;
  score: number;
  rank: number;
};

type RankingGroup = {
  isScoringEnabled: boolean;
  candidates: RankingCandidate[];
  totalCandidateCount: number;
  unscoredCandidateCount: number;
};

type RankingData = {
  cohort: {
    generation: string;
    semester: string;
  };
  department: string;
  enabledDepartments: string[];
  disabledDepartments: string[];
  totalDepartments: number;
  yourDepartment: RankingGroup;
  allDepartments: RankingGroup;
};

type RankingResponse = {
  success: boolean;
  message?: string;
  data?: RankingData;
};

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function rankStyle(rank: number) {
  if (rank === 1) {
    return 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
  }
  if (rank === 2) {
    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  }
  if (rank === 3) {
    return 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300';
  }
  return 'border-border bg-muted text-muted-foreground';
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-black',
        rankStyle(rank)
      )}
      aria-label={`Rank ${rank}`}
    >
      {rank <= 3 ? <Medal className="mr-1 h-4 w-4" aria-hidden /> : null}
      {rank}
    </span>
  );
}

export function InterviewRankingClient() {
  const [scope, setScope] = useState<RankingScope>('department');
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/head-dashboard/ranking', {
          credentials: 'include',
        });
        const payload = (await response.json()) as RankingResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(
            payload.message ?? 'Could not load interview ranking.'
          );
        }

        if (active) setData(payload.data);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not load interview ranking.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const group = data
    ? scope === 'department'
      ? data.yourDepartment
      : data.allDepartments
    : null;

  const scopeLabel = scope === 'department' ? 'Your Dept' : 'All Dept';
  const enabledDepartmentLabel = useMemo(() => {
    if (!data) return '';
    return `${data.enabledDepartments.length}/${data.totalDepartments} departments enabled`;
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 p-6 text-white sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-200">
              <Trophy className="h-5 w-5" aria-hidden />
              <p className="text-xs font-extrabold uppercase tracking-[0.18em]">
                Round 2 ranking
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Interview Score Ranking
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Candidates are ranked by their current overall interview score.
              Scores are shared in the current evaluation model.
            </p>
          </div>
          {data ? (
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Active cohort
              </p>
              <p className="mt-1 font-extrabold">
                {data.cohort.semester} · {data.cohort.generation}
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border bg-card p-2 sm:flex sm:w-fit sm:min-w-[360px]">
          {(
            [
              ['department', 'Your Dept', Building2],
              ['all', 'All Dept', Users],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
              className={cn(
                'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                scope === value
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'text-muted-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50 dark:hover:text-blue-300'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      {error ? <AppNotice variant="error">{error}</AppNotice> : null}

      {loading ? (
        <section className="rounded-2xl border border-border bg-card p-10 text-center text-sm font-semibold text-muted-foreground shadow-sm">
          Loading interview ranking…
        </section>
      ) : null}

      {!loading && data && group ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Ranking scope
              </p>
              <p className="mt-2 text-xl font-black">{scopeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {scope === 'department'
                  ? data.department
                  : enabledDepartmentLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Ranked candidates
              </p>
              <p className="mt-2 text-xl font-black text-blue-600">
                {group.candidates.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Candidates with an overall score
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Awaiting score
              </p>
              <p className="mt-2 text-xl font-black text-amber-600">
                {group.unscoredCandidateCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Round 2 candidates not ranked yet
              </p>
            </div>
          </section>

          {scope === 'all' && data.enabledDepartments.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Scoring enabled
                </span>
                {data.enabledDepartments.map((department) => (
                  <span
                    key={department}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    {department}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {!group.isScoringEnabled ? (
            <AppNotice
              variant="warning"
              title="Numeric scoring is not enabled"
              action={
                scope === 'department' ? (
                  <Link
                    href="/HeadDashboard/interview-settings"
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-amber-800"
                  >
                    Open Question Template
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : undefined
              }
            >
              {scope === 'department'
                ? `Turn on numeric scoring for ${data.department} in Question Template to use this ranking.`
                : `None of the ${data.totalDepartments} departments has enabled numeric scoring yet.`}
            </AppNotice>
          ) : group.candidates.length === 0 ? (
            <AppNotice variant="info" title="No scored candidates yet">
              Scoring is enabled, but no candidate in this scope has an overall
              interview score yet.
            </AppNotice>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border p-4 sm:p-5">
                <h2 className="text-lg font-black">{scopeLabel} ranking</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Highest overall score appears first. Equal scores share the
                  same rank.
                </p>
              </div>

              <div className="grid gap-3 p-3 md:hidden">
                {group.candidates.map((candidate) => (
                  <article
                    key={candidate.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <RankBadge rank={candidate.rank} />
                        <div className="min-w-0">
                          <p className="truncate font-extrabold">
                            {candidate.fullName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {candidate.studentId} · {candidate.department}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-lg font-black text-blue-600">
                        {formatScore(candidate.score)}
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          / 100
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <Round2StatusBadge status={candidate.round2Status} />
                      <Link
                        href={`/InterviewCockpit/${candidate.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-extrabold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                      >
                        Open cockpit
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Candidate</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Round 2 status</th>
                      <th className="p-4 text-right">Overall score</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.candidates.map((candidate) => (
                      <tr
                        key={candidate.id}
                        className="border-t border-border transition-colors hover:bg-muted/40"
                      >
                        <td className="p-4">
                          <RankBadge rank={candidate.rank} />
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold">{candidate.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {candidate.studentId}
                          </p>
                        </td>
                        <td className="p-4 font-semibold">
                          {candidate.department}
                        </td>
                        <td className="p-4">
                          <Round2StatusBadge status={candidate.round2Status} />
                        </td>
                        <td className="p-4 text-right text-base font-black text-blue-600">
                          {formatScore(candidate.score)} / 100
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/InterviewCockpit/${candidate.id}`}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950"
                          >
                            Open cockpit
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

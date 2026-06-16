'use client';

import React from 'react';

export type CohortBannerProps = {
  cohort: {
    generation: string;
    semester: string;
    isRecruitmentActive: boolean;
  } | null;
  /**
   * Optional helper text shown under the cohort label. Useful to hint at the
   * scope of the page (e.g. "Department Head view · Technology Department").
   */
  scopeLabel?: string;
};

/**
 * Hero-style banner that emphasises the active cohort plus the current
 * recruitment status. Used on both the MasterView and HeadDashboard candidate
 * pages so the implicit filter applied to the candidate list is unambiguous.
 */
export function CohortBanner({ cohort, scopeLabel }: CohortBannerProps) {
  if (!cohort) {
    return (
      <div className="bg-card border-border rounded-2xl border p-5 shadow-sm">
        <p className="text-muted-foreground text-sm font-semibold">
          Loading active cohort…
        </p>
      </div>
    );
  }

  const recruitmentTone = cohort.isRecruitmentActive
    ? {
        ring: 'ring-emerald-200 dark:ring-emerald-900/60',
        chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        dot: 'bg-emerald-500 shadow-emerald-500/40',
        label: 'Recruitment open',
        sub: 'Webhook intake is accepting new applications.',
        icon: 'fa-solid fa-circle-check',
      }
    : {
        ring: 'ring-amber-200 dark:ring-amber-900/60',
        chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
        dot: 'bg-amber-500 shadow-amber-500/40',
        label: 'Recruitment closed',
        sub: 'Form intake is closed - no new candidates can be created.',
        icon: 'fa-solid fa-circle-pause',
      };

  return (
    <section
      className={`bg-card border-border relative overflow-hidden rounded-2xl border p-6 shadow-sm ring-1 ${recruitmentTone.ring}`}
      aria-label="Active recruitment cohort"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-400/5" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <i className="fa-solid fa-layer-group text-2xl" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Active cohort
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {cohort.semester}{' '}
              <span className="text-muted-foreground">·</span>{' '}
              {cohort.generation}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
              {scopeLabel
                ? scopeLabel
                : 'Showing only candidates matching this cohort. Change it from System Config to switch.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${recruitmentTone.chip}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${recruitmentTone.dot} ${cohort.isRecruitmentActive ? 'animate-pulse shadow-[0_0_10px_2px_var(--tw-shadow-color)]' : ''}`}
              aria-hidden
            />
            <i className={`${recruitmentTone.icon}`} aria-hidden />
            {recruitmentTone.label}
          </span>
          <p className="max-w-xs text-xs font-semibold text-muted-foreground lg:text-right">
            {recruitmentTone.sub}
          </p>
        </div>
      </div>
    </section>
  );
}

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
  variant?: 'default' | 'head';
  /** Props xác định trạng thái UI cho các vòng */
  mode?: 'round1' | 'round2';
  isRound1Locked?: boolean;
  isRound2Locked?: boolean;
};

export function CohortBanner({
  cohort,
  scopeLabel,
  variant = 'default',
  mode = 'round1',
  isRound1Locked = false,
  isRound2Locked = false,
}: CohortBannerProps) {
  // TRẠNG THÁI LOADING (SKELETON UI)
  if (!cohort) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        aria-hidden="true"
      >
        <div className="relative flex animate-pulse flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            {/* Icon Skeleton */}
            <div className="size-14 shrink-0 rounded-xl bg-gray-100" />

            {/* Text Box Skeleton */}
            <div className="flex flex-col gap-2.5 pt-1">
              {/* Active cohort label */}
              <div className="h-2.5 w-24 rounded-full bg-gray-200" />
              {/* Semester & Gen */}
              <div className="h-7 w-48 rounded-full bg-gray-200 sm:h-8 sm:w-64" />
              {/* Scope Label */}
              <div className="h-3 w-56 rounded-full bg-gray-100 sm:w-80" />
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            {/* Chip/Badge Skeleton */}
            <div className="h-6 w-36 rounded-full bg-gray-200" />
            {/* Helper Text Skeleton */}
            <div className="h-2.5 w-48 rounded-full bg-gray-100 lg:w-56" />
          </div>
        </div>
      </section>
    );
  }

  // XỬ LÝ TRẠNG THÁI MÀU SẮC DỰA TRÊN NGỮ CẢNH
  let toneConfig = {
    ring: 'ring-gray-200',
    chip: 'bg-gray-100 text-gray-800',
    dot: 'bg-gray-500',
    label: 'Unknown',
    sub: '',
    pulse: false,
  };

  if (mode === 'round1' && !isRound1Locked) {
    toneConfig = {
      ring: 'ring-emerald-200',
      chip: 'bg-[#D1FAE5] text-[#065F46]',
      dot: 'bg-[#10B981]',
      label: 'Recruitment Open',
      sub: 'Actively accepting new applications from the public form.',
      pulse: true,
    };
  } else if (mode === 'round1' && isRound1Locked) {
    toneConfig = {
      ring: 'ring-amber-200',
      chip: 'bg-[#FEF3C7] text-[#92400E]',
      dot: 'bg-[#F59E0B]',
      label: 'Recruitment Closed',
      sub: 'Application intake has ended. No new submissions can be made.',
      pulse: false,
    };
  } else if (mode === 'round2' && !isRound2Locked) {
    toneConfig = {
      ring: 'ring-blue-200',
      chip: 'bg-[#DBEAFE] text-[#1E40AF]',
      dot: 'bg-[#3B82F6]',
      label: 'Interviews In Progress',
      sub: 'Actively conducting interviews and evaluating passed candidates.',
      pulse: true,
    };
  } else if (mode === 'round2' && isRound2Locked) {
    toneConfig = {
      ring: 'ring-emerald-200',
      chip: 'bg-[#D1FAE5] text-[#065F46]',
      dot: 'bg-[#10B981]',
      label: 'Round 2 Completed',
      sub: 'All interviews have concluded. Candidates are ready for the probation round.',
      pulse: false,
    };
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      aria-label="Active recruitment cohort"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-blue-50 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <i
              className={`fa-solid ${variant === 'head' ? 'fa-calendar-days' : 'fa-layer-group'} text-2xl`}
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Active cohort
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {cohort.semester} <span className="text-gray-400">·</span>{' '}
              {cohort.generation}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">
              {scopeLabel
                ? scopeLabel
                : 'Viewing candidates for the active cohort. This can be updated in System Config.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${toneConfig.chip}`}
          >
            <span
              className={`size-2 rounded-full ${toneConfig.dot} ${toneConfig.pulse ? 'animate-pulse' : ''}`}
              aria-hidden
            />
            {toneConfig.label}
          </span>
          <p className="text-xs font-medium text-gray-500 lg:text-right">
            {toneConfig.sub}
          </p>
        </div>
      </div>
    </section>
  );
}

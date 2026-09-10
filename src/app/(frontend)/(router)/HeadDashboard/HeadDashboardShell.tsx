'use client';

import React from 'react';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

type HeadDashboardShellProps = {
  children: React.ReactNode;
  departmentLabel: string;
  /** Full name from session, or email local-part if name missing */
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
};

export function HeadDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
  userAvatar,
}: HeadDashboardShellProps) {
  return (
    <DashboardAppShell
      title="Recruitment Evaluation"
      badgeLabel={departmentLabel}
      badgeVariant="yellow"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle="Department Head"
      headerNav={
        <div className="hidden items-center rounded-xl border border-border bg-muted/40 p-1 sm:flex">
          <button
            type="button"
            className="rounded-lg border border-purple-500 bg-card px-4 py-1.5 text-xs font-black text-purple-600 shadow-sm"
            aria-current="page"
          >
            Recruitment
          </button>
          <button
            type="button"
            className="rounded-lg px-4 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            Members
          </button>
        </div>
      }
    >
      {children}
    </DashboardAppShell>
  );
}

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
      title="Department Head Dashboard"
      badgeLabel={departmentLabel}
      badgeVariant="yellow"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle="Department Head"
    >
      {children}
    </DashboardAppShell>
  );
}

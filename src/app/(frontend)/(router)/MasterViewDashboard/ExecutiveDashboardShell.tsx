'use client';

import React from 'react';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

type ExecutiveDashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userInitial: string;
};

export function ExecutiveDashboardShell({
  children,
  userName,
  userInitial,
}: ExecutiveDashboardShellProps) {
  return (
    <DashboardAppShell
      title="MasterView Dashboard"
      badgeLabel="Executive Board"
      badgeVariant="purple"
      userName={userName}
      userInitial={userInitial}
      userSubtitle="Executive Board"
    >
      {children}
    </DashboardAppShell>
  );
}

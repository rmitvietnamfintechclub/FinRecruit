'use client';

import React from 'react';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

type MemberDashboardShellProps = {
  children: React.ReactNode;
  departmentLabel: string;
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
};

export function MemberDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
  userAvatar,
}: MemberDashboardShellProps) {
  return (
    <DashboardAppShell
      title="Round 2 Interview Dashboard"
      badgeLabel={departmentLabel}
      badgeVariant="yellow"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle="Member"
    >
      {children}
    </DashboardAppShell>
  );
}

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
      title="Recruitment Evaluation"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle={`Member • ${departmentLabel.replace(' Department', '')}`}
    >
      {children}
    </DashboardAppShell>
  );
}
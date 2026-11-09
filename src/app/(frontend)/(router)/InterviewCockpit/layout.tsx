import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';

import { HeadDashboardShell } from '@/app/(frontend)/(router)/HeadDashboard/HeadDashboardShell';
import { MemberDashboardShell } from '@/app/(frontend)/(router)/MemberDashboard/MemberDashboardShell';
import { ExecutiveDashboardShell } from '@/app/(frontend)/(router)/MasterViewDashboard/ExecutiveDashboardShell';

const ALLOWED_ROLES = ['Executive Board', 'Department Head', 'Member'];

export default async function InterviewCockpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(buildAuthOptions());
  
  if (!session?.user) redirect('/loginPage');
  
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role as string)) {
    redirect('/waiting-room');
  }

  const role = session.user.role as string;
  const department = session.user.department?.trim() || '—';
  const userName = session.user.name?.trim() || session.user.email?.split('@')[0] || '—';
  const initial = session.user.name?.trim()[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || '?';

  const baseProps = {
    userName,
    userInitial: initial,
    userAvatar: session.user.image ?? null,
  };

  switch (role) {
    case 'Executive Board':
      return (
        <ExecutiveDashboardShell {...baseProps}>
          {children}
        </ExecutiveDashboardShell>
      );
      
    case 'Department Head':
      return (
        <HeadDashboardShell
          {...baseProps}
          departmentLabel={department}
        >
          {children}
        </HeadDashboardShell>
      );
      
    case 'Member':
    default:
      return (
        <MemberDashboardShell
          {...baseProps}
          departmentLabel={department}
          showNavigation={true}
        >
          {children}
        </MemberDashboardShell>
      );
  }
}
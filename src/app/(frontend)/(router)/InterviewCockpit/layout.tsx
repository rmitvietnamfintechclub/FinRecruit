import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { HeadDashboardShell } from '@/app/(frontend)/(router)/HeadDashboard/HeadDashboardShell';

export default async function InterviewCockpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(buildAuthOptions());
  if (!session?.user) redirect('/loginPage');
  if (session.user.role !== 'Department Head' && session.user.role !== 'Member')
    redirect('/waiting-room');

  const role = session.user.role;
  const department = session.user.department?.trim() || '—';
  const userName =
    session.user.name?.trim() || session.user.email?.split('@')[0] || '—';
  const initial =
    session.user.name?.trim()[0]?.toUpperCase() ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <HeadDashboardShell
      departmentLabel={department}
      userName={userName}
      userInitial={initial}
      userAvatar={session.user.image ?? null}
      title={
        role === 'Department Head'
          ? 'Department Head Dashboard'
          : 'Interview Workspace'
      }
      userSubtitle={role}
      showNavigation={role === 'Department Head'}
    >
      {children}
    </HeadDashboardShell>
  );
}

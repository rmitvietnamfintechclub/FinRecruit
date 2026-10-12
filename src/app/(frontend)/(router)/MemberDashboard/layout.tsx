import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { HeadDashboardShell } from '@/app/(frontend)/(router)/HeadDashboard/HeadDashboardShell';
import { getHomePathForRole } from '@/lib/role-routes';

const MEMBER_NAVIGATION_ITEMS = [
  ['/MemberDashboard', 'Interview (Round 2)'],
] as const;

export default async function MemberDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  if (session.user.role !== 'Member') {
    redirect(getHomePathForRole(session.user.role ?? null));
  }

  const department = session.user.department?.trim() || '-';
  const userName =
    session.user.name?.trim() || session.user.email?.split('@')[0] || '-';
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
      title="Member Dashboard"
      userSubtitle="Member"
      navigationItems={MEMBER_NAVIGATION_ITEMS}
    >
      {children}
    </HeadDashboardShell>
  );
}
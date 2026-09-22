import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { getHomePathForRole } from '@/lib/role-routes';
import { MemberDashboardShell } from '@/app/(frontend)/(router)/MemberDashboard/MemberDashboardShell';

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

  const dept = session.user.department?.trim() || 'Member';
  const userName =
    session.user.name?.trim() || session.user.email?.split('@')[0] || 'Member';
  const initial =
    (session.user.name && session.user.name.trim()[0]?.toUpperCase()) ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <MemberDashboardShell
      departmentLabel={dept}
      userName={userName}
      userInitial={initial}
      userAvatar={session.user.image ?? null}
    >
      {children}
    </MemberDashboardShell>
  );
}

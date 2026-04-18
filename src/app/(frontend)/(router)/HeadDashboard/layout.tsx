import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { getHomePathForRole } from '@/lib/role-routes';
import { HeadDashboardShell } from '@/app/(frontend)/(router)/HeadDashboard/HeadDashboardShell';

export default async function HeadDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  if (session.user.role === 'Guest') {
    redirect('/waiting-room');
  }

  if (session.user.role === 'Executive Board') {
    redirect('/masterview');
  }

  if (session.user.role !== 'Department Head') {
    redirect(getHomePathForRole(session.user.role ?? null));
  }

  const dept = session.user.department?.trim() || '—';
  const userName =
    session.user.name?.trim() ||
    session.user.email?.split('@')[0] ||
    '—';
  const initial =
    (session.user.name && session.user.name.trim()[0]?.toUpperCase()) ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <HeadDashboardShell
      departmentLabel={dept}
      userName={userName}
      userInitial={initial}
    >
      {children}
    </HeadDashboardShell>
  );
}

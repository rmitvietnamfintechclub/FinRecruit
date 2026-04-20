import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { getHomePathForRole } from '@/lib/role-routes';
import { ExecutiveDashboardShell } from '@/app/(frontend)/(router)/MasterViewDashboard/ExecutiveDashboardShell';

export default async function MasterViewDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  if (session.user.role !== 'Executive Board') {
    redirect(getHomePathForRole(session.user.role ?? null));
  }

  const userName =
    session.user.name?.trim() ||
    session.user.email?.split('@')[0] ||
    '—';
  const userInitial =
    (session.user.name && session.user.name.trim()[0]?.toUpperCase()) ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <ExecutiveDashboardShell userName={userName} userInitial={userInitial}>
      {children}
    </ExecutiveDashboardShell>
  );
}

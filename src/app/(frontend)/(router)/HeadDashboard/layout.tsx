import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { getHomePathForRole } from '@/lib/role-routes';

type HeadDashboardLayoutProps = {
  children: ReactNode;
};

export default async function HeadDashboardLayout({
  children,
}: HeadDashboardLayoutProps) {
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

  if (session.user.role === 'Department Head') {
    return <>{children}</>;
  }

  redirect(getHomePathForRole(session.user.role ?? null));
}

import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { getHomePathForRole } from '@/lib/role-routes';

type MasterviewLayoutProps = {
  children: ReactNode;
};

export default async function MasterviewLayout({
  children,
}: MasterviewLayoutProps) {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  if (session.user.role !== 'Executive Board') {
    redirect(getHomePathForRole(session.user.role ?? null));
  }

  return <>{children}</>;
}

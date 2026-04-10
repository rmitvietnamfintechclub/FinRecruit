import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';

type WaitingRoomLayoutProps = {
  children: ReactNode;
};

export default async function WaitingRoomLayout({
  children,
}: WaitingRoomLayoutProps) {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  if (session.user.role !== 'Guest') {
    redirect('/');
  }

  return <>{children}</>;
}

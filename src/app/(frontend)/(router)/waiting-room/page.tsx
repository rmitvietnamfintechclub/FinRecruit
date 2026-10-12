import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { WaitingRoomClient } from './WaitingRoomClient'; // <-- Import file client vừa tạo

export default async function WaitingRoomPage() {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  const displayName =
    session.user.name?.trim() ||
    session.user.email?.split('@')[0] ||
    'Guest';

  const userInitial =
    (session.user.name && session.user.name.trim()[0]?.toUpperCase()) ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  const email = session.user.email ?? '';

  return (
    <DashboardAppShell
      title="FinRecruit"
      badgeLabel="Waiting Room"
      badgeVariant="yellow"
      userName={displayName}
      userInitial={userInitial}
      userAvatar={session.user.image ?? null}
      userSubtitle="Guest — pending approval"
    >
      <WaitingRoomClient displayName={displayName} email={email} />
    </DashboardAppShell>
  );
}
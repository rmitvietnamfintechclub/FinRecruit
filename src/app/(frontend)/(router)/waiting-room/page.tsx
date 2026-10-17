import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { WaitingRoomClient } from './WaitingRoomClient';

export default async function WaitingRoomPage() {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  const displayName =
    session.user.name?.trim() || session.user.email?.split('@')[0] || 'Guest';

  const userInitial =
    (session.user.name && session.user.name.trim()[0]?.toUpperCase()) ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  const email = session.user.email ?? '';

  // UX: Thêm Badge "Waiting Room" nổi bật để Guest nhận biết trạng thái
  const headerNav = (
    <div className="hidden items-center gap-2 rounded-full border border-[#F7D27F] bg-[#FFEFCA] px-4 py-1.5 shadow-sm sm:flex">
      <i
        className="fa-solid fa-hourglass-half text-[13px] text-[#A28436]"
        aria-hidden
      />
      <span className="text-[11px] font-black uppercase tracking-wider text-[#A28436]">
        Waiting Room
      </span>
    </div>
  );

  return (
    <DashboardAppShell
      title="FinRecruit"
      userName={displayName}
      userInitial={userInitial}
      userAvatar={session.user.image ?? null}
      userSubtitle="Guest"
      headerNav={headerNav}
    >
      <WaitingRoomClient displayName={displayName} email={email} />
    </DashboardAppShell>
  );
}

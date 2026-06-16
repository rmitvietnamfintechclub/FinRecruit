import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { getUserManagementPayloadFromDb } from '@/lib/user-management/db-user-management';
import { UserManagementClient } from '@/app/(frontend)/(router)/MasterViewDashboard/user-management/UserManagementClient';

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
  const session = await getServerSession(buildAuthOptions());

  // Layout already guards Executive-only access, but keep a defensive guard so
  // we never render the client without a real session id to compare against.
  if (!session?.user?.id) {
    redirect('/loginPage');
  }

  const payload = await getUserManagementPayloadFromDb();

  return (
    <UserManagementClient
      initialPayload={payload}
      currentUserId={session.user.id}
    />
  );
}

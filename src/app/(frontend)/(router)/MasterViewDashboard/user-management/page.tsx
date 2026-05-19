import { getUserManagementPayloadFromDb } from '@/lib/user-management/db-user-management';
import { UserManagementClient } from '@/app/(frontend)/(router)/MasterViewDashboard/user-management/UserManagementClient';

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; generation?: string }>;
}) {
  const sp = await searchParams;
  const payload = await getUserManagementPayloadFromDb({
    semester: sp.semester,
    generation: sp.generation,
  });

  return <UserManagementClient initialPayload={payload} />;
}

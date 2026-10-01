import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import type { DepartmentType } from '@/app/(backend)/types';
import { ROUND_TRANSITION_DEPARTMENTS } from '@/lib/round-transition/reducer';
import { HeadUserManagementClient } from '@/app/(frontend)/(router)/HeadDashboard/user-management/HeadUserManagementClient';

export default async function HeadUserManagementPage() {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user || session.user.role !== 'Department Head') {
    redirect('/HeadDashboard');
  }

  const department = session.user.department as DepartmentType;
  if (!ROUND_TRANSITION_DEPARTMENTS.includes(department)) {
    redirect('/HeadDashboard');
  }

  return <HeadUserManagementClient department={department} />;
}

import { NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import User from '@/app/(backend)/models/User';

export const runtime = 'nodejs';

export const GET = withActiveRBAC('Executive Board', async () => {
  await dbConnect();

  const active = await getActiveConfig();

  const headCounts = await User.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        role: 'Department Head',
        isActive: true,
        department: { $in: [...HEAD_DEPARTMENTS] },
      },
    },
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);

  const membersByDepartment = HEAD_DEPARTMENTS.reduce(
    (acc, dept) => {
      acc[dept] =
        headCounts.find((r) => r._id === dept)?.count ?? 0;
      return acc;
    },
    {} as Record<(typeof HEAD_DEPARTMENTS)[number], number>
  );

  const waitingGuestCount = await User.countDocuments({
    role: 'Guest',
    department: 'Unassigned',
    isActive: true,
  });

  return NextResponse.json({
    success: true,
    active,
    membersByDepartment,
    waitingGuestCount,
  });
});

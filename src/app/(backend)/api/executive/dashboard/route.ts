import { NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  HEAD_DEPARTMENTS,
  getDepartmentAliases,
} from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import User from '@/app/(backend)/models/User';

export const runtime = 'nodejs';

type HeadAccount = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
};

export const GET = withActiveRBAC('Executive Board', async () => {
  await dbConnect();

  const active = await getActiveConfig();

  const allAliases = HEAD_DEPARTMENTS.flatMap((dept) =>
    getDepartmentAliases(dept)
  );

  const headDocs = await User.find({
    role: 'Department Head',
    isActive: true,
    department: { $in: allAliases },
  })
    .select('name email avatar department')
    .sort({ name: 1, email: 1 })
    .lean()
    .exec();

  const headsByDepartment = HEAD_DEPARTMENTS.reduce(
    (acc, dept) => {
      const aliases = getDepartmentAliases(dept);
      acc[dept] = headDocs
        .filter((d) => aliases.includes(d.department))
        .map((d) => ({
          id: d._id.toString(),
          name: d.name ?? null,
          email: d.email,
          avatar: d.avatar ?? null,
        }));
      return acc;
    },
    {} as Record<(typeof HEAD_DEPARTMENTS)[number], HeadAccount[]>
  );

  const waitingGuestCount = await User.countDocuments({
    role: 'Guest',
    department: 'Unassigned',
    isActive: true,
  });

  return NextResponse.json({
    success: true,
    active,
    headsByDepartment,
    waitingGuestCount,
  });
});

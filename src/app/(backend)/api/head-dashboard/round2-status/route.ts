import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getOrCreateGlobalConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

export const GET = withRBAC(
  'Department Head',
  async (
    req: NextRequest,
    { session }: { session: ActiveAppSession }
  ) => {
    const assignedDepartment = normalizeHeadDepartment(
      session.user.department
    );

    if (!assignedDepartment) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid department assignment.',
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const cfg = await getOrCreateGlobalConfig();

    const deptState = cfg.departmentStates.find(
      (ds) => ds.department === assignedDepartment
    );

    return NextResponse.json({
      success: true,
      isRound2Locked: deptState?.isRound2Locked ?? false,
    });
  }
);
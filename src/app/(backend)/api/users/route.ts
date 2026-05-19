import { NextResponse, type NextRequest } from 'next/server';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import mongoose from 'mongoose';
import {
  getUserManagementPayloadFromDb,
  patchUserInDb,
} from '@/lib/user-management/db-user-management';

export const runtime = 'nodejs';

function isRoleType(value: unknown): value is RoleType {
  return (
    typeof value === 'string' &&
    ['Guest', 'Department Head', 'Executive Board'].includes(value)
  );
}

function isDepartmentType(value: unknown): value is DepartmentType {
  return typeof value === 'string';
}

export const GET = withActiveRBAC('Executive Board', async (req: NextRequest) => {
  const url = new URL(req.url);
  const semester = url.searchParams.get('semester');
  const generation = url.searchParams.get('generation');
  const payload = await getUserManagementPayloadFromDb({ semester, generation });
  return NextResponse.json(payload);
});

type PatchBody = {
  userId?: string;
  role?: RoleType;
  department?: DepartmentType;
  isActive?: boolean;
};

export const PATCH = withActiveRBAC('Executive Board', async (req: NextRequest) => {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const { userId, role, department, isActive } = body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      { success: false, message: 'A valid userId is required.' },
      { status: 400 }
    );
  }

  if (
    role !== undefined &&
    role !== null &&
    !isRoleType(role)
  ) {
    return NextResponse.json(
      { success: false, message: 'Invalid role.' },
      { status: 400 }
    );
  }

  if (
    department !== undefined &&
    department !== null &&
    !isDepartmentType(department)
  ) {
    return NextResponse.json(
      { success: false, message: 'Invalid department.' },
      { status: 400 }
    );
  }

  const result = await patchUserInDb({
    userId,
    role,
    department,
    isActive,
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'User updated.',
    user: result.user,
  });
});

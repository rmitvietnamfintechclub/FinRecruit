import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import { patchUserInDb } from '@/lib/user-management/db-user-management';

export const runtime = 'nodejs';

const ROLE_VALUES: RoleType[] = [
  'Guest',
  'Department Head',
  'Executive Board',
];

type RoleUpdatePayload = {
  userId?: string;
  role?: RoleType;
  department?: DepartmentType;
};

function isRoleType(value: unknown): value is RoleType {
  return typeof value === 'string' && ROLE_VALUES.includes(value as RoleType);
}

function getClientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || undefined;
  return req.headers.get('x-real-ip') ?? undefined;
}

/**
 * Legacy endpoint. Delegates to {@link patchUserInDb} so every role change
 * is funnelled through the same anti-headless / sole-EB guards as PATCH /api/users.
 */
export const PATCH = withActiveRBAC('Executive Board', async (req: NextRequest, { session }) => {
  let body: RoleUpdatePayload;

  try {
    body = (await req.json()) as RoleUpdatePayload;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const { userId, role, department } = body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      { success: false, message: 'A valid userId is required.' },
      { status: 400 }
    );
  }

  if (!isRoleType(role)) {
    return NextResponse.json(
      { success: false, message: 'A valid role is required.' },
      { status: 400 }
    );
  }

  const result = await patchUserInDb({
    userId,
    role,
    department,
    actor: {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get('user-agent') ?? undefined,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'User role updated successfully.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        department: result.user.department,
        isActive: result.user.isActive,
      },
    },
    { status: 200 }
  );
});

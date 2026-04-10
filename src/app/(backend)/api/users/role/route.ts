import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import User from '@/app/(backend)/models/User';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';

export const runtime = 'nodejs';

const ROLE_VALUES: RoleType[] = [
  'Guest',
  'Department Head',
  'Executive Board',
];

const HEAD_DEPARTMENTS: DepartmentType[] = [
  'Technology',
  'Business',
  'Human Resources',
  'Marketing',
];

type RoleUpdatePayload = {
  userId?: string;
  role?: RoleType;
  department?: DepartmentType;
};

function isRoleType(value: unknown): value is RoleType {
  return typeof value === 'string' && ROLE_VALUES.includes(value as RoleType);
}

function getDepartmentForRole(
  role: RoleType,
  department?: DepartmentType
): DepartmentType | null {
  if (role === 'Department Head') {
    if (department && HEAD_DEPARTMENTS.includes(department)) {
      return department;
    }

    return null;
  }

  if (role === 'Executive Board') {
    return 'All';
  }

  return 'Unassigned';
}

export const PATCH = withRBAC('Executive Board', async (req: NextRequest) => {
  let body: RoleUpdatePayload;

  try {
    body = (await req.json()) as RoleUpdatePayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid JSON payload.',
      },
      { status: 400 }
    );
  }

  const { userId, role, department } = body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json(
      {
        success: false,
        message: 'A valid userId is required.',
      },
      { status: 400 }
    );
  }

  if (!isRoleType(role)) {
    return NextResponse.json(
      {
        success: false,
        message: 'A valid role is required.',
      },
      { status: 400 }
    );
  }

  const normalizedDepartment = getDepartmentForRole(role, department);

  if (!normalizedDepartment) {
    return NextResponse.json(
      {
        success: false,
        message:
          'A valid department must be provided when assigning the Department Head role.',
      },
      { status: 400 }
    );
  }

  await dbConnect();

  const updatePayload: {
    role: RoleType;
    department: DepartmentType;
    isActive?: boolean;
  } = {
    role,
    department: normalizedDepartment,
  };

  if (role === 'Department Head' || role === 'Executive Board') {
    updatePayload.isActive = true;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updatePayload,
    {
      returnDocument: 'after',
      runValidators: true,
    }
  )
    .select('name email role department isActive')
    .lean()
    .exec();

  if (!updatedUser) {
    return NextResponse.json(
      {
        success: false,
        message: 'User not found.',
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'User role updated successfully.',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name ?? null,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        isActive: updatedUser.isActive,
      },
    },
    { status: 200 }
  );
});

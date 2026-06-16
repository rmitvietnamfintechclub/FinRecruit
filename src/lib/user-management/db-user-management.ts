import mongoose from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import User from '@/app/(backend)/models/User';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import {
  displayRoleLabel,
  type ManagementUserRow,
  type PatchUserManagementInput,
  type PatchUserManagementResult,
  type SerializedManagementUser,
  type UserManagementPayload,
} from '@/lib/user-management/mock-store';

async function getDefaultsFromConfig(): Promise<{
  semester: string;
  generation: string;
}> {
  const active = await getActiveConfig();
  return {
    semester: active.currentSemester,
    generation: active.currentGeneration,
  };
}

function leanDocToRow(
  doc: {
    _id: mongoose.Types.ObjectId;
    name?: string | null;
    email: string;
    avatar?: string | null;
    role: RoleType;
    department: string;
    generation?: string;
    semester?: string;
    isActive: boolean;
    createdAt: Date;
  },
  fallback: { semester: string; generation: string }
): ManagementUserRow {
  const id = doc._id.toString();
  const generation =
    doc.generation?.trim() || fallback.generation;
  const semester = doc.semester?.trim() || fallback.semester;

  return {
    id,
    name: doc.name ?? null,
    email: doc.email,
    avatar: doc.avatar ?? null,
    role: doc.role,
    department: doc.department as DepartmentType,
    isActive: doc.isActive,
    semester,
    generation,
    createdAt: doc.createdAt.toISOString(),
  };
}

function serializeRow(row: ManagementUserRow): SerializedManagementUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    role: row.role,
    department: row.department,
    isActive: row.isActive,
    semester: row.semester,
    generation: row.generation,
    createdAt: row.createdAt,
    displayRole: displayRoleLabel(row),
  };
}

export async function getUserManagementPayloadFromDb(): Promise<UserManagementPayload> {
  await dbConnect();

  const configDefaults = await getDefaultsFromConfig();

  const docs = await User.find({})
    .select(
      'name email avatar role department generation semester isActive createdAt'
    )
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const rows = docs.map((d) => leanDocToRow(d, configDefaults));

  // Cohort-independent: every Head + EB across all generations / semesters.
  const filtered = rows.filter(
    (u) =>
      u.role === 'Department Head' || u.role === 'Executive Board'
  );

  const sortByNewest = (a: ManagementUserRow, b: ManagementUserRow) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  const waitingGuests = rows
    .filter((u) => u.role === 'Guest' && u.isActive)
    .sort(sortByNewest)
    .map(serializeRow);

  const inactiveAccounts = rows
    .filter((u) => !u.isActive)
    .sort(sortByNewest)
    .map(serializeRow);

  const activeEbDocs = await User.find({
    role: 'Executive Board',
    isActive: true,
  })
    .select('_id')
    .lean()
    .exec();

  const soleActiveExecutiveId =
    activeEbDocs.length === 1
      ? activeEbDocs[0]!._id.toString()
      : null;

  return {
    success: true,
    waitingGuests,
    inactiveAccounts,
    users: filtered.map(serializeRow),
    soleActiveExecutiveId,
  };
}

async function wouldDeactivateSoleExecutive(
  userId: string,
  next: { role: RoleType; isActive: boolean }
): Promise<boolean> {
  const current = await User.findById(userId)
    .select('role isActive')
    .lean()
    .exec();

  if (!current) {
    return false;
  }

  const wasEbActive =
    current.role === 'Executive Board' && current.isActive;

  if (!wasEbActive) {
    return false;
  }

  const removesEb =
    next.role !== 'Executive Board' || next.isActive === false;

  if (!removesEb) {
    return false;
  }

  const otherActiveCount = await User.countDocuments({
    role: 'Executive Board',
    isActive: true,
    _id: { $ne: new mongoose.Types.ObjectId(userId) },
  });

  return otherActiveCount === 0;
}

export async function patchUserInDb(
  input: PatchUserManagementInput
): Promise<PatchUserManagementResult> {
  await dbConnect();

  const current = await User.findById(input.userId)
    .select(
      'name email avatar role department generation semester isActive createdAt'
    )
    .exec();

  if (!current) {
    return { ok: false, status: 404, message: 'User not found.' };
  }

  const prevRole = current.role as RoleType;
  const nextRole = input.role ?? prevRole;
  let nextDept = input.department ?? (current.department as DepartmentType);
  const roleChanged = input.role !== undefined && input.role !== prevRole;

  if (nextRole === 'Department Head') {
    const d = HEAD_DEPARTMENTS.find((x) => x === nextDept);
    if (!d) {
      return {
        ok: false,
        status: 400,
        message: 'A valid head department is required for Department Head.',
      };
    }
    nextDept = d;
  } else if (nextRole === 'Executive Board') {
    nextDept = 'EBMB';
  } else if (nextRole === 'Guest') {
    // Application has no "Member" tier: a Guest never holds a head department.
    nextDept = 'Unassigned';
  }

  let nextIsActive = input.isActive ?? current.isActive;
  // Only force-active when the role *changes* into Head/EB (a fresh promotion
  // implies the user takes their seat immediately). Toggling status on an
  // existing Head/EB stays possible — the sole-EB guard below catches the only
  // dangerous case (locking the last admin out).
  if (
    roleChanged &&
    (nextRole === 'Department Head' || nextRole === 'Executive Board')
  ) {
    nextIsActive = true;
  }

  if (
    await wouldDeactivateSoleExecutive(input.userId, {
      role: nextRole,
      isActive: nextIsActive,
    })
  ) {
    // Surface the rejection in server logs so ops can correlate failed admin
    // edits with the sole-EB guard. The userId / requested role transition is
    // safe to log — they're already in the audit trail anyway.
    console.warn(
      '[user-management] sole-EB guard blocked patch',
      JSON.stringify({
        userId: input.userId,
        email: current.email,
        prevRole,
        prevIsActive: current.isActive,
        attemptedRole: nextRole,
        attemptedIsActive: nextIsActive,
      })
    );
    return {
      ok: false,
      status: 409,
      message:
        'Cannot remove or deactivate the last active Executive Board admin. The system requires at least one active Executive Board to remain.',
    };
  }

  const updatePayload: Record<string, unknown> = {
    role: nextRole,
    department: nextDept,
    isActive: nextIsActive,
  };

  if (
    roleChanged &&
    (nextRole === 'Department Head' || nextRole === 'Executive Board')
  ) {
    const cohort = await getDefaultsFromConfig();
    updatePayload.generation = cohort.generation;
    updatePayload.semester = cohort.semester;
  }

  current.set(updatePayload);

  try {
    await current.save();
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Failed to update user in database.';
    return { ok: false, status: 400, message: msg };
  }

  const configDefaults = await getDefaultsFromConfig();
  const row = leanDocToRow(
    {
      _id: current._id as mongoose.Types.ObjectId,
      name: current.name,
      email: current.email,
      avatar: current.avatar,
      role: current.role as RoleType,
      department: current.department,
      generation: current.generation,
      semester: current.semester,
      isActive: current.isActive,
      createdAt: current.createdAt,
    },
    configDefaults
  );

  return { ok: true, user: serializeRow(row) };
}

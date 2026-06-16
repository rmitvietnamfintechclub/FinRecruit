import mongoose from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import User from '@/app/(backend)/models/User';
import type {
  AuditLogLevel,
  DepartmentType,
  IAuditLogActor,
  RoleType,
} from '@/app/(backend)/types';
import {
  displayRoleLabel,
  type ManagementUserRow,
  type PatchUserManagementActor,
  type PatchUserManagementInput,
  type PatchUserManagementResult,
  type SerializedManagementUser,
  type UserManagementPayload,
} from '@/lib/user-management/mock-store';

function actorToAuditActor(
  actor: PatchUserManagementActor | undefined
): IAuditLogActor | undefined {
  if (!actor) return undefined;
  const { userId, email, role } = actor;
  if (!userId && !email && !role) return undefined;
  return { userId, email, role };
}

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

  const auditActor = actorToAuditActor(input.actor);
  const auditIp = input.actor?.ipAddress;
  const auditUserAgent = input.actor?.userAgent;

  const current = await User.findById(input.userId)
    .select(
      'name email avatar role department generation semester isActive createdAt'
    )
    .exec();

  if (!current) {
    void logSystemEvent({
      level: 'warning',
      category: 'role',
      action: 'user.patch_rejected',
      message: `Rejected patch: user ${input.userId} not found.`,
      performedBy: auditActor,
      target: { userId: input.userId },
      metadata: { reason: 'user_not_found' },
      ipAddress: auditIp,
      userAgent: auditUserAgent,
    });
    return { ok: false, status: 404, message: 'User not found.' };
  }

  const prevRole = current.role as RoleType;
  const prevDept = current.department as DepartmentType;
  const prevIsActive = current.isActive;
  const nextRole = input.role ?? prevRole;
  let nextDept = input.department ?? prevDept;
  const roleChanged = input.role !== undefined && input.role !== prevRole;

  if (nextRole === 'Department Head') {
    const d = HEAD_DEPARTMENTS.find((x) => x === nextDept);
    if (!d) {
      void logSystemEvent({
        level: 'warning',
        category: 'role',
        action: 'user.patch_rejected',
        message: `Rejected patch for ${current.email}: missing valid head department.`,
        performedBy: auditActor,
        target: { userId: input.userId, email: current.email },
        metadata: {
          reason: 'invalid_department_for_head',
          attemptedRole: nextRole,
          attemptedDepartment: nextDept,
        },
        ipAddress: auditIp,
        userAgent: auditUserAgent,
      });
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
    void logSystemEvent({
      level: 'warning',
      category: 'security',
      action: 'user.patch_blocked_sole_eb',
      message: `Sole-EB guard blocked patch for ${current.email}.`,
      performedBy: auditActor,
      target: { userId: input.userId, email: current.email },
      metadata: {
        reason: 'sole_active_executive_guard',
        prevRole,
        prevIsActive,
        attemptedRole: nextRole,
        attemptedIsActive: nextIsActive,
      },
      ipAddress: auditIp,
      userAgent: auditUserAgent,
    });
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
    void logSystemEvent({
      level: 'error',
      category: 'role',
      action: 'user.patch_failed',
      message: `DB save failed while updating ${current.email}: ${msg}`,
      performedBy: auditActor,
      target: { userId: input.userId, email: current.email },
      metadata: {
        prevRole,
        prevDept,
        prevIsActive,
        attemptedRole: nextRole,
        attemptedDepartment: nextDept,
        attemptedIsActive: nextIsActive,
        error: msg,
      },
      ipAddress: auditIp,
      userAgent: auditUserAgent,
    });
    return { ok: false, status: 400, message: msg };
  }

  // Decide the right log level / action code for this success.
  // Notable cases:
  //   - admin updates own account in a way that strips EB → security/self_demote
  //   - role actually changed → role.granted
  //   - status flipped → role.activated / role.deactivated
  //   - department changed only → role.department_changed
  //   - otherwise we still emit a noop-info entry (rare in practice)
  const isSelfChange = auditActor?.userId === input.userId;
  const losesAdminRole =
    isSelfChange && prevRole === 'Executive Board' && nextRole !== 'Executive Board';
  const selfDeactivate =
    isSelfChange && prevIsActive && !nextIsActive;

  const statusFlipped = prevIsActive !== nextIsActive;
  const deptChanged = prevDept !== nextDept;

  let logLevel: AuditLogLevel = 'info';
  let logAction = 'user.updated';
  let logMessage = `Updated ${current.email}.`;
  let logCategory: 'role' | 'security' = 'role';

  if (losesAdminRole || selfDeactivate) {
    logLevel = 'warning';
    logCategory = 'security';
    logAction = losesAdminRole
      ? 'user.self_demoted'
      : 'user.self_deactivated';
    logMessage = losesAdminRole
      ? `Admin ${current.email} demoted their own account from Executive Board to ${nextRole}.`
      : `Admin ${current.email} deactivated their own account.`;
  } else if (roleChanged) {
    logAction = 'role.granted';
    logMessage = `Granted ${nextRole} to ${current.email} (was ${prevRole}).`;
  } else if (statusFlipped) {
    logAction = nextIsActive ? 'role.activated' : 'role.deactivated';
    logMessage = nextIsActive
      ? `Reactivated ${current.email} (${nextRole}).`
      : `Deactivated ${current.email} (${nextRole}).`;
  } else if (deptChanged) {
    logAction = 'role.department_changed';
    logMessage = `Moved ${current.email} from ${prevDept} to ${nextDept}.`;
  }

  void logSystemEvent({
    level: logLevel,
    category: logCategory,
    action: logAction,
    message: logMessage,
    performedBy: auditActor,
    target: {
      userId: input.userId,
      email: current.email,
    },
    metadata: {
      prevRole,
      prevDept,
      prevIsActive,
      nextRole,
      nextDept,
      nextIsActive,
      roleChanged,
      deptChanged,
      statusFlipped,
      selfChange: isSelfChange,
    },
    ipAddress: auditIp,
    userAgent: auditUserAgent,
  });

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

import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';

export const UM_SEMESTERS = ['2025B', '2026A', '2026B'] as const;
export const UM_GENERATIONS = ['Gen 11', 'Gen 12', 'Gen 13'] as const;
export const UM_DEFAULT_SEMESTER = '2026A';
export const UM_DEFAULT_GENERATION = 'Gen 12';

export type DisplayRoleLabel =
  | 'Guest'
  | 'Department Head'
  | 'Executive Board'
  | 'Alumni'
  | 'Inactive';

export type ManagementUserRow = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: RoleType;
  department: DepartmentType;
  isActive: boolean;
  semester: string;
  generation: string;
  createdAt: string;
};

export function displayRoleLabel(row: ManagementUserRow): DisplayRoleLabel {
  if (!row.isActive) {
    return 'Inactive';
  }
  if (row.role === 'Executive Board') {
    return 'Executive Board';
  }
  if (row.role === 'Department Head') {
    return 'Department Head';
  }
  return 'Guest';
}

function seedUsers(): ManagementUserRow[] {
  const mk = (
    id: string,
    partial: Omit<ManagementUserRow, 'id' | 'createdAt'> & { createdAt?: string }
  ): ManagementUserRow => ({
    id,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    ...partial,
  });

  return [
    mk('64f0a1b2c3d4e5f678901001', {
      name: 'Executive Alpha',
      email: 'eb.alpha@finrecruit.test',
      avatar: null,
      role: 'Executive Board',
      department: 'EBMB',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2024-01-10T10:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901002', {
      name: 'Executive Beta',
      email: 'eb.beta@finrecruit.test',
      avatar: null,
      role: 'Executive Board',
      department: 'EBMB',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2024-02-15T11:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901003', {
      name: 'Head Technology',
      email: 'head.tech@finrecruit.test',
      avatar: null,
      role: 'Department Head',
      department: 'Technology Department',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2024-03-01T09:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901004', {
      name: 'Head Marketing',
      email: 'head.marketing@finrecruit.test',
      avatar: null,
      role: 'Department Head',
      department: 'Marketing Department',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2024-08-20T12:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901005', {
      name: 'Inactive User',
      email: 'inactive@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: false,
      semester: '2025B',
      generation: 'Gen 11',
      createdAt: '2023-06-01T08:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901006', {
      name: 'Guest Waiting 1',
      email: 'guest1@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2026-05-01T14:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901007', {
      name: 'Guest Waiting 2',
      email: 'guest2@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2026-05-02T09:30:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901008', {
      name: 'Guest Waiting 3',
      email: 'guest3@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2026-05-03T16:20:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f678901009', {
      name: 'Guest Waiting 4',
      email: 'guest4@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2026-05-04T11:15:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f67890100a', {
      name: 'Guest Waiting 5',
      email: 'guest5@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2026-05-05T08:45:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f67890100b', {
      name: 'Guest Waiting 6',
      email: 'guest6@finrecruit.test',
      avatar: null,
      role: 'Guest',
      department: 'Unassigned',
      isActive: true,
      semester: UM_DEFAULT_SEMESTER,
      generation: UM_DEFAULT_GENERATION,
      createdAt: '2026-05-06T10:00:00.000Z',
    }),
    mk('64f0a1b2c3d4e5f67890100c', {
      name: 'Head Business',
      email: 'head.biz@finrecruit.test',
      avatar: null,
      role: 'Department Head',
      department: 'Business Department',
      isActive: true,
      semester: '2025B',
      generation: 'Gen 11',
      createdAt: '2024-04-10T10:00:00.000Z',
    }),
  ];
}

let store: ManagementUserRow[] = seedUsers();

export function resetUserManagementMockStoreForTests() {
  store = seedUsers();
}

export function getHeadDepartmentOptions() {
  return [...HEAD_DEPARTMENTS];
}

export type UserManagementPayload = {
  success: true;
  /**
   * Active Guests (cohort-independent): they are awaiting role assignment.
   */
  waitingGuests: SerializedManagementUser[];
  /**
   * Inactive accounts (any role, cohort-independent). Surfaced so admins can
   * reactivate or fully remove them later.
   */
  inactiveAccounts: SerializedManagementUser[];
  /** Active Department Heads + Executive Board members (cohort-independent). */
  users: SerializedManagementUser[];
  /**
   * Id of the **only** active Executive Board admin when the count is exactly
   * 1. The UI uses this to lock destructive controls and prevent locking
   * everyone out of admin.
   */
  soleActiveExecutiveId: string | null;
};

export type SerializedManagementUser = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: RoleType;
  department: DepartmentType;
  isActive: boolean;
  semester: string;
  generation: string;
  createdAt: string;
  displayRole: DisplayRoleLabel;
};

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

export function getUserManagementPayload(): UserManagementPayload {
  const sortByNewest = (a: ManagementUserRow, b: ManagementUserRow) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  // Cohort-independent: every active Head + EB regardless of generation/semester.
  const filtered = store.filter(
    (u) =>
      u.role === 'Department Head' || u.role === 'Executive Board'
  );

  const waitingGuests = store
    .filter((u) => u.role === 'Guest' && u.isActive)
    .sort(sortByNewest)
    .map(serializeRow);

  const inactiveAccounts = store
    .filter((u) => !u.isActive)
    .sort(sortByNewest)
    .map(serializeRow);

  const activeEbs = store.filter(
    (u) => u.role === 'Executive Board' && u.isActive
  );
  const soleActiveExecutiveId =
    activeEbs.length === 1 ? activeEbs[0].id : null;

  return {
    success: true,
    waitingGuests,
    inactiveAccounts,
    users: filtered.sort(sortByNewest).map(serializeRow),
    soleActiveExecutiveId,
  };
}

function countActiveExecutiveBoard(excludeUserId?: string) {
  return store.filter(
    (u) =>
      u.role === 'Executive Board' &&
      u.isActive &&
      u.id !== excludeUserId
  ).length;
}

function wouldDeactivateSoleExecutive(
  userId: string,
  next: { role: RoleType; isActive: boolean }
) {
  const current = store.find((u) => u.id === userId);
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
  return countActiveExecutiveBoard(userId) === 0;
}

export type PatchUserManagementInput = {
  userId: string;
  /** Full replace of role + department rules */
  role?: RoleType;
  department?: DepartmentType;
  isActive?: boolean;
};

export type PatchUserManagementResult =
  | { ok: true; user: SerializedManagementUser }
  | { ok: false; status: number; message: string };

export function patchUserManagement(
  input: PatchUserManagementInput
): PatchUserManagementResult {
  const idx = store.findIndex((u) => u.id === input.userId);
  if (idx === -1) {
    return { ok: false, status: 404, message: 'User not found.' };
  }

  const current = store[idx];
  const prevRole = current.role;
  const nextRole = input.role ?? prevRole;
  const roleChanged = input.role !== undefined && input.role !== prevRole;
  let nextDept = input.department ?? current.department;

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
    nextDept = 'Unassigned';
  }

  let nextIsActive = input.isActive ?? current.isActive;
  if (
    roleChanged &&
    (nextRole === 'Department Head' || nextRole === 'Executive Board')
  ) {
    nextIsActive = true;
  }

  if (wouldDeactivateSoleExecutive(input.userId, {
    role: nextRole,
    isActive: nextIsActive,
  })) {
    return {
      ok: false,
      status: 409,
      message:
        'Cannot remove or deactivate the last active Executive Board admin. The system requires at least one active Executive Board to remain.',
    };
  }

  const updated: ManagementUserRow = {
    ...current,
    role: nextRole,
    department: nextDept,
    isActive: nextIsActive,
  };

  store[idx] = updated;
  return { ok: true, user: serializeRow(updated) };
}

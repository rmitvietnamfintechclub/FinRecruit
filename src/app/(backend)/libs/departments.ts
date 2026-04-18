import type { DepartmentType } from '@/app/(backend)/types';

export const HEAD_DEPARTMENTS = [
  'Technology Department',
  'Business Department',
  'HR Department',
  'Marketing Department',
] as const satisfies readonly DepartmentType[];

export type HeadDepartment = (typeof HEAD_DEPARTMENTS)[number];

/** Older User documents may still use short labels (e.g. Technology). */
const LEGACY_HEAD_TO_CANONICAL: Record<string, HeadDepartment> = {
  Technology: 'Technology Department',
  Business: 'Business Department',
  'Human Resources': 'HR Department',
  Marketing: 'Marketing Department',
};

/**
 * Returns the canonical head-department label, or null if not a head department.
 */
export function normalizeHeadDepartment(
  department: string | null | undefined
): HeadDepartment | null {
  if (!department) {
    return null;
  }

  const key = department.trim();

  if ((HEAD_DEPARTMENTS as readonly string[]).includes(key)) {
    return key as HeadDepartment;
  }

  return LEGACY_HEAD_TO_CANONICAL[key] ?? null;
}

export function isHeadDepartment(department: string | null | undefined): boolean {
  return normalizeHeadDepartment(department) !== null;
}

/**
 * MongoDB fragment: candidates a Department Head may access — either routed to
 * their department, or still Unassigned with first application choice = that dept.
 */
export function departmentHeadCandidateVisibilityFilter(
  assignedDepartment: HeadDepartment
): { $or: Record<string, unknown>[] } {
  return {
    $or: [
      { department: assignedDepartment },
      { department: 'Unassigned', choice1: assignedDepartment },
    ],
  };
}

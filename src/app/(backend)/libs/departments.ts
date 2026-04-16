import type { DepartmentType } from '@/app/(backend)/types';

export const HEAD_DEPARTMENTS = [
  'Technology',
  'Business',
  'Human Resources',
  'Marketing',
] as const satisfies readonly DepartmentType[];

export function isHeadDepartment(
  department: string | null | undefined
): department is (typeof HEAD_DEPARTMENTS)[number] {
  return HEAD_DEPARTMENTS.includes(
    department as (typeof HEAD_DEPARTMENTS)[number]
  );
}

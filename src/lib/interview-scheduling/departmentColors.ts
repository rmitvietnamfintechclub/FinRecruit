import type { HeadDepartment } from '@/app/(backend)/libs/departments';

export type DepartmentTones = { dark: string; medium: string; light: string };

// Keys are the exact HEAD_DEPARTMENTS values (not redeclared).
export const DEPARTMENT_COLORS: Record<HeadDepartment, DepartmentTones> = {
  'Technology Department': { dark: '#1F6FC0', medium: '#4F81BD', light: '#BDD7EE' },
  'Business Department': { dark: '#C0202A', medium: '#C0504D', light: '#E6B8B7' },
  'Marketing Department': { dark: '#3B2C63', medium: '#7C67A8', light: '#CCC1DA' },
  'HR Department': { dark: '#4B7A3C', medium: '#6AA84F', light: '#D9EAD3' },
};

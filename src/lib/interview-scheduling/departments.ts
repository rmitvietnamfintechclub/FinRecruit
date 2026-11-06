import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import type { InterviewDepartment } from '@/types/interviewScheduling';

export const INTERVIEW_DEPARTMENTS: readonly InterviewDepartment[] = HEAD_DEPARTMENTS;

export const DEPARTMENT_ORDER: readonly InterviewDepartment[] = [
  'Technology Department',
  'Business Department',
  'Marketing Department',
  'HR Department',
];

export const DEPARTMENT_META: Record<
  InterviewDepartment,
  { abbr: string; short: string; full: string; strong: string; light: string }
> = {
  'Technology Department': { abbr: 'Technology', short: 'Technology', full: 'Technology Department', strong: '#0070C0', light: '#9FC5E8' },
  'Business Department': { abbr: 'Business', short: 'Business', full: 'Business Department', strong: '#B70002', light: '#EA9999' },
  'Marketing Department': { abbr: 'Marketing', short: 'Marketing', full: 'Marketing Department', strong: '#351C75', light: '#B4A7D6' },
  'HR Department': { abbr: 'HR', short: 'Human Resources', full: 'Human Resources Department', strong: '#38761D', light: '#B6D7A8' },
};
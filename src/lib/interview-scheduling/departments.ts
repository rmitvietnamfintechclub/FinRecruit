import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import type { InterviewDepartment } from '@/types/interviewScheduling';

export const INTERVIEW_DEPARTMENTS: readonly InterviewDepartment[] = HEAD_DEPARTMENTS;

// Display order matches the Figma (Technology, Business, Marketing, HR).
export const DEPARTMENT_ORDER: readonly InterviewDepartment[] = [
  'Technology Department',
  'Business Department',
  'Marketing Department',
  'HR Department',
];

export const DEPARTMENT_META: Record<
  InterviewDepartment,
  { short: string; full: string; strong: string; light: string }
> = {
  'Technology Department': { short: 'Technology', full: 'Technology', strong: '#0070C0', light: '#9FC5E8' },
  'Business Department': { short: 'Business', full: 'Business', strong: '#B70002', light: '#EA9999' },
  'Marketing Department': { short: 'Marketing', full: 'Marketing', strong: '#351C75', light: '#B4A7D6' },
  'HR Department': { short: 'HR', full: 'Human Resources', strong: '#38761D', light: '#B6D7A8' },
};

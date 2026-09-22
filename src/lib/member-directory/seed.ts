import type { DirectoryAccount } from '@/types/memberDirectory';

export const SEED_WAITING_GUESTS: DirectoryAccount[] = [
  {
    id: 'mock-guest-1',
    name: 'Guest Waiting 1',
    email: 'guest1@finrecruit.test',
    avatar: null,
    role: 'Guest',
    department: 'Unassigned',
    isActive: true,
  },
  {
    id: 'mock-guest-2',
    name: 'Guest Waiting 2',
    email: 'guest2@finrecruit.test',
    avatar: null,
    role: 'Guest',
    department: 'Unassigned',
    isActive: true,
  },
  {
    id: 'mock-guest-3',
    name: 'Guest Waiting 3',
    email: 'guest3@finrecruit.test',
    avatar: null,
    role: 'Guest',
    department: 'Unassigned',
    isActive: true,
  },
];

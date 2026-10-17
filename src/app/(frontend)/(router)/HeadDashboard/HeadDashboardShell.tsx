'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { cn } from '@/lib/utils';

type HeadDashboardShellProps = {
  children: React.ReactNode;
  departmentLabel: string;
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
  userSubtitle?: string;
};

export function HeadDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
  userAvatar,
  userSubtitle = 'Head of',
}: HeadDashboardShellProps) {
  const pathname = usePathname();
  const isMembers = pathname.includes('/member-management');

  const dynamicTitle = isMembers
    ? 'Member Management'
    : 'Recruitment Evaluation';

  const headerNav = (
    <div className="hidden rounded-full border border-gray-200 bg-white p-1 shadow-sm sm:flex">
      <Link
        href="/HeadDashboard"
        className={cn(
          'flex items-center rounded-full px-8 py-2 text-sm font-bold transition-all',
          !isMembers
            ? 'border border-[#DCB968] bg-white text-[#0D1742] shadow-sm ring-1 ring-[#DCB968]'
            : 'border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        Recruitment
      </Link>
      <Link
        href="/HeadDashboard/member-management"
        className={cn(
          'flex items-center rounded-full px-8 py-2 text-sm font-bold transition-all',
          isMembers
            ? 'border border-[#DCB968] bg-white text-[#0D1742] shadow-sm ring-1 ring-[#DCB968]'
            : 'border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        Members
      </Link>
    </div>
  );

  return (
    <DashboardAppShell
      title={dynamicTitle} 
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle={`${userSubtitle} ${departmentLabel}`}
      headerNav={headerNav}
    >
      {children}
    </DashboardAppShell>
  );
}

const HEAD_NAVIGATION_ITEMS = [
  ['/HeadDashboard', 'Candidate Evaluation'],
  ['/HeadDashboard/interviews', 'Interview Schedule'],
  ['/HeadDashboard/interview-settings', 'Question Template'],
] as const;

export function HeadRound2SubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {HEAD_NAVIGATION_ITEMS.map(([href, label]) => {
          const active =
            href === '/HeadDashboard'
              ? pathname === href
              : href === '/HeadDashboard/interviews'
                ? pathname.startsWith(href) ||
                  pathname.startsWith('/InterviewCockpit')
                : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-bold transition-colors focus-visible:outline-none',
                active
                  ? 'border-[#DCB968] text-[#0D1742]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

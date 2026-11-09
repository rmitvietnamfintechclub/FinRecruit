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
  title?: string;
  showNavigation?: boolean;
};

function getDynamicTitle(pathname: string): string {
  if (pathname.includes('/member-management')) return 'Member Management';
  if (pathname.includes('/interview-scheduling')) return 'Interview Schedule';
  if (pathname.includes('/interview-settings')) return 'Interview Questions';
  if (pathname.includes('/InterviewCockpit')) return 'Interview Cockpit';

  
  // Default for '/HeadDashboard'
  return 'Candidate Evaluation';
}

export function HeadDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
  userAvatar,
  userSubtitle = 'Head of',
  title,
  showNavigation = true,
}: HeadDashboardShellProps) {
  const pathname = usePathname();
  const isMembers = pathname.includes('/member-management');
  
  // Define recruitment paths
  const recruitmentPaths = [
    '/HeadDashboard', 
    '/HeadDashboard/interview-scheduling', 
    '/HeadDashboard/interview-settings',
  ];
  
  const isRecruitment = recruitmentPaths.some(p => 
      p === '/HeadDashboard' ? pathname === p : (pathname === p || pathname.startsWith(`${p}/`))
  );

  const dynamicTitle = getDynamicTitle(pathname);

  const navClass =
    'flex items-center gap-1.5 rounded-full px-7 py-2 text-sm font-bold transition-all duration-200';
  const activeClass =
    'border border-[#DCB968] bg-white text-[#0D1742] shadow-sm ring-1 ring-[#DCB968]';
  const inactiveClass =
    'border border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#0D1742]';

  const headerNav = (
    <div className="hidden rounded-full border border-gray-200 bg-white p-1 shadow-sm sm:flex">
      {/* Recruitment Dropdown */}
      <div className="group relative">
        <Link
          href="/HeadDashboard"
          className={cn(navClass, isRecruitment ? activeClass : inactiveClass)}
        >
          Recruitment
          <i className="fa-solid fa-chevron-down ml-1 text-[10px] opacity-50 transition-transform duration-200 group-hover:rotate-180" />
        </Link>

        <div className="invisible absolute left-1/2 top-full mt-1 -translate-x-1/2 pt-1 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 z-50">
          <div className="flex w-52 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
            <Link
              href="/HeadDashboard"
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                pathname === '/HeadDashboard'
                  ? 'bg-[#0D1742]/5 text-[#0D1742]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#0D1742]'
              )}
            >
              Candidate Evaluation
            </Link>
            <Link
              href="/HeadDashboard/interview-scheduling"
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                pathname.startsWith('/HeadDashboard/interview-scheduling')
                  ? 'bg-[#0D1742]/5 text-[#0D1742]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#0D1742]'
              )}
            >
              Interview Schedule
            </Link>
            <Link
              href="/HeadDashboard/interview-settings"
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                pathname.startsWith('/HeadDashboard/interview-settings')
                  ? 'bg-[#0D1742]/5 text-[#0D1742]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#0D1742]'
              )}
            >
              Interview Questions
            </Link>
          </div>
        </div>
      </div>

      <Link
        href="/HeadDashboard/member-management"
        className={cn(navClass, isMembers ? activeClass : inactiveClass)}
      >
        Members
      </Link>
    </div>
  );

  return (
    <DashboardAppShell
      title={title ?? dynamicTitle}
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle={`${userSubtitle} ${departmentLabel}`}
      headerNav={showNavigation ? headerNav : undefined}
    >
      {children}
    </DashboardAppShell>
  );
}
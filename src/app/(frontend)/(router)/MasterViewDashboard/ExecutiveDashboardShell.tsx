'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { cn } from '@/lib/utils';

type ExecutiveDashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
  matchPrefixes?: string[];
  subItems?: { label: string; href: string }[];
};

const NAV: NavItem[] = [
  {
    href: '/MasterViewDashboard',
    label: 'Overview',
    exact: true,
  },
  {
    href: '/MasterViewDashboard/candidates',
    label: 'Recruitment',
    matchPrefixes: [
      '/MasterViewDashboard/candidates',
      '/MasterViewDashboard/interview-scheduling',
    ],
    subItems: [
      { label: 'Candidates', href: '/MasterViewDashboard/candidates' },
      {
        label: 'Interview Scheduling',
        href: '/MasterViewDashboard/interview-scheduling',
      },
    ],
  },
  {
    href: '/MasterViewDashboard/user-management',
    label: 'Users',
  },
  {
    href: '/MasterViewDashboard/system-config',
    label: 'Settings',
    matchPrefixes: [
      '/MasterViewDashboard/system-config',
      '/MasterViewDashboard/system-logs',
    ],
    subItems: [
      { label: 'System Config', href: '/MasterViewDashboard/system-config' },
      { label: 'System Logs', href: '/MasterViewDashboard/system-logs' },
    ],
  },
];

function getDynamicTitle(pathname: string): string {
  if (
    pathname.includes('/candidates') ||
    pathname.includes('/interview-scheduling')
  )
    return 'Recruitment Management';
  if (pathname.includes('/user-management')) return 'User Management';
  if (pathname.includes('/system-logs')) return 'System Logs';
  if (pathname.includes('/system-config')) return 'System Configuration';

  return 'Executive Overview';
}

export function ExecutiveDashboardShell({
  children,
  userName,
  userInitial,
  userAvatar,
}: ExecutiveDashboardShellProps) {
  const pathname = usePathname();
  const dynamicTitle = getDynamicTitle(pathname);

  const navClass =
    'flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all duration-200';
  const activeClass =
    'border border-[#DCB968] bg-white text-[#0D1742] shadow-sm ring-1 ring-[#DCB968]';
  const inactiveClass =
    'border border-transparent text-gray-500 hover:bg-gray-50 hover:text-[#0D1742]';

  const headerNav = (
    <div className="hidden rounded-full border border-gray-200 bg-white p-1 shadow-sm lg:flex">
      {NAV.map((item) => {
        const prefixes = item.matchPrefixes ?? [item.href];
        const active = item.exact
          ? pathname === item.href
          : prefixes.some(
              (p) => pathname === p || pathname.startsWith(`${p}/`)
            );

        if (item.subItems) {
          return (
            <div key={item.href} className="group relative">
              <Link
                href={item.href}
                className={cn(navClass, active ? activeClass : inactiveClass)}
              >
                {item.label}
                <i className="fa-solid fa-chevron-down ml-1 text-[10px] opacity-50 transition-transform duration-200 group-hover:rotate-180" />
              </Link>

              <div className="invisible absolute left-1/2 top-full mt-1 -translate-x-1/2 pt-1 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 z-50">
                <div className="flex w-52 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
                  {item.subItems.map((sub) => {
                    const isSubActive =
                      pathname === sub.href ||
                      pathname.startsWith(`${sub.href}/`);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                          isSubActive
                            ? 'bg-[#0D1742]/5 text-[#0D1742]'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-[#0D1742]'
                        )}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(navClass, active ? activeClass : inactiveClass)}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <DashboardAppShell
      title={dynamicTitle}
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle="Executive Board"
      headerNav={headerNav}
    >
      {children}
    </DashboardAppShell>
  );
}

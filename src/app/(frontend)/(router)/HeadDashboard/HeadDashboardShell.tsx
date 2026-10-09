'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { cn } from '@/lib/utils';

type HeadDashboardShellProps = {
  children: React.ReactNode;
  departmentLabel: string;
  /** Full name from session, or email local-part if name missing */
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
  title?: string;
  userSubtitle?: string;
  showNavigation?: boolean;
  navigationItems?: ReadonlyArray<readonly [href: string, label: string]>;
};

const HEAD_NAVIGATION_ITEMS = [
  ['/HeadDashboard', 'Application Form (Round 1)'],
  ['/HeadDashboard/interviews', 'Interview (Round 2)'],
  ['/HeadDashboard/interview-settings', 'Question Template'],
  ['/HeadDashboard/ranking', 'Ranking'],
] as const;

export function HeadDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
  userAvatar,
  title = 'Department Head Dashboard',
  userSubtitle = 'Department Head',
  showNavigation = true,
  navigationItems = HEAD_NAVIGATION_ITEMS,
}: HeadDashboardShellProps) {
  const pathname = usePathname();
  return (
    <DashboardAppShell
      title={title}
      badgeLabel={departmentLabel}
      badgeVariant="yellow"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle={userSubtitle}
    >
      {showNavigation && (
        <nav
          className="mb-6 flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-sm"
          aria-label="Recruitment rounds"
        >
          {navigationItems.map(([href, label]) => {
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
                  'shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  active
                    ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
      {children}
    </DashboardAppShell>
  );
}

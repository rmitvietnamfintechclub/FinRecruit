'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

type HeadDashboardShellProps = {
  children: React.ReactNode;
  departmentLabel: string;
  /** Full name from session, or email local-part if name missing */
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
};

export function HeadDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
  userAvatar,
}: HeadDashboardShellProps) {
  const pathname = usePathname();
  const NAV = [
    { href: '/HeadDashboard', label: 'Candidates', exact: true },
    { href: '/HeadDashboard/user-management', label: 'User Management' },
  ];

  return (
    <DashboardAppShell
      title="Department Head Dashboard"
      badgeLabel={departmentLabel}
      badgeVariant="yellow"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle="Department Head"
    >
      <nav className="border-border bg-card mb-4 flex gap-2 overflow-x-auto rounded-xl border p-2 shadow-sm sm:mb-6">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </DashboardAppShell>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

type ExecutiveDashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: '/MasterViewDashboard', label: 'Overview', exact: true },
  { href: '/MasterViewDashboard/candidates', label: 'Candidates' },
  { href: '/MasterViewDashboard/user-management', label: 'Users' },
  { href: '/MasterViewDashboard/system-config', label: 'System Config' },
];

export function ExecutiveDashboardShell({
  children,
  userName,
  userInitial,
  userAvatar,
}: ExecutiveDashboardShellProps) {
  const pathname = usePathname();

  return (
    <DashboardAppShell
      title="MasterView Dashboard"
      badgeLabel="Executive Board"
      badgeVariant="purple"
      userName={userName}
      userInitial={userInitial}
      userAvatar={userAvatar}
      userSubtitle="Executive Board"
    >
      <nav className="border-border bg-card mb-6 flex flex-wrap gap-2 rounded-xl border p-2 shadow-sm">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                active
                  ? 'bg-purple-600 text-white shadow-sm'
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

'use client';

import { ChevronDown } from 'lucide-react';
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
  /** Extra path prefixes that also mark this item active (grouped sub-pages). */
  matchPrefixes?: string[];
  /** Item groups sub-tabs; shows a small chevron. */
  hasSubmenu?: boolean;
};

const NAV: NavItem[] = [
  { href: '/MasterViewDashboard', label: 'Overview', exact: true },
  { href: '/MasterViewDashboard/candidates', label: 'Candidates' },
  { href: '/MasterViewDashboard/user-management', label: 'Users' },
  { href: '/MasterViewDashboard/interview-scheduling', label: 'Recruitment', hasSubmenu: true },
  {
    href: '/MasterViewDashboard/system-config',
    label: 'Settings',
    hasSubmenu: true,
    matchPrefixes: ['/MasterViewDashboard/system-config', '/MasterViewDashboard/system-logs'],
  },
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
      <nav className="border-border bg-card mb-4 flex gap-2 overflow-x-auto rounded-xl border p-2 shadow-sm sm:mb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((item) => {
          const prefixes = item.matchPrefixes ?? [item.href];
          const active = item.exact
            ? pathname === item.href
            : prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
                active
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
              {item.hasSubmenu ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>
      {children}
    </DashboardAppShell>
  );
}

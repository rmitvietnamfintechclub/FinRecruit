'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { cn } from '@/lib/utils';

type ExecutiveDashboardShellProps = {
  children: React.ReactNode;
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
};

const NAV = [
  { href: '/MasterViewDashboard', label: 'Overview', exact: true },
  { href: '/MasterViewDashboard/candidates', label: 'Recruitment', hasSubmenu: true },
  { href: '/MasterViewDashboard/user-management', label: 'Users' },
  { 
    href: '/MasterViewDashboard/system-config', 
    label: 'Settings', 
    hasSubmenu: true,
    matchPrefixes: ['/MasterViewDashboard/system-config', '/MasterViewDashboard/system-logs'] 
  },
];

export function ExecutiveDashboardShell({
  children,
  userName,
  userInitial,
  userAvatar,
}: ExecutiveDashboardShellProps) {
  const pathname = usePathname();

  const headerNav = (
    <nav className="mr-2 hidden items-center gap-6 md:flex">
      {NAV.map((item) => {
        const prefixes = item.matchPrefixes ?? [item.href];
        const active = item.exact
          ? pathname === item.href
          : prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-1.5 text-sm font-bold transition-colors',
              active ? 'text-[#0D1742]' : 'text-gray-500 hover:text-[#0D1742]'
            )}
          >
            {item.label}
            {item.hasSubmenu ? <ChevronDown className="size-4" strokeWidth={2.5} /> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <DashboardAppShell
      title="Interview Management"
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
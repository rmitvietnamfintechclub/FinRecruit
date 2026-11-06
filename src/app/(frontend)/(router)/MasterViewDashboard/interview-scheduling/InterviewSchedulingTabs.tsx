'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const BASE = '/MasterViewDashboard/interview-scheduling';

const TABS = [
  { href: BASE, label: 'Master Schedule', exact: true },
  {
    href: `${BASE}/interviewer-availability`,
    label: 'Interviewer Roster',
  },
  { href: `${BASE}/candidate-bookings`, label: 'Candidate Bookings' },
];

export function InterviewSchedulingTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      <nav
        role="tablist"
        aria-label="Interview scheduling"
        className="flex w-full items-center rounded-full border border-gray-200 bg-white p-1.5 shadow-sm"
      >
        {TABS.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);

          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={cn(
                'flex-1 text-center whitespace-nowrap rounded-full py-2.5 text-sm font-bold transition-all duration-300',
                active
                  ? 'bg-[#0D1742] text-[#DCB968] shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-[#0D1742]'
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

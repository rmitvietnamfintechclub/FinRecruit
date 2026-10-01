'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const BASE = '/MasterViewDashboard/interview-scheduling';

const TABS = [
  { href: BASE, label: 'Interview Schedule', exact: true },
  { href: `${BASE}/interviewer-availability`, label: 'Interviewer Availability' },
  { href: `${BASE}/candidate-bookings`, label: 'Candidate Bookings' },
];

export function InterviewSchedulingTabs() {
  const pathname = usePathname();
  return (
    <div
      role="tablist"
      aria-label="Interview scheduling"
      className="bg-muted/40 mb-4 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl p-1.5 sm:mb-6"
    >
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors',
              active
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

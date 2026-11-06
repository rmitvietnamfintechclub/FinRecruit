'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useDashboardTheme } from '@/hooks/use-dashboard-theme';
import { cn } from '@/lib/utils';

type PublicPageShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerColor: 'purple' | 'amber' | 'navy';
  minimal?: boolean;
};

const HEADER_THEMES = {
  navy: {
    wrapper: 'bg-[#0D1742] text-[#DCB968]',
    subtitle: 'text-gray-300',
  },
  amber: {
    wrapper: 'bg-[#DCB968] text-[#0D1742]',
    subtitle: 'text-[#0D1742]/80',
  },
  purple: {
    wrapper: 'bg-[#9810FA] text-white',
    subtitle: 'text-purple-100',
  },
};

export function PublicPageShell({
  children,
  title,
  subtitle,
  headerColor,
  minimal = false,
}: PublicPageShellProps) {
  useDashboardTheme();

  const theme = HEADER_THEMES[headerColor];

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FB] font-sans">
      {/* Ẩn hoàn toàn thẻ header nếu minimal = true */}
      {!minimal && (
        <header
          className={cn(
            'relative overflow-hidden px-4 py-6 sm:px-8 sm:py-8 shadow-md transition-all',
            theme.wrapper
          )}
        >
          <div className="absolute inset-0 bg-linear-to-r from-black/10 to-transparent pointer-events-none" />

          <div className="relative z-10 mx-auto flex w-full max-w-4xl items-center gap-4 px-4 sm:px-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
              <Image
                src="/ftc_logo.png"
                alt="FinTech Club Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>

            {title && (
              <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-4 duration-500">
                <h1 className="truncate text-lg font-black tracking-tight sm:text-2xl">
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className={cn(
                      'mt-1 text-xs font-medium sm:text-sm line-clamp-2 sm:line-clamp-1',
                      theme.subtitle
                    )}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Căn giữa Card thông báo theo chiều dọc nếu là minimal */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col">
        <div
          className={cn(
            'mx-auto w-full max-w-4xl flex-1 animate-in fade-in duration-500',
            minimal && 'flex items-center justify-center'
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

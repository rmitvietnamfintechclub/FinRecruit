'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useDashboardTheme } from '@/hooks/use-dashboard-theme';

type PublicPageShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerColor: 'purple' | 'amber';
};

/** Header for the unauthenticated interview pages. No session / next-auth. */
export function PublicPageShell({ children, title, subtitle, headerColor }: PublicPageShellProps) {
  useDashboardTheme();
  const purple = headerColor === 'purple';
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <header
        className="px-4 py-8 sm:px-8"
        style={
          purple
            ? { backgroundColor: '#9810FA', color: '#fff' }
            : { backgroundColor: '#E6B656', color: '#010A63' }
        }
      >
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4">
          <Image
            src="/ftc_logo.png"
            alt="FinTech Club Logo"
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-md shadow-sm"
          />
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm font-medium opacity-90">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <main className="bg-muted/30 flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

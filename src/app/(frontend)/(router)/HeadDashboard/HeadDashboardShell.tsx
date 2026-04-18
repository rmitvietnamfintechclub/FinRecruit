'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { LogoutButton } from '@/components/LogoutButton';

type HeadDashboardShellProps = {
  children: React.ReactNode;
  departmentLabel: string;
  /** Full name from session, or email local-part if name missing */
  userName: string;
  userInitial: string;
};

export function HeadDashboardShell({
  children,
  departmentLabel,
  userName,
  userInitial,
}: HeadDashboardShellProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    return savedTheme === 'dark' || (!savedTheme && prefersDark);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground transition-colors duration-300">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Image
            src="/ftc_logo.png"
            alt="FinTech Club Logo"
            width={48}
            height={48}
            className="rounded-md shadow-sm"
          />
          <h1 className="text-xl font-black tracking-tight text-blue-900 dark:text-blue-400">
            Department Head Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-5">
          <div className="rounded-xl border border-yellow-200 bg-yellow-100 px-4 py-1.5 text-sm font-bold text-yellow-700 shadow-sm dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-500">
            {departmentLabel}
          </div>

          <div className="mx-1 h-8 w-px bg-border" />

          <i className="fa-regular fa-bell cursor-pointer text-xl text-muted-foreground transition-colors hover:text-foreground" />

          <i
            className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon'} cursor-pointer text-xl text-muted-foreground transition-all hover:scale-110 hover:text-foreground`}
            onClick={toggleDarkMode}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') toggleDarkMode();
            }}
            role="button"
            tabIndex={0}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          />

          <LogoutButton
            label="Đăng xuất"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          />

          <div className="min-w-0 max-w-[200px] text-right">
            <p
              className="truncate text-sm font-semibold text-foreground"
              title={userName}
            >
              {userName}
            </p>
            <p className="truncate text-xs text-muted-foreground">Department Head</p>
          </div>

          <div className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-600 font-bold text-white shadow-md transition-opacity hover:opacity-90">
            {userInitial}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/30 p-4 transition-colors duration-300 sm:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

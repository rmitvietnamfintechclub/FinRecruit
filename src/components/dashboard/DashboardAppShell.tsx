'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { LogoutButton } from '@/components/LogoutButton';

export type DashboardBadgeVariant = 'yellow' | 'purple';

const BADGE_STYLES: Record<
  DashboardBadgeVariant,
  { border: string; bg: string; text: string; darkBorder: string; darkBg: string; darkText: string }
> = {
  yellow: {
    border: 'border-yellow-200',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    darkBorder: 'dark:border-yellow-900/50',
    darkBg: 'dark:bg-yellow-900/30',
    darkText: 'dark:text-yellow-500',
  },
  purple: {
    border: 'border-purple-200',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    darkBorder: 'dark:border-purple-900/50',
    darkBg: 'dark:bg-purple-900/30',
    darkText: 'dark:text-purple-400',
  },
};

const AVATAR_STYLES: Record<DashboardBadgeVariant, string> = {
  yellow: 'bg-blue-600',
  purple: 'bg-purple-600',
};

export type DashboardAppShellProps = {
  children: React.ReactNode;
  title: string;
  badgeLabel: string;
  badgeVariant: DashboardBadgeVariant;
  userName: string;
  userInitial: string;
  userSubtitle: string;
  /** Avatar URL from the session (e.g. Google OAuth picture). Falls back to
   * the colored initial circle when missing or when the image fails to load. */
  userAvatar?: string | null;
  showLogout?: boolean;
};

function UserAvatar({
  userName,
  userInitial,
  userAvatar,
  badgeVariant,
  size = 'md',
}: {
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
  badgeVariant: DashboardBadgeVariant;
  size?: 'sm' | 'md';
}) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showImage = Boolean(userAvatar) && !avatarBroken;
  const dim = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-10 w-10';

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic OAuth URL
      <img
        src={userAvatar ?? ''}
        alt={userName}
        referrerPolicy="no-referrer"
        onError={() => setAvatarBroken(true)}
        className={`${dim} shrink-0 cursor-pointer rounded-full border border-border object-cover shadow-md transition-opacity hover:opacity-90`}
        title={userName}
      />
    );
  }

  return (
    <div
      className={`flex ${dim} shrink-0 cursor-pointer items-center justify-center rounded-full font-bold text-white shadow-md transition-opacity hover:opacity-90 ${AVATAR_STYLES[badgeVariant]}`}
      title={userName}
    >
      {userInitial}
    </div>
  );
}

export function DashboardAppShell({
  children,
  title,
  badgeLabel,
  badgeVariant,
  userName,
  userInitial,
  userSubtitle,
  userAvatar,
  showLogout = true,
}: DashboardAppShellProps) {
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

  const b = BADGE_STYLES[badgeVariant];

  const badgeEl = (
    <div
      className={`max-w-[min(100%,220px)] truncate rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm sm:max-w-none sm:px-4 sm:text-sm ${b.border} ${b.bg} ${b.text} ${b.darkBorder} ${b.darkBg} ${b.darkText}`}
      title={badgeLabel}
    >
      {badgeLabel}
    </div>
  );

  const themeBtn = (
    <i
      className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon'} cursor-pointer text-lg text-muted-foreground transition-all hover:scale-110 hover:text-foreground sm:text-xl`}
      onClick={toggleDarkMode}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') toggleDarkMode();
      }}
      role="button"
      tabIndex={0}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    />
  );

  const logoutEl = showLogout ? (
    <>
      <LogoutButton
        label="Sign out"
        className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
      />
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: '/loginPage' })}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground sm:hidden"
        title="Sign out"
        aria-label="Sign out"
      >
        <i className="fa-solid fa-right-from-bracket text-sm" aria-hidden />
      </button>
    </>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground transition-colors duration-300">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <header className="z-10 shrink-0 border-b border-border bg-card px-4 py-3 shadow-sm transition-colors duration-300 sm:px-6 sm:py-0 sm:h-16 lg:px-8">
        {/* Primary row: brand + quick actions */}
        <div className="flex items-center justify-between gap-3 sm:h-16">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Image
              src="/ftc_logo.png"
              alt="FinTech Club Logo"
              width={48}
              height={48}
              className="size-9 shrink-0 rounded-md shadow-sm sm:size-12"
            />
            <h1 className="truncate text-base font-black tracking-tight text-blue-900 dark:text-blue-400 sm:text-xl">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-4 md:flex">
              {badgeEl}
              <div className="h-8 w-px bg-border" />
              <i className="fa-regular fa-bell cursor-pointer text-xl text-muted-foreground transition-colors hover:text-foreground" />
              {themeBtn}
              {logoutEl}
              <div className="min-w-0 max-w-[160px] text-right lg:max-w-[200px]">
                <p
                  className="truncate text-sm font-semibold text-foreground"
                  title={userName}
                >
                  {userName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {userSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {themeBtn}
              {logoutEl}
              <UserAvatar
                userName={userName}
                userInitial={userInitial}
                userAvatar={userAvatar}
                badgeVariant={badgeVariant}
                size="sm"
              />
            </div>

            <div className="hidden md:block">
              <UserAvatar
                userName={userName}
                userInitial={userInitial}
                userAvatar={userAvatar}
                badgeVariant={badgeVariant}
              />
            </div>
          </div>
        </div>

        {/* Mobile secondary row: role badge + user name */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2 md:hidden">
          {badgeEl}
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-xs font-semibold text-foreground">
              {userName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {userSubtitle}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/30 p-3 transition-colors duration-300 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

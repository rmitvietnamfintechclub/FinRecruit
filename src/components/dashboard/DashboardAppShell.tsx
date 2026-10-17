'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

export type DashboardAppShellProps = {
  children: React.ReactNode;
  title: string;
  userName: string;
  userInitial: string;
  userSubtitle: string;
  userAvatar?: string | null;
  /** Inject thanh điều hướng riêng của từng Role vào giữa Navbar */
  headerNav?: React.ReactNode;
};

function UserAvatar({
  userName,
  userInitial,
  userAvatar,
}: {
  userName: string;
  userInitial: string;
  userAvatar?: string | null;
}) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showImage = Boolean(userAvatar) && !avatarBroken;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={userAvatar ?? ''}
        alt={userName}
        referrerPolicy="no-referrer"
        onError={() => setAvatarBroken(true)}
        className="size-10 shrink-0 rounded-full border border-gray-200 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0D1742] text-sm font-bold text-[#DCB968] shadow-sm">
      {userInitial}
    </div>
  );
}

export function DashboardAppShell({
  children,
  title,
  userName,
  userInitial,
  userSubtitle,
  userAvatar,
  headerNav,
}: DashboardAppShellProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tự động đóng Dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] font-sans text-gray-900">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <header className="z-40 shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:h-16 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-4">
          {/* LEFT: Logo & App Title */}
          <div className="flex items-center gap-2">
            <Image
              src="/ftc_logo.png"
              alt="FinTech Club Logo"
              width={32}
              height={32}
              className="size-12 object-contain"
            />
            <h1 className="hidden text-xl font-black tracking-tight text-[#0D1742] sm:block">
              {title}
            </h1>
          </div>

          {/* RIGHT: Navigation, Theme, User Profile */}
          <div className="flex flex-1 items-center justify-end gap-4 sm:gap-6">
            {/* Dynamic Nav (Pill or Links) injected here */}
            {headerNav}

            {/* Vertical Divider */}
            <div className="hidden h-6 w-px bg-gray-200 sm:block" />

            {/* User Profile & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 rounded-full text-left outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#DCB968]"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <div className="hidden flex-col items-end sm:flex">
                  <p className="text-sm font-bold leading-tight text-gray-900">
                    {userName}
                  </p>
                  <p className="mt-0.5 text-xs font-medium leading-tight text-gray-500">
                    {userSubtitle}
                  </p>
                </div>
                <UserAvatar
                  userName={userName}
                  userInitial={userInitial}
                  userAvatar={userAvatar}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                  <div className="border-b border-gray-100 px-3 py-3 sm:hidden">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {userName}
                    </p>
                    <p className="truncate text-xs font-medium text-gray-500">
                      {userSubtitle}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() =>
                        void signOut({ callbackUrl: '/loginPage' })
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <i className="fa-solid fa-right-from-bracket" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

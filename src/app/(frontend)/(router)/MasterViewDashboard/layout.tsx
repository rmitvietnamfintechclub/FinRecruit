"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function MasterDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8 shadow-sm transition-colors duration-300 z-10">
        
        {/* Left Side: Logo & MasterView Title */}
        <div className="flex items-center gap-4">
          <Image src="/ftc_logo.png" alt="FinTech Club Logo" width={48} height={48} className="rounded-md shadow-sm" />
          <h1 className="text-xl font-black tracking-tight text-blue-900 dark:text-blue-400">
            MasterView Dashboard
          </h1>
        </div>
        
        {/* Right Side: Exec Board Badge & Icons */}
        <div className="flex items-center gap-5">
          {/* UPDATED: Executive Board Badge (Purple to distinguish from Dept Heads) */}
          <div className="rounded-xl border border-purple-200 bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 shadow-sm dark:bg-purple-900/30 dark:border-purple-900/50 dark:text-purple-400">
            Executive Board
          </div>

          <div className="h-8 w-px bg-border mx-1"></div>
          <i className="fa-regular fa-bell text-xl text-muted-foreground cursor-pointer hover:text-foreground transition-colors"></i>
          
          {mounted ? (
            <i 
              className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon'} text-xl cursor-pointer text-muted-foreground hover:text-foreground transition-all hover:scale-110`}
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            ></i>
          ) : (
            <div className="w-5 h-5"></div> 
          )}
          
          {/* President/Exec Avatar */}
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-purple-600 font-bold text-white shadow-md hover:opacity-90 transition-opacity">
            EB
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-8 transition-colors duration-300">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function HeadDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme === 'dark' || (!savedTheme && prefersDark);
  });
  
  // --- NEW: Add a mounted state to prevent hydration errors ---
  const [mounted] = useState(true);

  // Sync the document class when the theme state changes
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

      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8 shadow-sm transition-colors duration-300 z-10">
        
        {/* Left Side: Logo & Title */}
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
        
        {/* Right Side: Status Box & Icons */}
        <div className="flex items-center gap-5">
          
          <div className="rounded-xl border border-yellow-200 bg-yellow-100 px-4 py-1.5 text-sm font-bold text-yellow-700 shadow-sm dark:bg-yellow-900/30 dark:border-yellow-900/50 dark:text-yellow-500">
            Technology Dept.
          </div>

          <div className="h-8 w-px bg-border mx-1"></div>

          <i className="fa-regular fa-bell text-xl text-muted-foreground cursor-pointer hover:text-foreground transition-colors"></i>
          
          {/* --- UPDATED: Only render the icon if the component has mounted --- */}
          {mounted ? (
            <i 
              className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon'} text-xl cursor-pointer text-muted-foreground hover:text-foreground transition-all hover:scale-110`}
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            ></i>
          ) : (
            // A placeholder to prevent the layout from shifting while it checks the theme
            <div className="w-[20px] h-[20px]"></div> 
          )}
          
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-600 font-bold text-white shadow-md hover:opacity-90 transition-opacity">
            T
          </div>
          
        </div>
      </header>
      
      {/* Main Page Content */}
      <main className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-8 transition-colors duration-300">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
      
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';

/** Syncs `dark` class on `<html>` from localStorage (same as dashboard shell). */
export function useDashboardTheme() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
    // Readiness depends on applying this browser-only class after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  return ready;
}

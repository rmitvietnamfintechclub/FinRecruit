'use client';

import { useEffect, useRef } from 'react';

type UseIntervalWhenVisibleOptions = {
  /** Interval in milliseconds. Default 30_000. */
  intervalMs?: number;
  /** When false, the interval is not started. */
  enabled?: boolean;
};

/**
 * Runs `callback` on a fixed interval while the document tab is visible.
 * Pauses when the tab is hidden (Page Visibility API).
 */
export function useIntervalWhenVisible(
  callback: () => void,
  { intervalMs = 30_000, enabled = true }: UseIntervalWhenVisibleOptions = {}
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clear = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const start = () => {
      clear();
      intervalId = setInterval(() => {
        if (!document.hidden) {
          savedCallback.current();
        }
      }, intervalMs);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clear();
      } else {
        savedCallback.current();
        start();
      }
    };

    if (!document.hidden) {
      start();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clear();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}

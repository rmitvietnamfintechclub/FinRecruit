'use client';

import { useEffect, useRef, useState } from 'react';
import type { SaveState } from '@/lib/interview-cockpit/types';

export function useDebouncedSave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delay = 700
) {
  const [state, setState] = useState<SaveState>('saved');
  const initialized = useRef(false);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const markSaving = window.setTimeout(() => setState('saving'), 0);
    const timeout = window.setTimeout(() => {
      void saveRef
        .current(value)
        .then(() => setState('saved'))
        .catch(() => setState('error'));
    }, delay);
    return () => {
      window.clearTimeout(markSaving);
      window.clearTimeout(timeout);
    };
  }, [delay, value]);

  return state;
}

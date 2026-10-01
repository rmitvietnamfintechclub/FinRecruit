'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RoundMode = 'round1' | 'round2';

type RoundModeTabsProps = {
  mode: RoundMode;
  isLocked: boolean;
  onChange: (mode: RoundMode) => void;
};

export function RoundModeTabs({ mode, isLocked, onChange }: RoundModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Recruitment round"
      className="bg-muted/40 flex w-fit items-center gap-1 rounded-xl p-1.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'round1'}
        onClick={() => onChange('round1')}
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
          mode === 'round1'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Round 1
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'round2'}
        disabled={!isLocked}
        onClick={() => onChange('round2')}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors',
          mode === 'round2'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          !isLocked && 'cursor-not-allowed opacity-50'
        )}
        title={!isLocked ? 'Lock Round 1 to unlock Round 2' : undefined}
      >
        {!isLocked && <Lock className="h-3.5 w-3.5" aria-hidden />}
        Round 2
      </button>
    </div>
  );
}

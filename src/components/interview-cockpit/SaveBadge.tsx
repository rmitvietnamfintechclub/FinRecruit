import { AlertTriangle, Check, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveState } from '@/lib/interview-cockpit/types';

export function SaveBadge({ state }: { state: SaveState }) {
  const config =
    state === 'saving'
      ? [LoaderCircle, 'Saving…', 'bg-blue-50 text-blue-700 border border-blue-200']
      : state === 'error'
        ? [AlertTriangle, 'Save failed', 'bg-[#B82649]/10 text-[#B82649] border border-[#B82649]/20']
        : [Check, 'All changes saved', 'bg-emerald-50 text-emerald-700 border border-emerald-200'];
        
  const Icon = config[0] as typeof Check;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-sm transition-all',
        config[2] as string
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', state === 'saving' && 'animate-spin')} />
      {config[1] as string}
    </span>
  );
}
import { AlertTriangle, Check, LoaderCircle, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Round2Status, SaveState } from '@/lib/interview-cockpit/types';

export function SaveBadge({
  state,
  status,
}: {
  state: SaveState;
  status: Round2Status;
}) {
  if (status === 'No Show')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-extrabold text-orange-800">
        <UserX className="h-4 w-4" /> No Show
      </span>
    );
  const config =
    state === 'saving'
      ? [LoaderCircle, 'Saving…', 'bg-blue-50 text-blue-700']
      : state === 'error'
        ? [AlertTriangle, 'Save failed', 'bg-red-50 text-red-700']
        : [Check, 'All changes saved', 'bg-emerald-100 text-emerald-800'];
  const Icon = config[0] as typeof Check;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold',
        config[2] as string
      )}
    >
      <Icon className={cn('h-4 w-4', state === 'saving' && 'animate-spin')} />
      {config[1] as string}
    </span>
  );
}

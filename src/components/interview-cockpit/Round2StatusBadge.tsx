import { Check, CircleX, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BackendRound2Status } from '@/lib/interview-cockpit/types';

const STATUS_STYLE: Record<BackendRound2Status, string> = {
  Pending: 'border-[#fff085] bg-[#fef9c2] text-[#a65f00]',
  Pass: 'border-[#a7f3d0] bg-[#d0fae5] text-[#006045]',
  Fail: 'border-[#fca5a5] bg-[#ffe2e2] text-[#e7000b]',
};

const STATUS_ICON = {
  Pending: Clock3,
  Pass: Check,
  Fail: CircleX,
};

export function Round2StatusBadge({
  status,
  className,
}: {
  status: BackendRound2Status;
  className?: string;
}) {
  const Icon = STATUS_ICON[status];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase',
        STATUS_STYLE[status],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {status}
    </span>
  );
}

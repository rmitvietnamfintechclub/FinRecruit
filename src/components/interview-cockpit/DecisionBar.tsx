'use client';

import { Check, CircleX, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type BackendRound2Status } from '@/lib/interview-cockpit/types';

// Đồng bộ bảng màu chuẩn với statusBadge
const STYLE: Record<BackendRound2Status, string> = {
  Pending:
    'border-[#F7D27F] bg-[#FFEFCA] text-[#A28436] hover:border-amber-300',
  Pass: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
  Fail: 'border-[#B82649]/30 bg-[#B82649]/10 text-[#B82649] hover:border-[#B82649]/50',
};

const ACTIVE_STYLE: Record<BackendRound2Status, string> = {
  Pending:
    'bg-[#F7D27F] text-[#0D1742] border-[#A28436] shadow-md ring-2 ring-[#A28436]/30',
  Pass: 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-600/30',
  Fail: 'bg-[#B82649] text-white border-[#901c37] shadow-md ring-2 ring-[#B82649]/30',
};

const INACTIVE_STYLE = 'opacity-40 grayscale-[50%]';

const ICON = {
  Pending: Clock,
  Pass: Check,
  Fail: CircleX,
};

export function DecisionBar({
  value,
  disabled,
  onChange,
  compact = false,
}: {
  value: BackendRound2Status;
  disabled?: boolean;
  onChange: (status: BackendRound2Status) => void;
  compact?: boolean;
}) {
  const hasDecision =
    value === 'Pass' || value === 'Fail' || value === 'Pending';

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-3',
        compact
          ? ''
          : 'sticky bottom-0 z-20 bg-white/90 py-4 backdrop-blur-md border-t border-gray-100 mt-4 px-6 -mx-6'
      )}
      role="group"
      aria-label="Final candidate decision"
    >
      {(['Pass', 'Pending', 'Fail'] as BackendRound2Status[]).map((status) => {
        const Icon = ICON[status];
        const isSelected = value === status;

        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D1742] disabled:pointer-events-none disabled:cursor-not-allowed',
              STYLE[status],
              isSelected && ACTIVE_STYLE[status],
              hasDecision && !isSelected && INACTIVE_STYLE
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {status.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

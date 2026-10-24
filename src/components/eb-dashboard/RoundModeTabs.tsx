'use client';

import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

export type RoundMode = 'round1' | 'round2';

type RoundModeTabsProps = {
  mode: RoundMode;
  isLocked: boolean;
  isLoading?: boolean;
  onChange: (mode: RoundMode) => void;
};

export function RoundModeTabs({
  mode,
  isLocked,
  isLoading,
  onChange,
}: RoundModeTabsProps) {
  if (isLoading) {
    return (
      <div
        className="flex w-full animate-pulse rounded-full border border-gray-200 bg-white p-1.5 shadow-sm"
        aria-hidden="true"
      >
        <div className="h-10 flex-1 rounded-full bg-gray-200/60" />
        <div className="h-10 flex-1 rounded-full bg-transparent" />
      </div>
    );
  }

  // Tách riêng cục button Round 2 ra để tái sử dụng
  const round2Button = (
    <span className={cn('flex flex-1', !isLocked && 'cursor-not-allowed')}>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'round2'}
        disabled={!isLocked}
        onClick={() => onChange('round2')}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-all duration-300 disabled:pointer-events-none',
          mode === 'round2'
            ? 'bg-[#0D1742] text-[#DCB968] shadow-md'
            : 'text-gray-500',
          !isLocked
            ? 'opacity-50 hover:bg-transparent'
            : 'hover:bg-gray-100 hover:text-[#0D1742]'
        )}
      >
        {!isLocked && (
          <i className="fa-solid fa-lock text-[11px]" aria-hidden />
        )}
        Interview (Round 2)
      </button>
    </span>
  );

  return (
    <div
      role="tablist"
      aria-label="Recruitment round"
      className="flex w-full rounded-full border border-gray-200 bg-white p-1.5 shadow-sm"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'round1'}
        onClick={() => onChange('round1')}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold transition-all duration-300',
          mode === 'round1'
            ? 'bg-[#0D1742] text-[#DCB968] shadow-md' // Brand Colors cho trạng thái Active
            : 'text-gray-500 hover:bg-gray-100 hover:text-[#0D1742]'
        )}
      >
        Application Form (Round 1)
      </button>

      {/* CHỈ RENDER TOOLTIP KHI CHƯA KHÓA XONG ROUND 1 */}
      {!isLocked ? (
        <Tooltip content="Round 2 interview pool is locked. All Department Heads must finalize Round 1 evaluations first.">
          {round2Button}
        </Tooltip>
      ) : (
        round2Button
      )}
    </div>
  );
}

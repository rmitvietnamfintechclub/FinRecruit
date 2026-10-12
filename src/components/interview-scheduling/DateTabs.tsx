'use client';

import { cn } from '@/lib/utils';

type DateTabsProps = {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  activeClassName?: string;
};

export function DateTabs({
  options,
  value,
  onChange,
  ariaLabel = 'Filter',
  activeClassName = 'bg-blue-600 text-white shadow-sm',
}: DateTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="bg-muted/40 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl p-1.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors',
            value === o.value
              ? activeClassName
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

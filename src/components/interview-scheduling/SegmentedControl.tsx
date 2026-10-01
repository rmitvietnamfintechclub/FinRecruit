'use client';

import { cn } from '@/lib/utils';

type SegmentedControlProps<T extends string> = {
  options: Array<{ value: T; label: string; color?: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  activeClassName: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  activeClassName,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="bg-muted flex flex-wrap gap-1 rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          style={value === o.value && o.color ? { backgroundColor: o.color, color: '#fff' } : undefined}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition-colors',
            value === o.value ? (o.color ? 'shadow-sm' : activeClassName) : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

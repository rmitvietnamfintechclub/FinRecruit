'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type AppNoticeVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANT_STYLES: Record<
  AppNoticeVariant,
  {
    icon: string;
    container: string;
    iconColor: string;
    title: string;
    message: string;
  }
> = {
  success: {
    icon: 'fa-circle-check',
    container: 'border-emerald-200 bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'text-emerald-800',
    message: 'text-emerald-700',
  },
  error: {
    icon: 'fa-circle-exclamation',
    container: 'border-red-200 bg-red-50',
    iconColor: 'text-red-600',
    title: 'text-red-800',
    message: 'text-red-700',
  },
  warning: {
    icon: 'fa-triangle-exclamation',
    container: 'border-amber-200 bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'text-amber-800',
    message: 'text-amber-700',
  },
  info: {
    icon: 'fa-circle-info',
    container: 'border-[#0D1742]/15 bg-[#0D1742]/5',
    iconColor: 'text-[#0D1742]',
    title: 'text-[#0D1742]',
    message: 'text-[#0D1742]/80',
  },
};

const DEFAULT_TITLES: Record<AppNoticeVariant, string> = {
  success: 'Success',
  error: 'Something went wrong',
  warning: 'Please note',
  info: 'Information',
};

type AppNoticeProps = {
  variant: AppNoticeVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  action?: React.ReactNode;
};

export function AppNotice({
  variant,
  title,
  children,
  onDismiss,
  className,
  action,
}: AppNoticeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2',
        styles.container,
        className
      )}
    >
      <i
        className={cn(
          'fa-solid mt-0.5 text-[18px]',
          styles.icon,
          styles.iconColor
        )}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold', styles.title)}>
          {title ?? DEFAULT_TITLES[variant]}
        </p>
        <div
          className={cn(
            'mt-0.5 text-sm font-medium leading-relaxed',
            styles.message
          )}
        >
          {children}
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/5 active:scale-95',
            styles.iconColor
          )}
          aria-label="Dismiss"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>
      ) : null}
    </div>
  );
}

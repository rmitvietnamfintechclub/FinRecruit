'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppNoticeVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANT_STYLES: Record<
  AppNoticeVariant,
  {
    icon: LucideIcon;
    container: string;
    iconWrap: string;
    title: string;
    message: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    container:
      'border-green-200/80 bg-gradient-to-r from-green-50 to-green-50/40 dark:border-green-900/50 dark:from-green-950/50 dark:to-green-950/20',
    iconWrap: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
    title: 'text-green-900 dark:text-green-300',
    message: 'text-green-800/90 dark:text-green-400/90',
  },
  error: {
    icon: AlertCircle,
    container:
      'border-red-200/80 bg-gradient-to-r from-red-50 to-red-50/40 dark:border-red-900/50 dark:from-red-950/50 dark:to-red-950/20',
    iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    title: 'text-red-900 dark:text-red-300',
    message: 'text-red-800/90 dark:text-red-400/90',
  },
  warning: {
    icon: AlertTriangle,
    container:
      'border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/40 dark:border-amber-900/50 dark:from-amber-950/50 dark:to-amber-950/20',
    iconWrap: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-300',
    message: 'text-amber-800/90 dark:text-amber-400/90',
  },
  info: {
    icon: Info,
    container:
      'border-blue-200/80 bg-gradient-to-r from-blue-50 to-blue-50/40 dark:border-blue-900/50 dark:from-blue-950/50 dark:to-blue-950/20',
    iconWrap: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-300',
    message: 'text-blue-800/90 dark:text-blue-400/90',
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
  const Icon = styles.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border p-4 shadow-sm',
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          styles.iconWrap
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold', styles.title)}>
          {title ?? DEFAULT_TITLES[variant]}
        </p>
        <div className={cn('mt-1 text-sm leading-relaxed', styles.message)}>
          {children}
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground -mr-1 shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

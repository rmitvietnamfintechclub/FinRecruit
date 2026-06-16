'use client';

import * as React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConfirmModalVariant = 'default' | 'destructive';

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
};

/**
 * Lightweight modal dialog for destructive confirmations. Replaces native
 * `window.confirm` so we can show branded warnings instead of the OS alert.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmModalProps) {
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const Icon = variant === 'destructive' ? AlertTriangle : Info;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div className="bg-card border-border relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              variant === 'destructive'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-modal-title"
              className="text-base font-bold text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => {
              void onConfirm();
            }}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

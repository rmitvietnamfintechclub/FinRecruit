'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'default' | 'destructive';
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'default',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm transition-opacity"
      role="presentation"
      onClick={loading ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-200 rounded-3xl bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-4">
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-full sm:size-12',
              variant === 'destructive'
                ? 'bg-[#B82649]/10 text-[#B82649]'
                : 'bg-[#F0EDFF] text-[#2C305F]'
            )}
          >
            <i
              className={cn(
                'fa-solid text-xl sm:text-lg',
                variant === 'destructive'
                  ? 'fa-triangle-exclamation'
                  : 'fa-circle-question'
              )}
              aria-hidden
            />
          </div>
          <div className="mt-1 min-w-0 flex-1">
            <h3
              id="confirm-dialog-title"
              className="text-xl font-black tracking-tight text-gray-900"
            >
              {title}
            </h3>
            <div className="mt-2 text-sm font-medium leading-relaxed text-gray-500">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="w-full rounded-xl bg-gray-50 px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto',
              variant === 'destructive'
                ? 'bg-[#B82649] text-white shadow-sm hover:bg-[#B82649]/90'
                : 'bg-[#0D1742] text-[#DCB968] shadow-sm hover:bg-[#0D1742]/90'
            )}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

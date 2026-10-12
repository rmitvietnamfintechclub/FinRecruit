'use client';

import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';

type ShareLinkModalProps = {
  open: boolean;
  title: string;
  url: string;
  caption: string;
  onClose: () => void;
};

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={
        className ??
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#9810FA] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90'
      }
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function ShareLinkModal({ open, title, url, caption, onClose }: ShareLinkModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border-border w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="border-input bg-background min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <CopyButton text={url} />
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{caption}</p>
      </div>
    </div>
  );
}

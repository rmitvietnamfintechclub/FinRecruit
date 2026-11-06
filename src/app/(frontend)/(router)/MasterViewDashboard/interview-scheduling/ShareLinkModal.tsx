'use client';

import { Check, Copy, Link as LinkIcon, X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

// Thành phần nút Copy siêu nhỏ gọn
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={
        className ??
        'inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-4 py-2.5 text-sm font-bold text-[#DCB968] transition-all duration-300 hover:bg-[#1a2b75] focus:outline-none focus:ring-2 focus:ring-[#0D1742]/50'
      }
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 animate-in zoom-in" aria-hidden />
          <span className="animate-in fade-in">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 animate-in zoom-in" aria-hidden />
          <span className="animate-in fade-in">Copy Link</span>
        </>
      )}
    </button>
  );
}

type LinkItem = { label: string; url: string };

type ShareLinkModalProps = {
  open: boolean;
  title: string;
  caption: string;
  links: LinkItem[]; // Nhận mảng các links thay vì 1 URL duy nhất
  onClose: () => void;
  isSuccessView?: boolean; // Tùy chọn hiển thị icon Success lớn
};

export function ShareLinkModal({ open, title, caption, links, onClose, isSuccessView = false }: ShareLinkModalProps) {
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
      className="fixed inset-0 z-60 flex items-center justify-center bg-[#0D1742]/60 p-4 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-[24px] border border-gray-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {isSuccessView ? (
          <div className="flex flex-col items-center text-center mb-8 relative">
             <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute -right-2 -top-2 rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </div>
            <h3 className="text-2xl font-black text-[#0D1742] tracking-tight">{title}</h3>
            <p className="mt-2 text-sm font-medium text-[#5E5E92]">{caption}</p>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 shadow-sm">
                <LinkIcon className="h-5 w-5 text-[#0D1742]" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0D1742] tracking-tight">{title}</h3>
                <p className="text-[13px] font-medium text-[#5E5E92] mt-0.5">{caption}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="space-y-5">
          {links.map((row, index) => (
            <div key={index}>
              <p className="mb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#0D1742]">{row.label}</p>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-1.5 focus-within:border-[#0D1742] focus-within:ring-1 focus-within:ring-[#0D1742] transition-all">
                <input
                  readOnly
                  value={row.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm truncate font-medium text-gray-700 outline-none"
                  aria-label="Share link URL"
                />
                <div className="shrink-0 bg-white rounded-lg shadow-sm">
                  <CopyButton text={row.url} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {isSuccessView && (
          <button
            type="button"
            onClick={onClose}
            className="mt-8 flex w-full items-center justify-center rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75]"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
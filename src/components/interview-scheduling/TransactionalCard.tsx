'use client';

import { Check, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type TransactionalCardProps = {
  variant: 'success' | 'failure';
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
};

/** Dark result card used by the public flows (success / failure). */
export function TransactionalCard({ variant, title, subtitle, children, actions }: TransactionalCardProps) {
  const success = variant === 'success';
  return (
    <div className="mx-auto w-full max-w-md rounded-[18px] border border-[#232838] bg-[#12151F] p-8 text-center shadow-2xl">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: success ? '#0D2416' : 'rgba(255,161,0,0.27)' }}
      >
        {success ? (
          <Check className="h-8 w-8" style={{ color: '#22C55E' }} aria-hidden />
        ) : (
          <TriangleAlert className="h-8 w-8" style={{ color: '#FFA200' }} aria-hidden />
        )}
      </div>
      <h2 className="mt-5 text-2xl font-extrabold" style={{ color: '#DEE1F7' }}>{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p> : null}
      {children ? <div className="mt-6 text-left">{children}</div> : null}
      <div className="mt-6">{actions}</div>
    </div>
  );
}

export function DetailRows({ rows }: { rows: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-[#232838] rounded-xl border border-[#232838] bg-[#171A26]">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{r.label}</dt>
          <dd className="text-right text-sm font-semibold" style={{ color: '#DEE1F7' }}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

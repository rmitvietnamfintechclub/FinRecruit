'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TransactionalCardProps = {
  variant: 'success' | 'failure';
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
};

/** Card hiển thị kết quả (Thành công / Thất bại) đồng nhất với Brand UI và Responsive 100% */
export function TransactionalCard({
  variant,
  title,
  subtitle,
  children,
  actions,
}: TransactionalCardProps) {
  const isSuccess = variant === 'success';

  return (
    <div className="mx-auto w-full md:max-w-xl rounded-[24px] border border-gray-200 bg-white p-5 sm:p-8 text-center shadow-xl">
      <div
        className={cn(
          'mx-auto flex size-14 sm:size-16 items-center justify-center rounded-2xl border shadow-sm',
          isSuccess
            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
            : 'border-red-100 bg-red-50 text-red-600'
        )}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        ) : (
          <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        )}
      </div>

      <h2 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-black tracking-tight text-[#0D1742]">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-2 text-xs sm:text-[14px] font-medium leading-relaxed text-[#5E5E92]">
          {subtitle}
        </p>
      )}

      {children && <div className="mt-6 sm:mt-8 text-left">{children}</div>}

      <div className="mt-6 sm:mt-8">{actions}</div>
    </div>
  );
}

export function DetailRows({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
      {rows.map((r) => (
        <div
          key={r.label}
          // Responsive Flex: Dọc trên Mobile, Ngang trên Desktop
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50/50 transition-colors hover:bg-gray-50"
        >
          <dt className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-[#5E5E92]">
            {r.label}
          </dt>
          <dd className="text-left sm:text-right text-xs sm:text-[13px] font-bold text-[#0D1742]">
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

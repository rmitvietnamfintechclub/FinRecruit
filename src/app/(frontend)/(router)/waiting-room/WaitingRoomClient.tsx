'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export function WaitingRoomClient({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  // Auto-poll: Tự động kiểm tra quyền mỗi 10 giây
  useEffect(() => {
    const interval = setInterval(() => {
      void checkStatus();
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);

    try {
      // Gọi update() để NextAuth làm mới lại Token (JWT) từ server
      const updatedSession = await update();

      // Nếu role đã thay đổi khác 'Guest', lập tức đưa user vào Dashboard
      if (updatedSession?.user?.role && updatedSession.user.role !== 'Guest') {
        router.push('/');
        router.refresh();
      }
    } finally {
      // Giả lập delay một chút để UI nút quay mượt mà hơn khi user bấm thủ công
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center">
      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-sm ring-1 ring-foreground/5 sm:p-12">
        {/* Radar Pulse Animation (SaaS Standard for Waiting States) */}
        <div className="relative mb-8 flex size-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#DCB968]/20 duration-1000" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-[#DCB968]/30 duration-1000" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-[#0D1742] shadow-md">
            <ShieldAlert className="size-6 text-[#DCB968]" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-xl font-black tracking-tight text-[#0D1742] dark:text-[#EBEBEB] sm:text-2xl">
          Account Under Review
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Hello,{' '}
          <span className="font-bold text-foreground">{displayName}</span>. The
          EBMB is currently verifying your membership. This page will{' '}
          <span className="font-semibold text-[#DCB968]">
            automatically refresh
          </span>{' '}
          once your role is assigned. You do not need to sign out.
        </p>

        {email && (
          <div className="mt-6 rounded-lg bg-muted/50 px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground">{email}</p>
          </div>
        )}

        <div className="mt-8 flex w-full flex-col items-center gap-3 border-t border-border/60 pt-8">
          <button
            type="button"
            onClick={() => void checkStatus()}
            disabled={isChecking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0D1742]/90 disabled:pointer-events-none disabled:opacity-70 dark:bg-[#DCB968] dark:text-[#0D1742] dark:hover:bg-[#DCB968]/90 sm:w-auto"
          >
            <RefreshCw
              className={`size-4 ${isChecking ? 'animate-spin' : ''}`}
            />
            {isChecking ? 'Checking status...' : 'Check Status Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

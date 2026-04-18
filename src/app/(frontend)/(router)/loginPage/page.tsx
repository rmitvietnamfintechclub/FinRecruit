'use client';

import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getHomePathForRole } from '@/lib/role-routes';

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    if (!session?.user) {
      return;
    }
    router.replace(getHomePathForRole(session.user.role ?? null));
  }, [session, status, router]);

  if (status === 'loading' || session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-zinc-100 via-zinc-50 to-sky-50 font-sans text-muted-foreground">
        <p className="text-sm font-medium">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-linear-to-br from-slate-100 via-white to-sky-100 px-4 py-12 font-sans text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, oklch(0.85 0.08 250 / 0.35) 0%, transparent 45%), radial-gradient(circle at 80% 70%, oklch(0.9 0.06 200 / 0.4) 0%, transparent 50%)',
        }}
      />

      <main className="relative z-10 w-full max-w-[420px]">
        <div className="rounded-2xl border border-border/80 bg-card/95 p-8 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5">
              <Image
                src="/ftc_logo.png"
                alt="FinTech Club"
                width={80}
                height={80}
                className="h-auto w-full object-contain"
                priority
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
              FinRecruit
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-blue-700/90 dark:text-blue-400">
              FinTech Club
            </p>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 text-[15px] font-semibold text-foreground shadow-sm transition hover:bg-zinc-50 hover:shadow-md active:scale-[0.99] dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <GoogleMark className="h-5 w-5 shrink-0" />
              <span>Continue with Google</span>
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

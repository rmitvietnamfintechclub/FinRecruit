'use client';

import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDashboardTheme } from '@/hooks/use-dashboard-theme';
import { getHomePathForRole } from '@/lib/role-routes';

function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans text-muted-foreground">
      <p className="text-sm font-medium">Loading…</p>
    </div>
  );
}

const FEATURES = [
  'Executive overview & system config',
  'Department head candidate review',
  'Cohort tracking by generation',
] as const;

export default function LoginPage() {
  const themeReady = useDashboardTheme();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) return;
    router.replace(getHomePathForRole(session.user.role ?? null));
  }, [session, status, router]);

  if (!themeReady || status === 'loading' || session?.user) {
    return <LoginLoading />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground transition-colors duration-300">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm ring-1 ring-foreground/10 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/ftc_logo.png"
              alt="Fintech Club logo"
              width={112}
              height={112}
              priority
              className="h-auto w-24 rounded-md shadow-sm sm:w-28"
            />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-blue-600/90 dark:text-blue-400/90">
              Fintech Club
            </p>
            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-blue-900 dark:text-blue-400 sm:text-[2rem]">
              Fin<span className="text-blue-600 dark:text-blue-400">Recruit</span>
            </h1>
          </div>

          <p className="mx-auto mt-5 max-w-md text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            The official recruitment platform for{' '}
            <span className="font-semibold text-foreground">Fintech Club</span>.
            Manage applications, review candidates, and run each recruitment
            cycle from one secure dashboard.
          </p>

          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center">
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <svg
                className="h-6 w-6 shrink-0 rounded-full bg-white p-0.5"
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
              Continue with Google
            </button>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Sign in to continue
            </p>
          </div>

          <div
            className="mx-auto my-8 h-px w-full max-w-xs bg-border"
            aria-hidden
          />

          <ul className="mx-auto max-w-sm space-y-2.5">
            {FEATURES.map((text) => (
              <li
                key={text}
                className="flex items-center justify-center gap-2.5 text-xs text-muted-foreground"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  <i className="fa-solid fa-check text-[9px]" aria-hidden />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            Authorized members only. Role assigned after sign-in.
          </p>
        </div>
      </main>
    </div>
  );
}

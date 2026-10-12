'use client';

import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDashboardTheme } from '@/hooks/use-dashboard-theme';
import { getHomePathForRole } from '@/lib/role-routes';

function LoginLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Modern Sleek Spinner */}
        <div className="relative size-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#DCB968]/20 dark:border-[#DCB968]/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-r-[#DCB968] border-t-[#DCB968]" />
        </div>

        {/* Pulsing Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="animate-pulse text-xs font-bold uppercase tracking-[0.25em] text-[#0D1742]/70 dark:text-[#EBEBEB]/70">
            Loading Authentication...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const themeReady = useDashboardTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) return;
    router.replace(getHomePathForRole(session.user.role ?? null));
  }, [session, status, router]);

  const handleSignIn = () => {
    setIsLoggingIn(true);
    signIn('google', {
      callbackUrl: '/',
      authorizationParams: { prompt: 'select_account' },
    });
  };

  const isInitializing = !themeReady || status === 'loading';

  if (isInitializing || session?.user) {
    return <LoginLoading />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Decorative Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-[#DCB968] opacity-10 mix-blend-multiply blur-[100px] dark:mix-blend-screen" />
        <div className="absolute -right-[10%] top-[60%] h-[60%] w-[40%] rounded-full bg-[#2C305F] opacity-10 mix-blend-multiply blur-[120px] dark:opacity-30 dark:mix-blend-screen" />
      </div>

      <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-105">
          {/* Brand Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-[#DCB968] opacity-30 blur-lg dark:opacity-20" />
              <Image
                src="/ftc_logo.png"
                alt="RMIT Vietnam FinTech Club"
                width={96}
                height={96}
                priority
                className="relative h-24 w-24 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:ring-white/10"
              />
            </div>

            <h1 className="text-4xl font-black tracking-tight text-[#0D1742] dark:text-[#EBEBEB]">
              Fin<span className="text-[#DCB968]">Recruit</span>
            </h1>
          </div>

          {/* Login Card */}
          <div className="relative overflow-hidden rounded-3xl border border-[#2C305F]/10 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-white/5 dark:bg-[#2C305F]/40 sm:p-10">
            {/* Card Top Accent */}
            <div className="absolute left-0 top-0 h-1.5 w-full bg-linear-to-r from-[#DCB968] to-[#A28436]" />

            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold text-[#0D1742] dark:text-white">
                Welcome to FinRecruit!
              </h2>
              <p className="mt-2 text-sm text-[#2C305F] dark:text-[#EBEBEB]/70">
                Sign in with your RMIT student email to access the recruitment
                workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#0D1742] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D1742] focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-70 dark:bg-[#DCB968] dark:text-[#0D1742] dark:hover:bg-[#F7D27F] dark:focus-visible:ring-[#DCB968]"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-black/5" />

              {isLoggingIn ? (
                <i className="fa-solid fa-spinner fa-spin text-white dark:text-[#0D1742]" />
              ) : (
                <>
                  <svg
                    className="h-5 w-5 shrink-0 rounded-full bg-white p-0.5 shadow-sm"
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
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

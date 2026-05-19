import { getServerSession } from 'next-auth';
import { Clock, Mail, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const STEPS = [
  {
    icon: Mail,
    title: 'Account registered',
    description:
      'Your Google sign-in was saved. No further action is required on your side.',
  },
  {
    icon: ShieldCheck,
    title: 'Executive review',
    description:
      'The Executive Board will verify your membership and assign a department role.',
  },
  {
    icon: Clock,
    title: 'Access granted',
    description:
      'After approval, sign in again to open your Head Dashboard or assigned workspace.',
  },
] as const;

export default async function WaitingRoomPage() {
  const session = await getServerSession(buildAuthOptions());

  if (!session?.user) {
    redirect('/loginPage');
  }

  const displayName =
    session.user.name?.trim() ||
    session.user.email?.split('@')[0] ||
    'Guest';

  const userInitial =
    (session.user.name && session.user.name.trim()[0]?.toUpperCase()) ||
    session.user.email?.[0]?.toUpperCase() ||
    '?';

  const email = session.user.email ?? '';

  return (
    <DashboardAppShell
      title="FinRecruit"
      badgeLabel="Waiting Room"
      badgeVariant="yellow"
      userName={displayName}
      userInitial={userInitial}
      userSubtitle="Guest — pending approval"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-6 sm:py-12">
        <Card className="w-full max-w-lg shadow-sm ring-1 ring-foreground/10">
          <CardHeader className="border-b border-border pb-6 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
              <Clock
                className="size-7 text-blue-600 dark:text-blue-400"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <CardTitle className="text-balance text-xl font-black text-blue-900 dark:text-blue-400">
              Access request in progress
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-sm text-balance text-sm">
              Hello,{' '}
              <span className="font-semibold text-foreground">{displayName}</span>.
              Your account has been registered. Please wait for the Executive
              Board to verify your membership and assign a department role.
            </CardDescription>
            {email ? (
              <p className="mt-3 truncate text-xs text-muted-foreground">
                {email}
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-3 pt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              What happens next
            </p>
            <ul className="space-y-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400"
                          aria-hidden
                        />
                        <p className="text-sm font-bold text-foreground">
                          {step.title}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="rounded-xl border border-yellow-200 bg-yellow-100/80 px-3 py-2.5 text-center text-xs font-medium text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/25 dark:text-yellow-500">
              You will stay on this page until an Executive assigns your role.
              Use <span className="font-bold">Sign out</span> in the header if
              you need to switch accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardAppShell>
  );
}

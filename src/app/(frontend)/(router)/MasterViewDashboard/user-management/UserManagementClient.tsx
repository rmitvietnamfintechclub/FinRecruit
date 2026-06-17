'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import * as React from 'react';
import {
  UserManagementDataTable,
  type ConfirmRequest,
  type PatchPayload,
} from '@/components/user-management/UserManagementDataTable';
import { AppNotice, type AppNoticeVariant } from '@/components/feedback/AppNotice';
import { ConfirmModal } from '@/components/feedback/ConfirmModal';
import { Button } from '@/components/ui/button';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  SerializedManagementUser,
  UserManagementPayload,
} from '@/lib/user-management/mock-store';

type Props = {
  initialPayload: UserManagementPayload;
  /** The id of the signed-in admin viewing this page. Used to detect when an
   * admin demotes / deactivates themselves so we can warn and force re-login. */
  currentUserId: string;
};

type Notice = { variant: AppNoticeVariant; title?: string; text: string };

type ConfirmState =
  | (ConfirmRequest & { busy: boolean })
  | null;

function matchesQuery(user: SerializedManagementUser, query: string) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    user.email.toLowerCase().includes(q) ||
    (user.name?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Small avatar tile for list rows. Renders the OAuth profile picture when
 * available and falls back to a name/email-derived initial in a colored
 * circle, mirroring the look used inside the data tables.
 */
function UserAvatar({ user }: { user: SerializedManagementUser }) {
  const [broken, setBroken] = React.useState(false);
  const initial = (
    user.name?.trim()?.[0] ??
    user.email?.[0] ??
    '?'
  ).toUpperCase();
  if (user.avatar && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic OAuth URLs (Google CDN) not in next.config images domains
      <img
        src={user.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-muted-foreground">
      {initial}
    </div>
  );
}

export function UserManagementClient({
  initialPayload,
  currentUserId,
}: Props) {
  const [payload, setPayload] =
    React.useState<UserManagementPayload>(initialPayload);
  const [waitingQuery, setWaitingQuery] = React.useState<string>('');
  const [inactiveQuery, setInactiveQuery] = React.useState<string>('');
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(
    null
  );
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<ConfirmState>(null);
  // Set when the admin's own role/status was just rewritten in a way that
  // strips Executive Board access. Locks the UI behind a sign-out modal and
  // redirects to /loginPage shortly after so the next session reflects the new
  // role.
  const [signOutPending, setSignOutPending] = React.useState(false);

  const activeExecutives = React.useMemo(
    () =>
      payload.users.filter(
        (u) => u.role === 'Executive Board' && u.isActive
      ),
    [payload.users]
  );
  const activeHeads = React.useMemo(
    () =>
      payload.users.filter(
        (u) => u.role === 'Department Head' && u.isActive
      ),
    [payload.users]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = (await res.json()) as UserManagementPayload & {
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(
          (json as { message?: string }).message ?? `Error ${res.status}`
        );
      }
      setPayload(json);
    } catch (e) {
      setNotice({
        variant: 'error',
        title: 'Failed to load data',
        text: e instanceof Error ? e.message : 'Unknown error.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Single-row patch. Returns whether the call succeeded so callers (eg. bulk
   * actions) can aggregate results without reading state.
   */
  const patchUser = React.useCallback(
    async (
      patch: PatchPayload,
      opts: { silent?: boolean } = {}
    ): Promise<{ ok: boolean; message?: string }> => {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      let json: { success?: boolean; message?: string } = {};
      try {
        json = (await res.json()) as { success?: boolean; message?: string };
      } catch {
        // ignore
      }
      if (!res.ok || !json.success) {
        const message = json.message ?? `Update failed (${res.status})`;
        // Always surface in the browser console so QA/devtools logs catch it
        // even when the caller suppresses the toast (bulk actions etc).
        console.warn('[user-management] patch rejected', {
          status: res.status,
          patch,
          message,
        });
        if (!opts.silent) {
          setNotice({
            variant: 'error',
            title: 'Update rejected',
            text: message,
          });
        }
        return { ok: false, message };
      }
      return { ok: true };
    },
    []
  );

  /**
   * Returns a non-empty reason string when applying `patch` would strip the
   * signed-in admin of Executive Board access (role demote or deactivate).
   * Returns null otherwise.
   */
  const describeSelfLock = React.useCallback(
    (patch: PatchPayload): string | null => {
      if (patch.userId !== currentUserId) return null;
      const me = payload.users.find((u) => u.id === currentUserId);
      if (!me) return null;
      const nextRole = patch.role ?? me.role;
      const nextActive = patch.isActive ?? me.isActive;
      const losesAdmin = nextRole !== 'Executive Board';
      const becomesInactive = nextActive === false;
      if (!losesAdmin && !becomesInactive) return null;
      if (becomesInactive) {
        return "You're about to deactivate your own admin account. You won't be able to sign back in until another Executive Board member reactivates you.";
      }
      return `You're about to demote your own account to ${nextRole}. You'll lose admin access immediately.`;
    },
    [currentUserId, payload.users]
  );

  const requestConfirm = React.useCallback((req: ConfirmRequest) => {
    setConfirmState({ ...req, busy: false });
  }, []);

  const finishSelfLockingPatch = React.useCallback(() => {
    setSignOutPending(true);
    setNotice({
      variant: 'warning',
      title: 'Access updated — signing you out',
      text:
        'Your role has changed. Sign in again so the app can pick up your new permissions.',
    });
    // Tiny delay so the notice paints before next-auth navigates away.
    window.setTimeout(() => {
      void signOut({ callbackUrl: '/loginPage' });
    }, 1200);
  }, []);

  const onPatch = React.useCallback(
    async (patch: PatchPayload) => {
      const lockReason = describeSelfLock(patch);

      const runPatch = async () => {
        setPendingUserId(patch.userId);
        setNotice(null);
        try {
          const result = await patchUser(patch);
          if (result.ok) {
            if (lockReason) {
              finishSelfLockingPatch();
            } else {
              await load();
            }
          }
        } finally {
          setPendingUserId(null);
        }
      };

      if (lockReason) {
        requestConfirm({
          title: 'Confirm change to your own account',
          description: `${lockReason} You'll be signed out automatically — sign in again to continue with the new role.`,
          confirmLabel: 'Sign me out',
          variant: 'destructive',
          onConfirm: runPatch,
        });
        return;
      }

      await runPatch();
    },
    [describeSelfLock, finishSelfLockingPatch, load, patchUser, requestConfirm]
  );

  const onBulkInactive = React.useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) return;

      const includesSelf = userIds.includes(currentUserId);

      const runBulk = async () => {
        setNotice(null);
        let success = 0;
        let selfDeactivated = false;
        const failures: { id: string; message: string }[] = [];
        // Always process the admin's own account last so the success notice
        // for the rest of the batch can render before the sign-out kicks in.
        const ordered = includesSelf
          ? [
              ...userIds.filter((id) => id !== currentUserId),
              currentUserId,
            ]
          : userIds;
        for (const id of ordered) {
          setPendingUserId(id);
          const result = await patchUser(
            { userId: id, isActive: false },
            { silent: true }
          );
          if (result.ok) {
            success += 1;
            if (id === currentUserId) selfDeactivated = true;
          } else {
            failures.push({
              id,
              message: result.message ?? 'Unknown error',
            });
          }
        }
        setPendingUserId(null);

        if (selfDeactivated) {
          // Skip a normal load(): we're about to sign out.
          finishSelfLockingPatch();
          return;
        }

        await load();

        if (failures.length === 0) {
          setNotice({
            variant: 'success',
            title: 'Bulk deactivate complete',
            text: `Deactivated ${success} account${success === 1 ? '' : 's'}.`,
          });
        } else if (success === 0) {
          setNotice({
            variant: 'error',
            title: 'Bulk deactivate failed',
            text: failures.map((f) => `${f.id}: ${f.message}`).join(' · '),
          });
        } else {
          setNotice({
            variant: 'warning',
            title: `Bulk deactivate finished with ${failures.length} error${failures.length === 1 ? '' : 's'}`,
            text: `${success} succeeded · ${failures.length} failed (${failures
              .map((f) => f.message)
              .join('; ')})`,
          });
        }
      };

      if (includesSelf) {
        requestConfirm({
          title: 'Your account is in this batch',
          description:
            "This bulk deactivate includes your own admin account. After it finishes you'll be signed out and won't be able to sign back in until another Executive Board member reactivates you.",
          confirmLabel: 'Continue & sign out',
          variant: 'destructive',
          onConfirm: runBulk,
        });
        return;
      }

      await runBulk();
    },
    [
      currentUserId,
      finishSelfLockingPatch,
      load,
      patchUser,
      requestConfirm,
    ]
  );

  const closeConfirm = React.useCallback(() => {
    setConfirmState((s) => (s && s.busy ? s : null));
  }, []);

  const runConfirm = React.useCallback(async () => {
    setConfirmState((s) => (s ? { ...s, busy: true } : s));
    try {
      const current = confirmState;
      if (current) {
        await current.onConfirm();
      }
    } finally {
      setConfirmState(null);
    }
  }, [confirmState]);

  const filteredWaitingGuests = React.useMemo(
    () => payload.waitingGuests.filter((g) => matchesQuery(g, waitingQuery)),
    [payload.waitingGuests, waitingQuery]
  );

  const filteredInactiveAccounts = React.useMemo(
    () =>
      payload.inactiveAccounts.filter((u) => matchesQuery(u, inactiveQuery)),
    [payload.inactiveAccounts, inactiveQuery]
  );

  return (
    <div className="relative space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/MasterViewDashboard"
            className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <i className="fa-solid fa-arrow-left mr-2" aria-hidden />
            MasterView
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-bold text-foreground">User management</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          disabled={loading || signOutPending}
        >
          <i className="fa-solid fa-rotate mr-2" aria-hidden />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {notice ? (
        <AppNotice
          variant={notice.variant}
          title={notice.title}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AppNotice>
      ) : null}

      <section className="bg-card border-border rounded-2xl border p-4 shadow-sm transition-transform hover:-translate-y-0.5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-2xl text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400">
              <i className="fa-solid fa-hourglass-half" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-700/90 dark:text-yellow-500/90">
                Waiting Room
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Guests awaiting role assignment
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Every active Guest account, regardless of cohort.
              </p>
            </div>
          </div>
          <input
            type="search"
            value={waitingQuery}
            onChange={(e) => setWaitingQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 sm:max-w-xs"
          />
        </div>

        {payload.waitingGuests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No guests are currently waiting.
          </p>
        ) : filteredWaitingGuests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No guests match your search.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {filteredWaitingGuests.map((g) => (
              <li
                key={g.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={g} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {g.name?.trim() || g.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.email}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={pendingUserId === g.id}
                      >
                        Grant Head role
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {HEAD_DEPARTMENTS.map((d) => (
                        <DropdownMenuItem
                          key={d}
                          onClick={() =>
                            onPatch({
                              userId: g.id,
                              role: 'Department Head',
                              department: d,
                            })
                          }
                        >
                          {d}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={pendingUserId === g.id}
                    onClick={() =>
                      onPatch({
                        userId: g.id,
                        role: 'Executive Board',
                      })
                    }
                  >
                    Grant Executive Board
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingUserId === g.id}
                    onClick={() =>
                      requestConfirm({
                        title: `Decline ${g.email}?`,
                        description:
                          'This deactivates the account; you can reactivate it later from the Inactive accounts section.',
                        confirmLabel: 'Decline',
                        variant: 'destructive',
                        onConfirm: () =>
                          onPatch({
                            userId: g.id,
                            role: 'Guest',
                            department: 'Unassigned',
                            isActive: false,
                          }),
                      })
                    }
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card border-border space-y-4 rounded-2xl border p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-2xl text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
              <i className="fa-solid fa-shield-halved" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700/90 dark:text-violet-400/90">
                Executive Board · Admin
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Active Executive Board
                <span className="ml-2 text-sm font-semibold text-muted-foreground">
                  ({activeExecutives.length})
                </span>
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Full admin access. The system requires at least one to remain
                active.
              </p>
            </div>
          </div>

          <UserManagementDataTable
            data={activeExecutives}
            soleActiveExecutiveId={payload.soleActiveExecutiveId}
            onPatch={onPatch}
            pendingUserId={pendingUserId}
            requestConfirm={requestConfirm}
            onBulkInactive={onBulkInactive}
            bulkScopeLabel="Executive Board"
          />
        </section>

        <section className="bg-card border-border space-y-4 rounded-2xl border p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <i className="fa-solid fa-people-group" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700/90 dark:text-emerald-400/90">
                Department Heads
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Active Department Heads
                <span className="ml-2 text-sm font-semibold text-muted-foreground">
                  ({activeHeads.length})
                </span>
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Move between departments, promote to Executive Board, or
                deactivate freely.
              </p>
            </div>
          </div>

          <UserManagementDataTable
            data={activeHeads}
            soleActiveExecutiveId={payload.soleActiveExecutiveId}
            onPatch={onPatch}
            pendingUserId={pendingUserId}
            requestConfirm={requestConfirm}
            onBulkInactive={onBulkInactive}
            bulkScopeLabel="Department Heads"
          />
        </section>
      </div>

      <section className="bg-card border-border rounded-2xl border p-4 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-2xl text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
              <i className="fa-solid fa-user-slash" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-700/90 dark:text-zinc-400/90">
                Inactive accounts
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Declined or revoked accounts
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Reactivate to send a Guest back to the Waiting Room, or restore
                a Head / Executive to active duty.
              </p>
            </div>
          </div>
          <input
            type="search"
            value={inactiveQuery}
            onChange={(e) => setInactiveQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 sm:max-w-xs"
          />
        </div>

        {payload.inactiveAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inactive accounts.
          </p>
        ) : filteredInactiveAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inactive accounts match your search.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {filteredInactiveAccounts.map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={u} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {u.name?.trim() || u.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Previously:{' '}
                      <span className="font-semibold">{u.role}</span>
                      {' · '}
                      {u.department}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={pendingUserId === u.id}
                    onClick={() =>
                      onPatch({ userId: u.id, isActive: true })
                    }
                  >
                    Reactivate
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant}
        busy={confirmState?.busy ?? false}
        onConfirm={() => void runConfirm()}
        onCancel={closeConfirm}
      />

      {signOutPending ? (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="bg-card border-border max-w-sm rounded-2xl border p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <i className="fa-solid fa-right-from-bracket text-xl" aria-hidden />
            </div>
            <h3 className="text-base font-black tracking-tight text-foreground">
              Signing you out…
            </h3>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Your access has changed. You&apos;ll be redirected to the login
              page.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

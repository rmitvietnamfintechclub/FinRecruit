'use client';

import { signOut } from 'next-auth/react';
import * as React from 'react';
import {
  UserManagementDataTable,
  type ConfirmRequest,
  type PatchPayload,
} from '@/components/user-management/UserManagementDataTable';
import {
  AppNotice,
  type AppNoticeVariant,
} from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  SerializedManagementUser,
  UserManagementPayload,
} from '@/lib/user-management/mock-store';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';
import { cn } from '@/lib/utils';

type Props = {
  initialPayload: UserManagementPayload;
  currentUserId: string;
};

type Notice = { variant: AppNoticeVariant; title?: string; text: string };

type ConfirmState = (ConfirmRequest & { busy: boolean }) | null;

const DEPT_UI: Record<string, { icon: string; text: string; bg: string }> = {
  'Technology Department': {
    icon: 'fa-microchip',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  'Business Department': {
    icon: 'fa-briefcase',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  'HR Department': {
    icon: 'fa-users',
    text: 'text-pink-700',
    bg: 'bg-pink-50',
  },
  'Marketing Department': {
    icon: 'fa-bullhorn',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
};

function matchesQuery(user: SerializedManagementUser, query: string) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  return user.name?.toLowerCase().includes(q) ?? false;
}

// --- COMPONENT AVATAR ---
function UserAvatar({ user }: { user: SerializedManagementUser }) {
  const [broken, setBroken] = React.useState(false);
  const initial = (
    user.name?.trim()?.[0] ??
    user.email?.[0] ??
    '?'
  ).toUpperCase();

  if (user.avatar && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-10 shrink-0 rounded-full border border-gray-200 object-cover shadow-sm"
      />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#0D1742]/20 bg-[#F0EDFF] text-sm font-black text-[#2C305F] shadow-sm">
      {initial}
    </div>
  );
}

export function UserManagementClient({ initialPayload, currentUserId }: Props) {
  const [payload, setPayload] =
    React.useState<UserManagementPayload>(initialPayload);
  const [waitingQuery, setWaitingQuery] = React.useState<string>('');
  const [inactiveQuery, setInactiveQuery] = React.useState<string>('');
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [isPolling, setIsPolling] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<ConfirmState>(null);

  const [signOutPending, setSignOutPending] = React.useState(false);

  // Phân loại danh sách
  const activeExecutives = React.useMemo(
    () =>
      payload.users.filter((u) => u.role === 'Executive Board' && u.isActive),
    [payload.users]
  );

  const activeHeads = React.useMemo(
    () =>
      payload.users.filter((u) => u.role === 'Department Head' && u.isActive),
    [payload.users]
  );

  // Bóc tách Members theo từng phòng ban
  const membersByDept = React.useMemo(() => {
    const grouped: Record<string, SerializedManagementUser[]> = {
      'Technology Department': [],
      'Business Department': [],
      'HR Department': [],
      'Marketing Department': [],
    };
    payload.users.forEach((u) => {
      if (u.role === 'Member' && u.isActive && grouped[u.department]) {
        grouped[u.department].push(u);
      }
    });
    return grouped;
  }, [payload.users]);

  const load = React.useCallback(async (isSilentPoll = false) => {
    if (!isSilentPoll) setLoading(true);
    else setIsPolling(true);

    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? `Error ${res.status}`);
      }
      setPayload(json);
    } catch (e) {
      if (!isSilentPoll) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error.';

        if (
          errorMessage.toLowerCase().includes('authentication required') ||
          errorMessage.includes('401')
        ) {
          setSignOutPending(true);
          setTimeout(() => {
            void signOut({ callbackUrl: '/loginPage' });
          }, 1500);
          return;
        }

        setNotice({
          variant: 'error',
          title: 'Unable to Load Data',
          text: errorMessage,
        });
      }
    } finally {
      if (!isSilentPoll) setLoading(false);
      else setIsPolling(false);
    }
  }, []);

  useIntervalWhenVisible(() => void load(true), {
    enabled:
      !loading &&
      !isPolling &&
      pendingUserId === null &&
      confirmState === null &&
      !signOutPending,
  });

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
        json = await res.json();
      } catch {}

      if (!res.ok || !json.success) {
        const message = json.message ?? `Update failed (${res.status})`;

        if (
          message.toLowerCase().includes('authentication required') ||
          message.includes('401')
        ) {
          setSignOutPending(true);
          setTimeout(() => void signOut({ callbackUrl: '/loginPage' }), 1500);
          return { ok: false, message };
        }

        if (!opts.silent) {
          setNotice({
            variant: 'error',
            title: 'Update Failed',
            text: message,
          });
        }
        return { ok: false, message };
      }
      return { ok: true };
    },
    []
  );

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
    setTimeout(() => {
      void signOut({ callbackUrl: '/loginPage' });
    }, 1500);
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
              setNotice({
                variant: 'success',
                title: 'Access Updated',
                text: 'User permissions have been successfully modified.',
              });
              setTimeout(() => setNotice(null), 3000);
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

        const ordered = includesSelf
          ? [...userIds.filter((id) => id !== currentUserId), currentUserId]
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
          finishSelfLockingPatch();
          return;
        }

        await load();

        if (failures.length === 0) {
          setNotice({
            variant: 'success',
            title: 'Accounts Deactivated',
            text: `Successfully revoked access for ${success} user${success === 1 ? '' : 's'}.`,
          });
        } else if (success === 0) {
          setNotice({
            variant: 'error',
            title: 'Action Failed',
            text: `Unable to deactivate the selected account${failures.length === 1 ? '' : 's'}. Please try again.`,
          });
        } else {
          setNotice({
            variant: 'warning',
            title: 'Partial Completion',
            text: `${success} revoked successfully, but failed on ${failures.length} other${failures.length === 1 ? '' : 's'}.`,
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
    [currentUserId, finishSelfLockingPatch, load, patchUser, requestConfirm]
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
    <div className="relative space-y-10 animate-in fade-in duration-500 mt-4">
      {notice && (
        <AppNotice
          variant={notice.variant}
          title={notice.title}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AppNotice>
      )}

      {/* SECTION 1: WAITING ROOM */}
      <section>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFEFCA] text-xl text-[#A28436] shadow-sm">
              <i className="fa-solid fa-hourglass-half" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#0D1742]">
                Waiting Room
              </h2>
              <p className="text-sm font-medium text-[#5E5E92]">
                Guests awaiting role assignment
              </p>
            </div>
          </div>
          <div className="relative w-full shrink-0 lg:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={waitingQuery}
              onChange={(e) => setWaitingQuery(e.target.value)}
              placeholder="Search by name..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-[#0D1742] shadow-sm transition-colors focus:border-[#0D1742] focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
            />
          </div>
        </div>

        {loading && !isPolling ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-400">
              Loading guests...
            </p>
          </div>
        ) : payload.waitingGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-16 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <i className="fa-solid fa-inbox text-xl" />
            </div>
            <p className="text-base font-bold text-[#0D1742]">
              The waiting room is empty
            </p>
            <p className="text-sm text-[#5E5E92] mt-1">
              When users register, they will appear here.
            </p>
          </div>
        ) : filteredWaitingGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-16 text-center">
            <p className="text-sm font-bold text-gray-500">
              No guests match your search.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {filteredWaitingGuests.map((g) => {
                const targetName = g.name?.trim() || g.email.split('@')[0];
                return (
                  <li
                    key={g.id}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <UserAvatar user={g} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-[#0D1742]">
                          {targetName}
                        </p>
                        <p className="truncate text-[13px] font-medium text-[#5E5E92]">
                          {g.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="size-8 rounded-lg p-0 hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                            disabled={pendingUserId === g.id}
                          >
                            {pendingUserId === g.id ? (
                              <i className="fa-solid fa-spinner fa-spin text-sm" />
                            ) : (
                              <i className="fa-solid fa-ellipsis text-sm" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-60 rounded-xl border-gray-200 shadow-lg p-1.5"
                        >
                          <DropdownMenuLabel className="text-xs font-bold text-[#5E5E92] uppercase tracking-wider px-2">
                            Assign Role
                          </DropdownMenuLabel>

                          {/* SUBMENU: ASSIGN DEPARTMENT HEAD */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="font-semibold text-sm py-2 cursor-pointer rounded-lg text-[#0D1742]">
                              <i className="fa-solid fa-user-tie w-4 text-center mr-2 text-gray-400" />
                              Department Head
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="rounded-xl shadow-lg border-gray-200 p-1.5">
                              {HEAD_DEPARTMENTS.map((d) => (
                                <DropdownMenuItem
                                  key={d}
                                  className="font-semibold text-sm py-2 cursor-pointer focus:bg-gray-50 rounded-lg text-[#0D1742]"
                                  onClick={() =>
                                    requestConfirm({
                                      title: `Assign Department Head Role?`,
                                      description: (
                                        <span className="mt-2 flex flex-col gap-4">
                                          <span className="block text-sm text-[#5E5E92]">
                                            Grant{' '}
                                            <strong className="text-[#0D1742]">
                                              {targetName}
                                            </strong>{' '}
                                            as the Head of{' '}
                                            <strong className={DEPT_UI[d].text}>
                                              {d}
                                            </strong>
                                            . They will have full access to
                                            view, evaluate, and export
                                            candidates in this department.
                                          </span>
                                        </span>
                                      ),
                                      confirmLabel: 'Assign Role',
                                      variant: 'default',
                                      onConfirm: () =>
                                        onPatch({
                                          userId: g.id,
                                          role: 'Department Head',
                                          department: d,
                                          isActive: true,
                                        }),
                                    })
                                  }
                                >
                                  <i
                                    className={`fa-solid ${DEPT_UI[d].icon} w-4 text-center mr-2 ${DEPT_UI[d].text}`}
                                  />
                                  {d}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          {/* SUBMENU: ASSIGN MEMBER */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="font-semibold text-sm py-2 cursor-pointer rounded-lg text-[#0D1742]">
                              <i className="fa-solid fa-user w-4 text-center mr-2 text-gray-400" />
                              Member
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="rounded-xl shadow-lg border-gray-200 p-1.5">
                              {HEAD_DEPARTMENTS.map((d) => (
                                <DropdownMenuItem
                                  key={d}
                                  className="font-semibold text-sm py-2 cursor-pointer focus:bg-gray-50 rounded-lg text-[#0D1742]"
                                  onClick={() =>
                                    requestConfirm({
                                      title: `Assign Member Role?`,
                                      description: (
                                        <span className="mt-2 flex flex-col gap-4">
                                          <span className="block text-sm text-[#5E5E92]">
                                            Grant{' '}
                                            <strong className="text-[#0D1742]">
                                              {targetName}
                                            </strong>{' '}
                                            as the Member of{' '}
                                            <strong className={DEPT_UI[d].text}>
                                              {d}
                                            </strong>
                                            . They will have standard access to
                                            operations within this department.
                                          </span>
                                        </span>
                                      ),
                                      confirmLabel: 'Assign Role',
                                      variant: 'default',
                                      onConfirm: () =>
                                        onPatch({
                                          userId: g.id,
                                          role: 'Member',
                                          department: d,
                                          isActive: true,
                                        }),
                                    })
                                  }
                                >
                                  <i
                                    className={`fa-solid ${DEPT_UI[d].icon} w-4 text-center mr-2 ${DEPT_UI[d].text}`}
                                  />
                                  {d}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuItem
                            className="font-semibold text-sm py-2 cursor-pointer focus:bg-[#F0EDFF] focus:text-[#2C305F] text-[#2C305F] rounded-lg"
                            onClick={() =>
                              requestConfirm({
                                title: 'Assign Executive Board Role?',
                                description: (
                                  <span className="mt-2 flex flex-col gap-4">
                                    <span className="block text-sm text-[#5E5E92]">
                                      Promote{' '}
                                      <strong className="text-[#0D1742]">
                                        {targetName}
                                      </strong>{' '}
                                      to the{' '}
                                      <strong className="text-[#2C305F]">
                                        Executive Board
                                      </strong>
                                      . This grants them supreme administrative
                                      privileges across all departments.
                                    </span>
                                  </span>
                                ),
                                confirmLabel: 'Assign Role',
                                variant: 'default',
                                onConfirm: () =>
                                  onPatch({
                                    userId: g.id,
                                    role: 'Executive Board',
                                    department: 'Unassigned',
                                    isActive: true,
                                  }),
                              })
                            }
                          >
                            <i className="fa-solid fa-shield-halved w-4 text-center mr-2" />
                            Executive Board
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-gray-100 my-1" />
                          <DropdownMenuItem
                            className="font-semibold text-sm py-2 cursor-pointer focus:bg-[#BB2649]/10 focus:text-[#BB2649] rounded-lg text-[#BB2649]"
                            onClick={() =>
                              requestConfirm({
                                title: `Deactivate Account?`,
                                description: (
                                  <span className="mt-2 flex flex-col gap-3">
                                    <span className="block text-sm text-[#5E5E92]">
                                      Deactivate the account for{' '}
                                      <strong className="text-[#0D1742]">
                                        {targetName}
                                      </strong>
                                      . They will be removed from the Waiting
                                      Room and lose access completely. You can
                                      restore this account later from the
                                      Inactive section.
                                    </span>
                                  </span>
                                ),
                                confirmLabel: 'Deactivate',
                                variant: 'destructive',
                                onConfirm: () =>
                                  onPatch({
                                    userId: g.id,
                                    isActive: false,
                                  }),
                              })
                            }
                          >
                            <i className="fa-solid fa-ban w-4 text-center mr-2" />
                            Deactivate Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* SECTION 2: ADMIN PANELS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm sm:p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0EDFF] text-xl text-[#2C305F]">
              <i className="fa-solid fa-shield-halved" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#5E5E92] mb-1">
                System Admin
              </p>
              <h2 className="text-lg font-black tracking-tight text-[#0D1742] flex items-center">
                Executive Board
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-600">
                  {activeExecutives.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex-1">
            <UserManagementDataTable
              data={activeExecutives}
              soleActiveExecutiveId={payload.soleActiveExecutiveId}
              onPatch={onPatch}
              pendingUserId={pendingUserId}
              requestConfirm={requestConfirm}
              onBulkInactive={onBulkInactive}
              bulkScopeLabel="Executive Board"
              hiddenColumns={['department']}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm sm:p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
              <i className="fa-solid fa-user-tie" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600/80 mb-1">
                Division Admin
              </p>
              <h2 className="text-lg font-black tracking-tight text-[#0D1742] flex items-center">
                Department Head
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-600">
                  {activeHeads.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex-1">
            <UserManagementDataTable
              data={activeHeads}
              soleActiveExecutiveId={payload.soleActiveExecutiveId}
              onPatch={onPatch}
              pendingUserId={pendingUserId}
              requestConfirm={requestConfirm}
              onBulkInactive={onBulkInactive}
              bulkScopeLabel="Department Heads"
              hiddenColumns={['role']}
            />
          </div>
        </section>
      </div>

      {/* SECTION 3: DEPARTMENT MEMBERS (CHIA 4 CỘT LƯỚI) */}
      <section>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
            <i className="fa-solid fa-users" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600/80 mb-1">
              Standard Access
            </p>
            <h2 className="text-lg font-black tracking-tight text-[#0D1742]">
              Department Members
            </h2>
          </div>
        </div>

        {/* Lưới CSS Grid cho 4 phòng ban */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {HEAD_DEPARTMENTS.map((dept) => {
            const deptMembers = membersByDept[dept];
            const deptUI = DEPT_UI[dept];

            return (
              <div
                key={dept}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg text-lg',
                        deptUI.bg,
                        deptUI.text
                      )}
                    >
                      <i className={`fa-solid ${deptUI.icon}`} />
                    </div>
                    <h3 className="text-base font-bold text-[#0D1742]">
                      {dept.replace(' Department', '')}
                    </h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-600">
                    {deptMembers.length}
                  </span>
                </div>

                <div className="flex-1">
                  <UserManagementDataTable
                    data={deptMembers}
                    soleActiveExecutiveId={payload.soleActiveExecutiveId}
                    onPatch={onPatch}
                    pendingUserId={pendingUserId}
                    requestConfirm={requestConfirm}
                    onBulkInactive={onBulkInactive}
                    bulkScopeLabel={`${dept.replace(' Department', '')} Members`}
                    hiddenColumns={['role', 'department']} // Đã chia bảng theo ban nên ẩn luôn 2 cột này
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: INACTIVE */}
      <section>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl text-gray-500 shadow-sm">
              <i className="fa-solid fa-user-slash" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#0D1742]">
                Inactive Accounts
              </h2>
              <p className="text-sm font-medium text-[#5E5E92]">
                Deactivated and revoked user accounts
              </p>
            </div>
          </div>
          <div className="relative w-full shrink-0 lg:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={inactiveQuery}
              onChange={(e) => setInactiveQuery(e.target.value)}
              placeholder="Search by name..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-[#0D1742] shadow-sm transition-colors focus:border-[#0D1742] focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
            />
          </div>
        </div>

        {payload.inactiveAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-12 text-center">
            <p className="text-sm font-bold text-gray-400">
              No inactive accounts to display.
            </p>
          </div>
        ) : filteredInactiveAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-12 text-center">
            <p className="text-sm font-bold text-gray-500">No matches found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {filteredInactiveAccounts.map((u) => {
                const targetName = u.name?.trim() || u.email;
                return (
                  <li
                    key={u.id}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <UserAvatar user={u} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-[#0D1742]">
                          {u.name?.trim() || u.email}
                        </p>
                        <p className="truncate text-[13px] font-medium text-[#5E5E92]">
                          {u.email}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-semibold text-[#5E5E92]">
                            Previous Role:
                          </span>
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                            {u.role}
                          </span>
                          {u.role !== 'Executive Board' &&
                            u.department !== 'Unassigned' && (
                              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">
                                {u.department.replace(' Department', '')}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-9 font-bold text-[#0D1742] hover:text-[#DCB968] hover:bg-[#0D1742] border-gray-200"
                        disabled={pendingUserId === u.id}
                        onClick={() =>
                          requestConfirm({
                            title: `Reactivate Account?`,
                            description: (
                              <span className="mt-2 flex flex-col gap-3">
                                <span className="block text-sm text-[#5E5E92]">
                                  Reactivate{' '}
                                  <strong className="text-[#0D1742]">
                                    {targetName}
                                  </strong>
                                  &apos;s account. This account will be restored
                                  as a{' '}
                                  <strong className="text-[#A28436]">
                                    Guest
                                  </strong>{' '}
                                  and moved to the Waiting Room. You can
                                  reassign their role from there.
                                </span>
                              </span>
                            ),
                            confirmLabel: 'Reactivate',
                            variant: 'default',
                            onConfirm: () =>
                              onPatch({
                                userId: u.id,
                                role: 'Guest',
                                department: 'Unassigned',
                                isActive: true,
                              }),
                          })
                        }
                      >
                        {pendingUserId === u.id ? (
                          <i className="fa-solid fa-spinner fa-spin mr-2" />
                        ) : (
                          <i className="fa-solid fa-rotate-left mr-2" />
                        )}
                        Reactivate
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Global Confirm Dialog */}
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant}
        loading={confirmState?.busy ?? false}
        onCancel={closeConfirm}
        onConfirm={async () => {
          await runConfirm();
        }}
      />

      {/* MÀN HÌNH KHÓA KHI HẾT HẠN SESSION */}
      {signOutPending ? (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-100 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300"
        >
          <div className="bg-white max-w-sm rounded-3xl border border-gray-200 p-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-300">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <i className="fa-solid fa-lock text-2xl" aria-hidden />
            </div>
            <h3 className="text-lg font-black tracking-tight text-[#0D1742]">
              Session Expired
            </h3>
            <p className="mt-2 text-sm font-medium text-[#5E5E92] leading-relaxed">
              For your security, please sign in again to continue.
              Redirecting...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

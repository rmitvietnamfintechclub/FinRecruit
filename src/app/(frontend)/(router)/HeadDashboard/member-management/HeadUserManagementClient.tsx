'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import {
  type AppNoticeVariant,
  AppNotice,
} from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';
import { signOut } from 'next-auth/react';

type SerializedManagementUser = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  role: RoleType;
  department: DepartmentType | 'Unassigned' | string;
  isActive: boolean;
};

type UserManagementPayload = {
  success: boolean;
  waitingGuests: SerializedManagementUser[];
  users: SerializedManagementUser[];
};

type PatchPayload = {
  userId: string;
  role?: RoleType;
  department?: DepartmentType | 'Unassigned';
  isActive?: boolean;
};

type ConfirmState = {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  variant: 'default' | 'destructive';
  action: () => Promise<void>;
} | null;

// --- COMPONENT AVATAR ---
function UserAvatar({ user }: { user: SerializedManagementUser }) {
  const [broken, setBroken] = useState(false);
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
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-[#0D1742]/5 text-sm font-black text-[#0D1742] shadow-sm">
      {initial}
    </div>
  );
}

// --- MAIN COMPONENT ---
export function HeadUserManagementClient({
  department,
}: {
  department: DepartmentType;
}) {
  const [payload, setPayload] = useState<UserManagementPayload>({
    success: true,
    waitingGuests: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const [waitingQuery, setWaitingQuery] = useState('');
  const [memberQuery, setMemberQuery] = useState('');

  const [notice, setNotice] = useState<{
    variant: AppNoticeVariant;
    title?: string;
    text: string;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // State quản lý UI khóa màn hình khi Session hết hạn
  const [signOutPending, setSignOutPending] = useState(false);

  const loadData = useCallback(async (isSilentPoll = false) => {
    if (!isSilentPoll) setLoading(true);
    else setIsPolling(true);

    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || 'Failed to load users');

      setPayload(json);
    } catch (e) {
      if (!isSilentPoll) {
        const errorMessage =
          e instanceof Error ? e.message : 'Unknown error occurred.';

        // --- BẮT LỖI AUTHENTICATION VÀ KHÓA MÀN HÌNH ---
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
        // ---------------------------------------------

        setNotice({
          variant: 'error',
          title: 'Error loading data',
          text: errorMessage,
        });
      }
    } finally {
      if (!isSilentPoll) setLoading(false);
      else setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useIntervalWhenVisible(() => void loadData(true), {
    enabled:
      !loading &&
      pendingUserId === null &&
      confirmState === null &&
      !signOutPending,
  });

  const patchUser = async (
    patch: PatchPayload,
    userName: string,
    actionName: 'granted' | 'revoked'
  ) => {
    setPendingUserId(patch.userId);
    setNotice(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Update failed');
      }

      setNotice({
        variant: 'success',
        text:
          actionName === 'granted'
            ? `Granted Member access to ${userName}.`
            : `Revoked access for ${userName}.`,
      });

      setTimeout(() => setNotice(null), 4000);
      await loadData(false);
    } catch (e) {
      setNotice({
        variant: 'error',
        title: 'Action Failed',
        text: e instanceof Error ? e.message : 'Unknown error.',
      });
    } finally {
      setPendingUserId(null);
      setConfirmState(null);
    }
  };

  const handleGrantMember = (user: SerializedManagementUser) => {
    const displayName = user.name || user.email.split('@')[0];
    setConfirmState({
      title: 'Grant Access?',
      description: (
        <>
          Assign the Member role to{' '}
          <span className="font-bold text-gray-900">{displayName}</span>? They
          will gain immediate access to the{' '}
          <span className="font-bold text-[#0D1742]">{department}</span>{' '}
          dashboard.
        </>
      ),
      confirmLabel: 'Grant Access',
      variant: 'default',
      action: () =>
        patchUser(
          {
            userId: user.id,
            role: 'Member',
            department: department,
            isActive: true,
          },
          displayName,
          'granted'
        ),
    });
  };

  const handleRevokeAccess = (user: SerializedManagementUser) => {
    const displayName = user.name || user.email.split('@')[0];
    setConfirmState({
      title: 'Revoke Access?',
      description: (
        <>
          Demote <span className="font-bold text-gray-900">{displayName}</span>{' '}
          to Guest? They will lose access to the department dashboard and return
          to the Waiting Room.
        </>
      ),
      confirmLabel: 'Revoke Access',
      variant: 'destructive',
      action: () =>
        patchUser(
          {
            userId: user.id,
            role: 'Guest',
            department: 'Unassigned',
            isActive: true,
          },
          displayName,
          'revoked'
        ),
    });
  };

  const filteredWaiting = useMemo(() => {
    if (!waitingQuery) return payload.waitingGuests;
    const query = waitingQuery.toLowerCase();
    return payload.waitingGuests.filter((u) => {
      const searchableName =
        u.name?.toLowerCase() || u.email.split('@')[0].toLowerCase();
      return searchableName.includes(query);
    });
  }, [payload.waitingGuests, waitingQuery]);

  const filteredMembers = useMemo(() => {
    const baseDeptKeyword = department
      .replace(' Department', '')
      .trim()
      .toLowerCase();
    const myMembers = payload.users.filter(
      (u) =>
        u.role === 'Member' &&
        u.isActive &&
        u.department.toLowerCase().includes(baseDeptKeyword)
    );

    if (!memberQuery) return myMembers;
    const query = memberQuery.toLowerCase();
    return myMembers.filter((u) => {
      const searchableName =
        u.name?.toLowerCase() || u.email.split('@')[0].toLowerCase();
      return searchableName.includes(query);
    });
  }, [payload.users, department, memberQuery]);

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
        {/* Floating Header */}
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFEFCA] text-xl text-[#A28436] shadow-sm">
              <i className="fa-solid fa-hourglass-half" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-gray-900">
                Waiting Room
              </h2>
              <p className="text-sm font-medium text-gray-500">
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
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-[#0D1742] focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
            />
          </div>
        </div>

        {/* White Card Content */}
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
            <p className="text-base font-bold text-gray-900">
              The waiting room is empty
            </p>
            <p className="text-sm text-gray-500 mt-1">
              When users register, they will appear here.
            </p>
          </div>
        ) : filteredWaiting.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-16 text-center">
            <p className="text-sm font-bold text-gray-500">
              No guests match your search.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {filteredWaiting.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-gray-900">
                        {user.name?.trim() || user.email.split('@')[0]}
                      </p>
                      <p className="truncate text-[13px] font-medium text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      onClick={() => handleGrantMember(user)}
                      disabled={pendingUserId === user.id}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-5 text-xs font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#0D1742]/90 disabled:opacity-50 sm:w-auto"
                    >
                      {pendingUserId === user.id ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                      ) : (
                        <i className="fa-solid fa-user-plus" />
                      )}
                      Grant Access
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* SECTION 2: ACTIVE MEMBERS */}
      <section>
        {/* Floating Header */}
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600 shadow-sm">
              <i className="fa-solid fa-users" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-gray-900">
                {department}
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-600">
                  {filteredMembers.length}
                </span>
              </h2>
              <p className="text-sm font-medium text-gray-500">
                Active members with dashboard access
              </p>
            </div>
          </div>
          <div className="relative w-full shrink-0 lg:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search by name..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-[#0D1742] focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
            />
          </div>
        </div>

        {/* White Card Content */}
        {loading && !isPolling ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-400">
              Loading roster...
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/50 py-16 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <i className="fa-solid fa-ghost text-xl" />
            </div>
            <p className="text-base font-bold text-gray-900">
              No active members found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Grant access to guests in the waiting room.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <ul className="divide-y divide-gray-100">
              {filteredMembers.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Clean Info: No badges, just name and email */}
                  <div className="flex min-w-0 items-center gap-4">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-gray-900">
                        {user.name?.trim() || user.email.split('@')[0]}
                      </p>
                      <p className="truncate text-[13px] font-medium text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0">
                    <button
                      onClick={() => handleRevokeAccess(user)}
                      disabled={pendingUserId === user.id}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-5 text-xs font-bold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50 sm:w-auto"
                    >
                      {pendingUserId === user.id ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                      ) : (
                        <i className="fa-solid fa-user-minus" />
                      )}
                      Revoke Access
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant}
        loading={!!pendingUserId}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (confirmState) await confirmState.action();
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
            <h3 className="text-lg font-black tracking-tight text-gray-900">
              Session Expired
            </h3>
            <p className="mt-2 text-sm font-medium text-gray-500 leading-relaxed">
              For your security, please sign in again to continue.
              Redirecting...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

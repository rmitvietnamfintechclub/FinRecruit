'use client';

import { useState } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { DirectoryAccount } from '@/types/memberDirectory';
import { useGrantMember, useMemberDirectory } from '@/hooks/use-member-directory';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function AccountRow({ account }: { account: DirectoryAccount }) {
  const initial = (account.name?.trim()?.[0] ?? account.email[0] ?? '?').toUpperCase();
  return (
    <li className="border-border flex items-center gap-3 border-b py-3 last:border-b-0">
      {account.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic OAuth URL
        <img src={account.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-bold">
          {account.name?.trim() || account.email.split('@')[0]}
        </p>
        <p className="text-muted-foreground truncate text-xs">{account.email}</p>
      </div>
      <span className="text-muted-foreground shrink-0 text-xs font-semibold">
        {account.role} · {account.department === 'Unassigned' ? 'Waiting room' : account.department}
      </span>
    </li>
  );
}

export function MemberGrantPanel({ department }: { department: DepartmentType }) {
  const { waitingGuests, members } = useMemberDirectory();
  const { grant, pending } = useGrantMember();
  const [target, setTarget] = useState<DirectoryAccount | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {notice ? (
        <AppNotice variant="info" onDismiss={() => setNotice(null)}>
          {notice}
        </AppNotice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Waiting room</CardTitle>
          <CardDescription>
            Guests awaiting a Member role for {department}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waitingGuests.length === 0 ? (
            <p className="text-muted-foreground text-sm">No guests waiting.</p>
          ) : (
            <ul>
              {waitingGuests.map((account) => (
                <li
                  key={account.id}
                  className="border-border flex items-center gap-3 border-b py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-bold">
                      {account.name?.trim() || account.email.split('@')[0]}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">{account.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTarget(account)}
                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    Grant Member Role
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
          <CardDescription>
            Members with Round 2 Interview Dashboard access for {department}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members granted yet.</p>
          ) : (
            <ul>
              {members.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={target !== null}
        title="Grant Member role?"
        description={
          target ? (
            <>
              Grant <span className="text-foreground font-semibold">{target.name ?? target.email}</span>{' '}
              the Member role for {department}? They will be able to access the Round 2 Interview Dashboard.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Grant role"
        loading={pending}
        onCancel={() => setTarget(null)}
        onConfirm={async () => {
          if (!target) return;
          const result = await grant(target.id, department);
          setNotice(
            result.success
              ? `${target.name ?? target.email} is now a Member of ${department}.`
              : (result.message ?? 'Failed to grant the Member role.')
          );
          setTarget(null);
        }}
      />
    </div>
  );
}

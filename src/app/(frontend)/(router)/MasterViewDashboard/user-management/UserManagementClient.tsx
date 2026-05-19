'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  UserManagementDataTable,
  type PatchPayload,
} from '@/components/user-management/UserManagementDataTable';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserManagementPayload } from '@/lib/user-management/mock-store';

const ROLE_FILTER_OPTIONS = [
  'all',
  'Guest',
  'Member',
  'Department Head',
  'Executive Board',
  'Inactive',
] as const;

type Props = {
  initialPayload: UserManagementPayload;
};

export function UserManagementClient({ initialPayload }: Props) {
  const [payload, setPayload] =
    React.useState<UserManagementPayload>(initialPayload);
  const [semester, setSemester] = React.useState(
    initialPayload.appliedSemester
  );
  const [generation, setGeneration] = React.useState(
    initialPayload.appliedGeneration
  );
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async (s: string, g: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ semester: s, generation: g });
      const res = await fetch(`/api/users?${params}`, {
        credentials: 'include',
      });
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
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onPatch = React.useCallback(
    async (patch: PatchPayload) => {
      setPendingUserId(patch.userId);
      setError(null);
      try {
        const res = await fetch('/api/users', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const json = (await res.json()) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok || !json.success) {
          throw new Error(json.message ?? 'Update failed.');
        }
        await load(semester, generation);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed.');
      } finally {
        setPendingUserId(null);
      }
    },
    [generation, load, semester]
  );

  const onSemesterChange = (v: string) => {
    setSemester(v);
    void load(v, generation);
  };

  const onGenerationChange = (v: string) => {
    setGeneration(v);
    void load(semester, v);
  };

  return (
    <div className="relative space-y-8">

      <div className="flex flex-wrap items-center gap-3 text-sm">
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

      {error ? (
        <AppNotice variant="error" onDismiss={() => setError(null)}>
          {error}
        </AppNotice>
      ) : null}

      <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Semester
            </p>
            <Select
              value={semester}
              onValueChange={onSemesterChange}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                {payload.semesters.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Generation
            </p>
            <Select
              value={generation}
              onValueChange={onGenerationChange}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Generation" />
              </SelectTrigger>
              <SelectContent>
                {payload.generations.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? (
          <p className="text-xs font-semibold text-muted-foreground">
            Loading…
          </p>
        ) : null}
      </div>

      <section className="bg-card border-border rounded-2xl border p-6 shadow-sm transition-transform hover:-translate-y-0.5">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-2xl text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400">
            <i className="fa-solid fa-hourglass-half" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-yellow-700/90 dark:text-yellow-500/90">
              Waiting Room
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
              Guests awaiting approval
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Up to 5 newest accounts (for the selected semester / generation).
            </p>
          </div>
        </div>

        {payload.waitingGuests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No guests are waiting in this cohort context.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {payload.waitingGuests.map((g) => (
              <li
                key={g.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {g.name?.trim() || g.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.email}
                  </p>
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
                    variant="outline"
                    disabled={pendingUserId === g.id}
                    onClick={() =>
                      onPatch({
                        userId: g.id,
                        role: 'Guest',
                        department: 'Unassigned',
                        isActive: false,
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground">
              User list
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              Sort and filter by display role and status (client-side on loaded
              data).
            </p>
          </div>
        </div>

        <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Display role
            </span>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ROLE_FILTER_OPTIONS.filter((x) => x !== 'all').map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <UserManagementDataTable
          data={payload.users}
          soleActiveExecutiveId={payload.soleActiveExecutiveId}
          onPatch={onPatch}
          pendingUserId={pendingUserId}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
        />
      </section>
    </div>
  );
}

'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import * as React from 'react';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SerializedManagementUser } from '@/lib/user-management/mock-store';

export type PatchPayload = {
  userId: string;
  role?: RoleType;
  department?: DepartmentType;
  isActive?: boolean;
};

export type ConfirmRequest = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
};

type UserManagementDataTableProps = {
  data: SerializedManagementUser[];
  soleActiveExecutiveId: string | null;
  onPatch: (patch: PatchPayload) => Promise<void>;
  pendingUserId: string | null;
  /** Trigger the shared ConfirmModal (rendered by the parent). */
  requestConfirm: (request: ConfirmRequest) => void;
  /** Bulk-deactivate the given user ids. Parent wires this to onPatch + notice. */
  onBulkInactive: (userIds: string[]) => Promise<void>;
  /** Optional helper text rendered next to the bulk-action label. */
  bulkScopeLabel?: string;
};

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') {
    return <ArrowUp className="size-3.5" />;
  }
  if (sorted === 'desc') {
    return <ArrowDown className="size-3.5" />;
  }
  return <ArrowUpDown className="size-3.5 opacity-50" />;
}

export function UserManagementDataTable({
  data,
  soleActiveExecutiveId,
  onPatch,
  pendingUserId,
  requestConfirm,
  onBulkInactive,
  bulkScopeLabel,
}: UserManagementDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'user', desc: false },
  ]);
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});

  const isSoleActiveExecutive = React.useCallback(
    (r: SerializedManagementUser) =>
      soleActiveExecutiveId !== null &&
      r.id === soleActiveExecutiveId &&
      r.role === 'Executive Board' &&
      r.isActive,
    [soleActiveExecutiveId]
  );

  const columns = React.useMemo<ColumnDef<SerializedManagementUser>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(v) =>
              table.toggleAllPageRowsSelected(!!v)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
          />
        ),
        enableSorting: false,
        maxSize: 36,
      },
      {
        id: 'user',
        accessorFn: (row) =>
          row.name?.trim() || row.email?.split('@')[0] || row.email,
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1 px-2 font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === 'asc')
            }
          >
            User
            <SortIcon sorted={column.getIsSorted()} />
          </Button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          const label =
            r.name?.trim() || r.email?.split('@')[0] || r.email;
          const initial =
            (r.name?.trim()?.[0] ?? r.email?.[0] ?? '?').toUpperCase();
          return (
            <div className="flex max-w-[240px] items-center gap-2">
              {r.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from OAuth
                <img
                  src={r.avatar}
                  alt=""
                  className="size-8 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'roleDept',
        header: 'Role · Department',
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="font-normal">
                {r.displayRole}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {r.department}
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const busy = pendingUserId === r.id;
          const soleEbLock = isSoleActiveExecutive(r);

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                  disabled={busy}
                  aria-label="Actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Change role</DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={soleEbLock}
                  title={
                    soleEbLock
                      ? 'Cannot demote the last active Executive Board admin.'
                      : undefined
                  }
                  onClick={() =>
                    requestConfirm({
                      title: `Demote ${r.email} to Guest?`,
                      description: `${r.name?.trim() || r.email} will lose ${r.role} access and return to the Waiting Room.`,
                      confirmLabel: 'Demote',
                      variant: 'destructive',
                      onConfirm: () =>
                        onPatch({
                          userId: r.id,
                          role: 'Guest',
                          department: 'Unassigned',
                          isActive: true,
                        }),
                    })
                  }
                >
                  Demote to Guest
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    disabled={soleEbLock}
                    className={
                      soleEbLock ? 'opacity-50' : undefined
                    }
                    title={
                      soleEbLock
                        ? 'Cannot demote the last active Executive Board admin.'
                        : undefined
                    }
                  >
                    Move to Department Head
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {HEAD_DEPARTMENTS.map((d) => (
                      <DropdownMenuItem
                        key={d}
                        disabled={
                          soleEbLock ||
                          (r.role === 'Department Head' &&
                            r.department === d)
                        }
                        title={
                          soleEbLock
                            ? 'Cannot demote the last active Executive Board admin.'
                            : undefined
                        }
                        onClick={() =>
                          onPatch({
                            userId: r.id,
                            role: 'Department Head',
                            department: d,
                          })
                        }
                      >
                        {d}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  disabled={
                    soleEbLock || r.role === 'Executive Board'
                  }
                  onClick={() =>
                    onPatch({
                      userId: r.id,
                      role: 'Executive Board',
                    })
                  }
                >
                  Promote to Executive Board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={soleEbLock}
                  title={
                    soleEbLock
                      ? 'Cannot revoke the last active Executive Board admin.'
                      : undefined
                  }
                  onClick={() =>
                    requestConfirm({
                      title: `Revoke access for ${r.email}?`,
                      description:
                        'They will become inactive and lose dashboard access. You can reactivate them later from the Inactive accounts section.',
                      confirmLabel: 'Revoke access',
                      variant: 'destructive',
                      onConfirm: () =>
                        onPatch({
                          userId: r.id,
                          isActive: false,
                        }),
                    })
                  }
                >
                  Revoke access (Inactive)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [isSoleActiveExecutive, onPatch, pendingUserId, requestConfirm]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table API
  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection]
  );

  const selectionContainsSoleEb = React.useMemo(() => {
    if (!soleActiveExecutiveId) return false;
    return selectedIds.includes(soleActiveExecutiveId);
  }, [selectedIds, soleActiveExecutiveId]);

  const selectableForBulkInactive = React.useMemo(() => {
    return selectedIds.filter((id) => {
      if (id === soleActiveExecutiveId) return false;
      const u = data.find((x) => x.id === id);
      return u?.isActive === true;
    });
  }, [selectedIds, soleActiveExecutiveId, data]);

  const handleBulkInactive = () => {
    if (selectableForBulkInactive.length === 0) return;
    requestConfirm({
      title: `Deactivate ${selectableForBulkInactive.length} accounts?`,
      description: (
        <>
          The selected accounts will become inactive and lose dashboard access.
          You can reactivate them later from the Inactive accounts section.
          {selectionContainsSoleEb ? (
            <p className="mt-2 font-semibold text-amber-700 dark:text-amber-400">
              Note: the last active Executive Board admin is in your selection
              and will be skipped automatically.
            </p>
          ) : null}
        </>
      ),
      confirmLabel: `Deactivate ${selectableForBulkInactive.length}`,
      variant: 'destructive',
      onConfirm: async () => {
        await onBulkInactive(selectableForBulkInactive);
        setRowSelection({});
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          Bulk actions
          {bulkScopeLabel ? (
            <span className="ml-1 font-normal text-muted-foreground">
              · {bulkScopeLabel}
            </span>
          ) : null}
        </span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={selectableForBulkInactive.length === 0}
          onClick={handleBulkInactive}
        >
          Bulk inactive
          {selectableForBulkInactive.length > 0
            ? ` (${selectableForBulkInactive.length})`
            : ''}
        </Button>
        {selectedIds.length > 0 ? (
          <span className="text-muted-foreground">
            {selectedIds.length} row(s) selected
            {selectionContainsSoleEb
              ? ' · sole Executive Board will be skipped'
              : ''}
          </span>
        ) : (
          <span className="text-muted-foreground">
            Select rows to enable bulk actions.
          </span>
        )}
      </div>

      <div className="bg-card border-border overflow-x-auto rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-muted-foreground">
                    {flexRender(
                      h.column.columnDef.header,
                      h.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No accounts to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

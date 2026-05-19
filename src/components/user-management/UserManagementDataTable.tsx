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
import { Switch } from '@/components/ui/switch';
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

type UserManagementDataTableProps = {
  data: SerializedManagementUser[];
  soleActiveExecutiveId: string | null;
  onPatch: (patch: PatchPayload) => Promise<void>;
  pendingUserId: string | null;
  roleFilter: string;
  statusFilter: string;
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
  roleFilter,
  statusFilter,
}: UserManagementDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'user', desc: false },
  ]);
  const [rowSelection, setRowSelection] = React.useState({});

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      if (roleFilter !== 'all' && row.displayRole !== roleFilter) {
        return false;
      }
      if (statusFilter === 'active' && !row.isActive) {
        return false;
      }
      if (statusFilter === 'inactive' && row.isActive) {
        return false;
      }
      return true;
    });
  }, [data, roleFilter, statusFilter]);

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
        accessorKey: 'generation',
        header: 'Generation',
      },
      {
        accessorKey: 'semester',
        header: 'Semester',
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const r = row.original;
          const soleLock =
            soleActiveExecutiveId !== null &&
            r.id === soleActiveExecutiveId &&
            r.role === 'Executive Board' &&
            r.isActive;
          const disabled = pendingUserId === r.id || soleLock;
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={r.isActive}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onPatch({
                    userId: r.id,
                    isActive: checked,
                  })
                }
              />
              <span className="text-xs text-muted-foreground">
                {r.isActive ? 'Active' : 'Inactive'}
              </span>
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
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Change role</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    onPatch({
                      userId: r.id,
                      role: 'Guest',
                      department: 'Unassigned',
                      isActive: true,
                    })
                  }
                >
                  Guest
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Member (Guest + PB)</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {HEAD_DEPARTMENTS.map((d) => (
                      <DropdownMenuItem
                        key={d}
                        onClick={() =>
                          onPatch({
                            userId: r.id,
                            role: 'Guest',
                            department: d,
                            isActive: true,
                          })
                        }
                      >
                        {d}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Department Head
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {HEAD_DEPARTMENTS.map((d) => (
                      <DropdownMenuItem
                        key={d}
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
                  onClick={() =>
                    onPatch({
                      userId: r.id,
                      role: 'Executive Board',
                    })
                  }
                >
                  Executive Board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Assign department</DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Member · PB</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {HEAD_DEPARTMENTS.map((d) => (
                      <DropdownMenuItem
                        key={d}
                        onClick={() =>
                          onPatch({
                            userId: r.id,
                            role: 'Guest',
                            department: d,
                            isActive: true,
                          })
                        }
                      >
                        {d}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    onPatch({
                      userId: r.id,
                      isActive: false,
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
    [onPatch, pendingUserId, soleActiveExecutiveId]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table API
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const selectedCount = Object.keys(rowSelection).filter(
    (k) => (rowSelection as Record<string, boolean>)[k]
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Bulk (Phase 2)</span>
        <Button type="button" size="sm" variant="outline" disabled title="Phase 2">
          Move to Alumni
        </Button>
        <Button type="button" size="sm" variant="outline" disabled title="Phase 2">
          Bulk inactive
        </Button>
        {selectedCount > 0 ? (
          <span className="text-muted-foreground">
            {selectedCount} row(s) selected
          </span>
        ) : null}
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
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
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
                  No users match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

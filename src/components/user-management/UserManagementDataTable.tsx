'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';
import { HEAD_DEPARTMENTS } from '@/app/(backend)/libs/departments';
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
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import type { SerializedManagementUser } from '@/lib/user-management/mock-store';
import { cn } from '@/lib/utils';

export type PatchPayload = {
  userId: string;
  role?: RoleType;
  department?: DepartmentType | 'Unassigned';
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
  requestConfirm: (request: ConfirmRequest) => void;
  onBulkInactive: (userIds: string[]) => Promise<void>;
  bulkScopeLabel?: string;
  hiddenColumns?: string[];
};

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

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc')
    return (
      <i className="fa-solid fa-arrow-up ml-1.5 text-[10px] text-[#0D1742]" />
    );
  if (sorted === 'desc')
    return (
      <i className="fa-solid fa-arrow-down ml-1.5 text-[10px] text-[#0D1742]" />
    );
  return (
    <i className="fa-solid fa-sort ml-1.5 text-[10px] text-gray-300 group-hover:text-gray-400 transition-colors" />
  );
}

export function UserManagementDataTable({
  data,
  soleActiveExecutiveId,
  onPatch,
  pendingUserId,
  requestConfirm,
  onBulkInactive,
  hiddenColumns = [],
}: UserManagementDataTableProps) {
  'use no memo';

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'user', desc: false },
  ]);
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});

  const initialVisibility = React.useMemo(() => {
    const visibility: VisibilityState = {};
    hiddenColumns.forEach((colId) => {
      visibility[colId] = false;
    });
    return visibility;
  }, [hiddenColumns]);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialVisibility);

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
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            className="border-gray-300 data-[state=checked]:bg-[#0D1742] data-[state=checked]:border-[#0D1742]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            className="border-gray-300 data-[state=checked]:bg-[#0D1742] data-[state=checked]:border-[#0D1742]"
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
          <button
            type="button"
            className="group flex items-center text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            User <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          const label = r.name?.trim() || r.email?.split('@')[0] || r.email;
          const initial = (
            r.name?.trim()?.[0] ??
            r.email?.[0] ??
            '?'
          ).toUpperCase();
          return (
            <div className="flex max-w-60 items-center gap-3">
              {r.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.avatar}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-gray-200 object-cover shadow-sm"
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-[#0D1742]/5 text-xs font-black text-[#0D1742]">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">
                  {label}
                </p>
                <p className="truncate text-xs font-medium text-gray-500">
                  {r.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'role',
        header: () => (
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Role
          </span>
        ),
        cell: ({ row }) => {
          const isExB = row.original.role === 'Executive Board';
          return (
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
                isExB
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              )}
            >
              {row.original.role}
            </span>
          );
        },
      },
      {
        id: 'department',
        header: () => (
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Department
          </span>
        ),
        cell: ({ row }) => {
          const dept = row.original.department;
          if (!dept || dept === 'Unassigned')
            return <span className="text-gray-400">—</span>;
          const deptUI = DEPT_UI[dept] || {
            icon: 'fa-building',
            text: 'text-gray-700',
            bg: 'bg-gray-100',
          };

          return (
            <span
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-bold border border-gray-200 flex items-center gap-1.5 w-fit',
                deptUI.bg,
                deptUI.text
              )}
            >
              <i className={`fa-solid ${deptUI.icon}`} />{' '}
              {dept.replace(' Department', '')}
            </span>
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
          const targetName = r.name?.trim() || r.email;

          // Helper để lấy UI hiện tại của user, phục vụ hiển thị trong Modal
          const isCurrentExB = r.role === 'Executive Board';
          const currentDeptUI =
            r.department && DEPT_UI[r.department]
              ? DEPT_UI[r.department]
              : {
                  icon: 'fa-building',
                  text: 'text-gray-700',
                  bg: 'bg-gray-100',
                };

          return (
            <div className="text-right">
              {soleEbLock ? (
                // Nếu là quản trị viên cuối cùng (Sole Admin), Ẩn Dropdown và hiện icon Ổ Khóa
                <TooltipProvider delayDuration={300}>
                  <Tooltip content="Cannot modify or deactivate the last active Executive Board member.">
                    <span className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                      <i className="fa-solid fa-lock text-sm" />
                    </span>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="size-8 rounded-lg p-0 hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                      disabled={busy}
                    >
                      {busy ? (
                        <i className="fa-solid fa-spinner fa-spin text-sm" />
                      ) : (
                        <i className="fa-solid fa-ellipsis text-sm" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 rounded-xl border-gray-200 shadow-lg p-1.5"
                  >
                    <DropdownMenuLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                      Manage Access
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      className="font-semibold text-sm py-2 cursor-pointer focus:bg-gray-100 rounded-lg text-gray-600 focus:text-gray-900"
                      onClick={() =>
                        requestConfirm({
                          title: 'Demote to Guest?',
                          description: (
                            <span className="mt-2 flex flex-col gap-3">
                              <span className="block text-sm text-gray-600">
                                Demote{' '}
                                <strong className="text-gray-900">
                                  {targetName}
                                </strong>{' '}
                                to Guest. They will lose all dashboard
                                privileges and and return to the Waiting Room.
                              </span>
                            </span>
                          ),
                          confirmLabel: 'Demote to Guest',
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
                      <i className="fa-solid fa-user-minus w-4 text-center mr-2 text-gray-400" />
                      Demote to Guest
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="font-semibold text-sm py-2 cursor-pointer rounded-lg text-gray-600 focus:text-gray-900 data-[state=open]:bg-gray-100">
                        <i className="fa-solid fa-user-tie w-4 text-center mr-2 text-gray-400" />
                        Move to Department Head
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="rounded-xl shadow-lg border-gray-200 p-1.5">
                        {HEAD_DEPARTMENTS.filter(
                          (d) =>
                            !(
                              r.role === 'Department Head' && r.department === d
                            )
                        ).map((d) => (
                          <DropdownMenuItem
                            key={d}
                            className="font-semibold text-sm py-2 cursor-pointer focus:bg-gray-50 rounded-lg text-gray-700"
                            onClick={() =>
                              requestConfirm({
                                title: `Change Department Head Role?`,
                                description: (
                                  <span className="mt-2 flex flex-col gap-4">
                                    <span className="block text-sm text-gray-600">
                                      Assign{' '}
                                      <strong className="text-gray-900">
                                        {targetName}
                                      </strong>{' '}
                                      to a new leadership role.
                                    </span>

                                    <span className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
                                      {/* Trạng thái HIỆN TẠI */}
                                      <span className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                          Current Role
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                          <span
                                            className={cn(
                                              'px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
                                              isCurrentExB
                                                ? 'bg-violet-50 text-violet-700 border-violet-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            )}
                                          >
                                            {r.role}
                                          </span>
                                          {/* Chỉ hiện Department nếu không phải Executive Board */}
                                          {!isCurrentExB &&
                                            r.department &&
                                            r.department !== 'Unassigned' && (
                                              <span
                                                className={cn(
                                                  'px-2 py-0.5 rounded-md text-[11px] font-bold border border-gray-200 flex items-center gap-1 w-fit',
                                                  currentDeptUI.bg,
                                                  currentDeptUI.text
                                                )}
                                              >
                                                <i
                                                  className={`fa-solid ${currentDeptUI.icon}`}
                                                />{' '}
                                                {r.department.replace(
                                                  ' Department',
                                                  ''
                                                )}
                                              </span>
                                            )}
                                        </span>
                                      </span>

                                      <i className="fa-solid fa-arrow-down text-gray-300 my-1" />

                                      {/* Trạng thái MỚI */}
                                      <span className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                          New Role
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Department Head
                                          </span>
                                          <span
                                            className={cn(
                                              'px-2 py-0.5 rounded-md text-[11px] font-bold border border-gray-200 flex items-center gap-1 w-fit',
                                              DEPT_UI[d].bg,
                                              DEPT_UI[d].text
                                            )}
                                          >
                                            <i
                                              className={`fa-solid ${DEPT_UI[d].icon}`}
                                            />{' '}
                                            {d.replace(' Department', '')}
                                          </span>
                                        </span>
                                      </span>
                                    </span>

                                    <span className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                                      <i
                                        className={`fa-solid ${DEPT_UI[d].icon} mt-0.5 text-emerald-600`}
                                      />
                                      <span className="text-sm font-medium leading-tight">
                                        They will have full access to view,
                                        evaluate, and export candidates in the{' '}
                                        {d}.
                                      </span>
                                    </span>
                                  </span>
                                ),
                                confirmLabel: 'Assign Role',
                                variant: 'default',
                                onConfirm: () =>
                                  onPatch({
                                    userId: r.id,
                                    role: 'Department Head',
                                    department: d,
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

                    {r.role !== 'Executive Board' && (
                      <DropdownMenuItem
                        className="font-semibold text-sm py-2 cursor-pointer focus:bg-violet-50 focus:text-violet-700 text-violet-600 rounded-lg"
                        onClick={() =>
                          requestConfirm({
                            title: 'Promote to Executive Board?',
                            description: (
                              <span className="mt-2 flex flex-col gap-4">
                                <span className="block text-sm text-gray-600">
                                  Promote{' '}
                                  <strong className="text-gray-900">
                                    {targetName}
                                  </strong>{' '}
                                  to the Executive Board.
                                </span>

                                <span className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
                                  {/* Trạng thái HIỆN TẠI */}
                                  <span className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      Current Role
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {r.role}
                                      </span>
                                      {/* Chỉ hiện Department nếu không phải Executive Board */}
                                      {!isCurrentExB &&
                                        r.department &&
                                        r.department !== 'Unassigned' && (
                                          <span
                                            className={cn(
                                              'px-2 py-0.5 rounded-md text-[11px] font-bold border border-gray-200 flex items-center gap-1 w-fit',
                                              currentDeptUI.bg,
                                              currentDeptUI.text
                                            )}
                                          >
                                            <i
                                              className={`fa-solid ${currentDeptUI.icon}`}
                                            />{' '}
                                            {r.department.replace(
                                              ' Department',
                                              ''
                                            )}
                                          </span>
                                        )}
                                    </span>
                                  </span>

                                  <i className="fa-solid fa-arrow-down text-gray-300 my-1" />

                                  {/* Trạng thái MỚI */}
                                  <span className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                      New Role
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-violet-50 text-violet-700 border-violet-200">
                                      Executive Board
                                    </span>
                                  </span>
                                </span>

                                <span className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-violet-800">
                                  <i className="fa-solid fa-shield-halved mt-0.5 text-violet-600" />
                                  <span className="text-sm font-medium leading-tight">
                                    This grants them supreme administrative
                                    privileges across all departments, including
                                    full user management.
                                  </span>
                                </span>
                              </span>
                            ),
                            confirmLabel: 'Assign Role',
                            variant: 'default',
                            onConfirm: () =>
                              onPatch({
                                userId: r.id,
                                role: 'Executive Board',
                                department: 'Unassigned',
                              }),
                          })
                        }
                      >
                        <i className="fa-solid fa-shield-halved w-4 text-center mr-2" />
                        Promote to Executive Board
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-gray-100 my-1" />

                    <DropdownMenuItem
                      className="font-semibold text-sm py-2 cursor-pointer focus:bg-red-50 focus:text-red-700 text-red-600 rounded-lg"
                      onClick={() =>
                        requestConfirm({
                          title: 'Deactivate Account?',
                          description: (
                            <span className="mt-2 flex flex-col gap-3">
                              <span className="block text-sm text-gray-600">
                                Deactivate the account for{' '}
                                <strong className="text-gray-900">
                                  {targetName}
                                </strong>
                                . They will be immediately logged out and lose
                                all access to the system. You can restore this
                                account later from the Inactive section.
                              </span>
                            </span>
                          ),
                          confirmLabel: 'Deactivate Account',
                          variant: 'destructive',
                          onConfirm: () =>
                            onPatch({
                              userId: r.id,
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
              )}
            </div>
          );
        },
      },
    ],
    [isSoleActiveExecutive, onPatch, pendingUserId, requestConfirm]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
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
      title: `Deactivate ${selectableForBulkInactive.length} Accounts?`,
      description: (
        <span className="mt-2 flex flex-col gap-3">
          <span className="block text-sm text-gray-600">
            Deactivate{' '}
            <strong className="text-gray-900">
              {selectableForBulkInactive.length} selected accounts
            </strong>
            . These users will be immediately logged out and lose all dashboard
            access. You can restore these accounts later from the Inactive
            section.
          </span>

          {selectionContainsSoleEb && (
            <span className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <i className="fa-solid fa-shield-halved mt-0.5 text-amber-600" />
              <span className="text-sm font-medium leading-tight">
                <strong className="text-amber-900">Note:</strong> The last
                active Executive Board admin is in your selection and will be
                skipped automatically.
              </span>
            </span>
          )}
        </span>
      ),
      confirmLabel: `Deactivate ${selectableForBulkInactive.length} Accounts`,
      variant: 'destructive',
      onConfirm: async () => {
        await onBulkInactive(selectableForBulkInactive);
        setRowSelection({});
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* SaaS Style Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex animate-in fade-in slide-in-from-top-2 flex-wrap items-center justify-between gap-4 rounded-xl border border-[#0D1742]/10 bg-[#0D1742]/5 px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#0D1742]">
              {selectedIds.length} row(s) selected
            </span>
            {selectionContainsSoleEb && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                Sole Admin Skipped
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="destructive"
            className="h-8 rounded-lg text-xs font-bold shadow-sm"
            disabled={selectableForBulkInactive.length === 0}
            onClick={handleBulkInactive}
          >
            <i className="fa-solid fa-ban mr-2" />
            Deactivate ({selectableForBulkInactive.length})
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              {table.getHeaderGroups().map((hg) => (
                <TableRow
                  key={hg.id}
                  className="hover:bg-transparent border-gray-200"
                >
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="h-10 py-2">
                      {flexRender(h.column.columnDef.header, h.getContext())}
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
                    className="border-gray-100 transition-colors hover:bg-gray-50 data-[state=selected]:bg-[#0D1742]/5 data-[state=selected]:hover:bg-[#0D1742]/10"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
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
                    className="h-32 text-center"
                  >
                    <p className="text-sm font-bold text-gray-400">
                      No accounts to display.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CandidateDetailModal } from '@/app/(frontend)/(router)/HeadDashboard/CandidateDetailModal';
import {
  patchCandidateStatus,
  type DashboardStatus,
} from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';

type CandidateRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  choice1: string;
  choice2: string | null;
  status: string;
  generation: string;
  semester: string;
  appliedAt: string;
  updatedAt: string;
};

type ListApiResponse = {
  success: boolean;
  message?: string;
  candidates?: CandidateRow[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    emptyState?: string | null;
    filters?: {
      search?: string;
      status?: string | null;
      department?: string;
    };
  };
};

const STATUS_OPTIONS: DashboardStatus[] = ['Pending', 'Pass', 'Fail'];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
}

function countByStatus(rows: CandidateRow[]) {
  let pending = 0;
  let pass = 0;
  let fail = 0;
  for (const c of rows) {
    if (c.status === 'Pending') pending += 1;
    else if (c.status === 'Pass') pass += 1;
    else if (c.status === 'Fail') fail += 1;
  }
  return { pending, pass, fail };
}

async function fetchAllCandidates(): Promise<{
  rows: CandidateRow[];
  meta: ListApiResponse['meta'];
  error?: string;
}> {
  const limit = 100;
  const merged: CandidateRow[] = [];
  let meta: ListApiResponse['meta'];
  let page = 1;

  for (;;) {
    const res = await fetch(
      `/api/head-dashboard/candidates?limit=${limit}&page=${page}`,
      { credentials: 'include' }
    );
    const json = (await res.json()) as ListApiResponse;
    if (!res.ok) {
      return {
        rows: [],
        meta: undefined,
        error: json.message ?? `Lỗi ${res.status}`,
      };
    }
    const batch = json.candidates ?? [];
    if (page === 1) {
      meta = json.meta;
    }
    merged.push(...batch);
    if (batch.length < limit) break;
    page += 1;
  }

  return { rows: merged, meta };
}

export function DepartmentCandidatesTable() {
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [meta, setMeta] = useState<ListApiResponse['meta']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCandidateId, setDetailCandidateId] = useState<string | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: all, meta: m, error: err } = await fetchAllCandidates();
      if (err) {
        setError(err);
        setRows([]);
        setMeta(undefined);
        return;
      }
      setRows(all);
      setMeta(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
      setRows([]);
      setMeta(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => countByStatus(rows), [rows]);
  const totalFromApi = meta?.total ?? rows.length;
  const deptLabel = meta?.filters?.department;
  const emptyHint = meta?.emptyState;

  const patchStatus = async (candidateId: string, status: DashboardStatus) => {
    setUpdatingId(candidateId);
    try {
      const { ok, message } = await patchCandidateStatus(candidateId, status);
      if (!ok) {
        if (message && message !== 'Đã hủy.') {
          window.alert(message);
        }
        return;
      }
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = (id: string) => {
    setDetailCandidateId(id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailCandidateId(null);
  };

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">Đang tải danh sách thí sinh…</p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium">Không lấy được dữ liệu</p>
        <p className="mt-1">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-red-900 hover:bg-red-200"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CandidateDetailModal
        open={detailOpen}
        candidateId={detailCandidateId}
        onClose={closeDetail}
        onAfterStatusChange={load}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Tổng thí sinh
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
            {totalFromApi}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase text-amber-800">
            Pending
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase text-emerald-800">Pass</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
            {stats.pass}
          </p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase text-rose-800">Fail</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-950">
            {stats.fail}
          </p>
        </div>
      </section>

      {deptLabel != null && deptLabel !== '' && (
        <p className="text-sm text-zinc-600">
          Phòng ban:{' '}
          <span className="font-medium text-zinc-900">{deptLabel}</span>
        </p>
      )}

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          {emptyHint ?? 'Chưa có thí sinh nào.'}
        </p>
      )}

      {rows.length > 0 && (
        <p className="text-xs text-zinc-500">
          Nhấn vào một hàng để xem chi tiết hồ sơ (popup).
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Choice 1</th>
                <th className="px-3 py-2">Choice 2</th>
                <th className="px-3 py-2">Kỳ / Gen</th>
                <th className="px-3 py-2">Cập nhật</th>
                <th className="px-3 py-2">Đổi trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail(c.id);
                    }
                  }}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80"
                >
                  <td className="px-3 py-2 font-medium text-zinc-900">
                    {c.fullName}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2 text-zinc-600">
                    {c.email}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800">
                      {c.status}
                    </span>
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-zinc-600">
                    {c.choice1}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-zinc-600">
                    {c.choice2 ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                    {c.semester} · {c.generation}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                    {formatDate(c.updatedAt)}
                  </td>
                  <td
                    className="px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={updatingId === c.id || c.status === st}
                          onClick={() => void patchStatus(c.id, st)}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            c.status === st
                              ? 'bg-zinc-900 text-white'
                              : st === 'Pass'
                                ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                : st === 'Fail'
                                  ? 'bg-rose-100 text-rose-900 hover:bg-rose-200'
                                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                        >
                          {updatingId === c.id ? '…' : st}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

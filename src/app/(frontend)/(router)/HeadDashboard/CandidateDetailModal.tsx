'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  patchCandidateStatus,
  type DashboardStatus,
} from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';

type ICustomAnswer = { question: string; answer: string };

type DetailCandidate = {
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
  cvLink: string;
  customAnswers: ICustomAnswer[];
  personalInformation: {
    dob: string;
    majorAndYear: string;
    facebookLink: string;
    futurePlans: string;
  };
  generalQuestions: {
    fintechAspect: string;
    achievementExpectation: string;
    timeCommitment: string;
    explanation: string;
    questionsForUs: string;
  };
};

type DetailResponse = {
  success: boolean;
  message?: string;
  candidate?: DetailCandidate;
};

const STATUS_OPTIONS: DashboardStatus[] = ['Pending', 'Pass', 'Fail'];

function nonEmptyPair(q: string | undefined, a: string | undefined): boolean {
  return (
    q != null &&
    String(q).trim() !== '' &&
    a != null &&
    String(a).trim() !== ''
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  const display =
    value != null && String(value).trim() !== '' ? value : '—';
  return (
    <div className="border-b border-zinc-100 py-2 last:border-0">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm text-zinc-900">
        {display}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 border-b border-zinc-200 pb-1 text-sm font-semibold text-zinc-800">
      {children}
    </h3>
  );
}

type CandidateDetailModalProps = {
  open: boolean;
  candidateId: string | null;
  onClose: () => void;
  onAfterStatusChange: () => Promise<void>;
};

export function CandidateDetailModal({
  open,
  candidateId,
  onClose,
  onAfterStatusChange,
}: CandidateDetailModalProps) {
  const [detail, setDetail] = useState<DetailCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!candidateId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/head-dashboard/candidates/${candidateId}`,
        { credentials: 'include' }
      );
      const json = (await res.json()) as DetailResponse;
      if (!res.ok) {
        setError(json.message ?? `Lỗi ${res.status}`);
        setDetail(null);
        return;
      }
      setDetail(json.candidate ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được chi tiết.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (open && candidateId) {
      void fetchDetail();
    } else {
      setDetail(null);
      setError(null);
    }
  }, [open, candidateId, fetchDetail]);

  const handleStatus = async (status: DashboardStatus) => {
    if (!candidateId) return;
    setUpdating(true);
    try {
      const { ok, message } = await patchCandidateStatus(candidateId, status);
      if (!ok) {
        if (message && message !== 'Đã hủy.') {
          window.alert(message);
        }
        return;
      }
      await onAfterStatusChange();
      await fetchDetail();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Cập nhật thất bại.');
    } finally {
      setUpdating(false);
    }
  };

  if (!open) return null;

  const deptPairs =
    detail?.customAnswers?.filter((x) =>
      nonEmptyPair(x.question, x.answer)
    ) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2
              id="candidate-detail-title"
              className="text-lg font-semibold text-zinc-900"
            >
              {loading
                ? 'Đang tải…'
                : detail?.fullName ?? 'Chi tiết thí sinh'}
            </h2>
            {!loading && detail && (
              <p className="mt-0.5 text-xs text-zinc-500">
                Trạng thái:{' '}
                <span className="font-medium text-zinc-700">{detail.status}</span>
                {' · '}
                {detail.semester} · {detail.generation}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && (
            <p className="text-sm text-zinc-500">Đang tải dữ liệu…</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && detail && (
            <div className="space-y-6">
              <section>
                <SectionTitle>Personal information</SectionTitle>
                <DataRow label="Họ tên" value={detail.fullName} />
                <DataRow label="Email" value={detail.email} />
                <DataRow
                  label="Ngày sinh"
                  value={detail.personalInformation.dob}
                />
                <DataRow label="Điện thoại" value={detail.phone} />
                <DataRow
                  label="Ngành & năm"
                  value={detail.personalInformation.majorAndYear}
                />
                <DataRow
                  label="Facebook"
                  value={detail.personalInformation.facebookLink}
                />
                <DataRow label="Link CV" value={detail.cvLink} />
                <DataRow
                  label="Định hướng / kế hoạch"
                  value={detail.personalInformation.futurePlans}
                />
              </section>

              <section>
                <SectionTitle>General question</SectionTitle>
                <DataRow
                  label="Khía cạnh Fintech"
                  value={detail.generalQuestions.fintechAspect}
                />
                <DataRow
                  label="Kỳ vọng đạt được"
                  value={detail.generalQuestions.achievementExpectation}
                />
                <DataRow
                  label="Cam kết thời gian"
                  value={detail.generalQuestions.timeCommitment}
                />
                <DataRow
                  label="Giải thích thêm"
                  value={detail.generalQuestions.explanation}
                />
                <DataRow
                  label="Câu hỏi cho BTC"
                  value={detail.generalQuestions.questionsForUs}
                />
              </section>

              <section>
                <SectionTitle>Department question</SectionTitle>
                {deptPairs.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Không có cặp câu hỏi–trả lời đầy đủ.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deptPairs.map((row, i) => (
                      <div
                        key={`${row.question}-${i}`}
                        className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
                      >
                        <p className="text-xs font-medium text-zinc-600">
                          {row.question}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                          {row.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-xs text-zinc-600">
                <p>
                  <span className="font-medium">Choice 1:</span> {detail.choice1}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Choice 2:</span>{' '}
                  {detail.choice2 ?? '—'}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Department hiện tại:</span>{' '}
                  {detail.department}
                </p>
              </section>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-zinc-600">
            Cập nhật trạng thái
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((st) => (
              <button
                key={st}
                type="button"
                disabled={
                  updating ||
                  !detail ||
                  loading ||
                  Boolean(error) ||
                  detail.status === st
                }
                onClick={() => void handleStatus(st)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  detail?.status === st
                    ? 'bg-zinc-900 text-white'
                    : st === 'Pass'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : st === 'Fail'
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {updating ? '…' : st}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

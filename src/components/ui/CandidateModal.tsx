'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import type {
  HeadDashboardCandidateDetailApi,
  HeadDashboardListCandidate,
} from '@/types/headDashboard';
import { mapExecutiveDetailToHeadDetail } from '@/lib/executiveMasterViewMapping';

type HeadDetailResponse = {
  success: boolean;
  message?: string;
  candidate?: HeadDashboardCandidateDetailApi;
};

type ExecutiveDetailResponse = {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

interface CandidateModalProps {
  candidate: HeadDashboardListCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: 'Pass' | 'Fail' | 'Pending') => void;
  /** Default: head-dashboard detail API */
  detailApi?: 'head' | 'executive';
  /** Hide status actions (Executive has no PATCH status API yet) */
  readOnly?: boolean;
}

function buildPlansText(d: HeadDashboardCandidateDetailApi): string {
  const g = d.generalQuestions;
  const p = d.personalInformation;
  const blocks = [
    p.futurePlans && `Plans (2026–2027): ${p.futurePlans}`,
    g.fintechAspect && `Fintech aspect: ${g.fintechAspect}`,
    g.achievementExpectation && `Expectations: ${g.achievementExpectation}`,
    g.timeCommitment && `Time commitment: ${g.timeCommitment}`,
    g.explanation && `Additional explanation: ${g.explanation}`,
    g.questionsForUs && `Questions for us: ${g.questionsForUs}`,
  ].filter(Boolean);
  return blocks.length > 0 ? blocks.join('\n\n') : 'No general answers submitted.';
}

export const CandidateModal: FC<CandidateModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onUpdateStatus,
  detailApi = 'head',
  readOnly = false,
}) => {
  const [detail, setDetail] = useState<HeadDashboardCandidateDetailApi | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        if (detailApi === 'executive') {
          const res = await fetch(`/api/executive/candidates/${id}`, {
            credentials: 'include',
          });
          const json = (await res.json()) as ExecutiveDetailResponse;
          if (!res.ok || !json.success || !json.data) {
            setDetailError(json.message ?? `Error ${res.status}`);
            setDetail(null);
            return;
          }
          setDetail(mapExecutiveDetailToHeadDetail(json.data));
          return;
        }

        const res = await fetch(`/api/head-dashboard/candidates/${id}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as HeadDetailResponse;
        if (!res.ok || !json.success) {
          setDetailError(json.message ?? `Error ${res.status}`);
          setDetail(null);
          return;
        }
        setDetail(json.candidate ?? null);
      } catch (e) {
        setDetailError(e instanceof Error ? e.message : 'Failed to load profile.');
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [detailApi]
  );

  useEffect(() => {
    if (isOpen && candidate?.id) {
      void fetchDetail(candidate.id);
    } else {
      setDetail(null);
      setDetailError(null);
    }
  }, [isOpen, candidate?.id, candidate?.status, fetchDetail]);

  if (!isOpen || !candidate) return null;

  const display = detail
    ? {
        fullName: detail.fullName,
        email: detail.email,
        phone: detail.phone,
        dob: detail.personalInformation.dob,
        majorLine: detail.personalInformation.majorAndYear,
        fbLink: detail.personalInformation.facebookLink,
        cvLink: detail.cvLink,
        plans_text: buildPlansText(detail),
        status: detail.status,
        generation: detail.generation,
        semester: detail.semester,
        choice1: detail.choice1,
        choice2: detail.choice2,
        department: detail.department,
      }
    : {
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        dob: '—',
        majorLine: candidate.choice1,
        fbLink: '',
        cvLink: '',
        plans_text: 'Loading full profile…',
        status: candidate.status,
        generation: candidate.generation,
        semester: candidate.semester,
        choice1: candidate.choice1,
        choice2: candidate.choice2,
        department: candidate.department,
      };

  const deptExtra =
    detail?.customAnswers?.filter(
      (x) =>
        x.question?.trim() &&
        String(x.answer ?? '').trim() !== ''
    ) ?? [];

  const routingSource = detail ?? candidate;
  const isSecondChoiceStage =
    routingSource.routing.currentStage === 'choice2';
  const choice1Label = detail?.choice1 ?? candidate.choice1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300">
      <div className="flex h-[90vh] w-full max-w-4xl scale-100 transform flex-col overflow-hidden rounded-3xl border border-border bg-card font-sans shadow-2xl transition-transform duration-300">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card p-8">
          <h1 className="text-3xl font-black tracking-tight text-blue-950 dark:text-blue-400">
            Application Form —{' '}
            <span className="font-bold text-foreground">{display.fullName}</span>
          </h1>
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black tracking-wider uppercase shadow-sm ${
                display.status === 'Pass'
                  ? 'border-green-200 bg-green-100 text-green-700'
                  : ''
              }
                ${
                  display.status === 'Pending'
                    ? 'border-yellow-200 bg-yellow-100 text-yellow-700'
                    : ''
                }
                ${
                  display.status === 'Fail'
                    ? 'border-red-200 bg-red-100 text-red-700'
                    : ''
                }`}
            >
              <i
                className={`
                  ${display.status === 'Pass' ? 'fa-solid fa-check' : ''}
                  ${display.status === 'Pending' ? 'fa-solid fa-clock' : ''}
                  ${display.status === 'Fail' ? 'fa-solid fa-xmark' : ''}
                `}
              />
              {display.status}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-full p-2 transition-colors hover:bg-muted"
            >
              <i className="fa-solid fa-xmark text-2xl" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-card p-8">
          {loadingDetail && (
            <p className="text-muted-foreground text-sm">Loading full profile…</p>
          )}
          {detailError && (
            <p className="text-sm text-red-600">{detailError}</p>
          )}
          {isSecondChoiceStage && (
            <div
              className="mx-auto mb-8 max-w-3xl rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-3 text-sm text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/50 dark:text-violet-200"
              role="status"
            >
              <i className="fa-solid fa-shuffle mr-2 text-violet-700 dark:text-violet-400" aria-hidden />
              <span className="font-bold">Lựa chọn 2</span>
              <span className="text-violet-900 dark:text-violet-100">
                {' '}
                — Thí sinh đã qua vòng ban lựa chọn 1 ({choice1Label}), hiện xét tại ban của bạn.
              </span>
            </div>
          )}
          <div className="mx-auto max-w-3xl space-y-10">
            <section>
              <h2 className="mb-6 flex items-center gap-3 text-xl font-bold tracking-tight text-blue-950 dark:text-blue-400">
                I. Personal Information
              </h2>

              <div className="grid grid-cols-1 gap-y-6 gap-x-12 md:grid-cols-2">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-regular fa-envelope" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      Your sID Email <span className="text-red-500">*</span>
                    </p>
                    <p className="text-foreground truncate text-sm font-bold">
                      {display.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-regular fa-user" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      Your Name <span className="text-red-500">*</span>
                    </p>
                    <p className="text-foreground truncate text-sm font-bold">
                      {display.fullName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-solid fa-birthday-cake" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      Date of Birth <span className="text-red-500">*</span>
                    </p>
                    <p className="text-foreground truncate text-sm font-bold">
                      {display.dob || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-solid fa-phone" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      Phone <span className="text-red-500">*</span>
                    </p>
                    <p className="text-foreground truncate text-sm font-bold">
                      {display.phone}
                    </p>
                  </div>
                </div>

                <div className="col-span-1 flex items-start gap-4 md:col-span-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-solid fa-graduation-cap" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      Major & year <span className="text-red-500">*</span>
                    </p>
                    <p className="text-foreground truncate text-sm font-bold">
                      {display.majorLine} • {display.generation} • {display.semester}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-brands fa-facebook" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      Facebook <span className="text-red-500">*</span>
                    </p>
                    <a
                      href={display.fbLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
                    >
                      View Facebook
                      <i className="fa-solid fa-up-right-from-square text-[10px]" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600/80 shadow-sm">
                    <i className="fa-regular fa-file-alt" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5 text-xs font-black tracking-wider uppercase">
                      CV / Portfolio <span className="text-red-500">*</span>
                    </p>
                    <a
                      href={display.cvLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
                    >
                      View CV
                      <i className="fa-solid fa-up-right-from-square text-[10px]" />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-8">
              <h2 className="mb-6 flex items-center gap-3 text-xl font-bold tracking-tight text-blue-950 dark:text-blue-400">
                II. General questions
              </h2>
              <div className="border-border bg-muted/40 text-foreground shadow-inner whitespace-pre-wrap rounded-2xl border p-6 text-sm leading-relaxed font-medium">
                {display.plans_text}
              </div>
            </section>

            {deptExtra.length > 0 && (
              <section className="border-t border-border pt-8">
                <h2 className="mb-6 text-xl font-bold tracking-tight text-blue-950 dark:text-blue-400">
                  III. Department questions
                </h2>
                <div className="space-y-4">
                  {deptExtra.map((row, i) => (
                    <div
                      key={`${row.question}-${i}`}
                      className="rounded-2xl border border-border bg-muted/30 px-4 py-3"
                    >
                      <p className="text-xs font-semibold text-muted-foreground">
                        {row.question}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {row.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {detail && (
              <section className="text-muted-foreground rounded-xl border border-dashed border-border px-4 py-3 text-xs">
                <p>
                  <span className="font-semibold text-foreground">Choice 1:</span>{' '}
                  {detail.choice1}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-foreground">Choice 2:</span>{' '}
                  {detail.choice2 ?? '—'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-foreground">Current department:</span>{' '}
                  {detail.department}
                </p>
              </section>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="z-10 flex shrink-0 items-center justify-center gap-6 border-t border-border bg-card p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={() => onUpdateStatus(candidate.id, 'Fail')}
              className="w-40 rounded-xl border-2 border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-500 hover:bg-red-500 hover:text-white hover:shadow-md"
            >
              Fail
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(candidate.id, 'Pending')}
              className="w-40 rounded-xl border-2 border-yellow-200 bg-yellow-50 px-6 py-3 text-sm font-black text-yellow-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500 hover:bg-yellow-500 hover:text-white hover:shadow-md"
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(candidate.id, 'Pass')}
              className="w-40 rounded-xl border-2 border-green-200 bg-green-50 px-6 py-3 text-sm font-black text-green-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-500 hover:bg-green-500 hover:text-white hover:shadow-md"
            >
              Pass
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateModal;

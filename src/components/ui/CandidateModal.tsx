'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import type {
  HeadDashboardCandidateDetailApi,
  HeadDashboardListCandidate,
} from '@/types/headDashboard';
import type { ICustomAnswer } from '@/app/(backend)/types';
import {
  SECOND_CHOICE_BANNER_TITLE,
  secondChoiceBannerMessage,
} from '@/lib/candidateRoutingCopy';
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
  detailApi?: 'head' | 'executive';
  readOnly?: boolean;
}

// Đã tối ưu màu sắc Card: Tinh tế và ăn nhập hơn với Brand
function AnswerCard({ row, index }: { row: ICustomAnswer; index: number }) {
  return (
    <div className="mb-5 rounded-2xl border border-gray-100/80 bg-white p-4 shadow-[0_2px_12px_rgba(13,23,66,0.03)] transition-all sm:p-5 hover:border-[#0D1742]/10 hover:shadow-md">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Đổi màu icon Q sang tone Gold/Navy */}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#DCB968]/15 text-xs font-black text-[#0D1742]">
          Q{index + 1}
        </div>
        <div className="mt-1 flex-1">
          <p className="text-sm font-bold leading-relaxed text-[#0D1742]">
            {row.question}
          </p>
          {/* Đổi màu nền answer sang xám ngả xanh siêu nhạt */}
          <div className="mt-2.5 whitespace-pre-wrap rounded-xl bg-[#F8F9FC] p-3.5 text-[14px] leading-relaxed text-[#334155]">
            {row.answer || (
              <span className="italic text-gray-400">No answer provided</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const CandidateModal: FC<CandidateModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onUpdateStatus,
  detailApi = 'head',
  readOnly = false,
}) => {
  const [detail, setDetail] = useState<HeadDashboardCandidateDetailApi | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
        setDetailError(
          e instanceof Error ? e.message : 'Failed to load profile.'
        );
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
        majorLine: '—',
        fbLink: '',
        cvLink: '',
        status: candidate.status,
        generation: candidate.generation,
        semester: candidate.semester,
        choice1: candidate.choice1,
        choice2: candidate.choice2,
        department: candidate.department,
      };

  const generalAnswers = detail?.generalAnswers ?? [];
  const deptCustomAnswers = detail?.customAnswers ?? [];
  const showDepartmentSection = deptCustomAnswers.length > 0;

  const routingSource = detail ?? candidate;
  const isSecondChoiceStage = routingSource.routing.currentStage === 'choice2';
  const choice1Label = detail?.choice1 ?? candidate.choice1;

  const statusBadge =
    {
      Pass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Pending: 'border-[#F7D27F] bg-[#FFEFCA] text-[#A28436]',
      Fail: 'border-[#B82649]/30 bg-[#B82649]/10 text-[#B82649]',
    }[display.status] || 'border-gray-200 bg-gray-50 text-gray-700';

  const statusIcon =
    {
      Pass: 'fa-check',
      Pending: 'fa-clock',
      Fail: 'fa-xmark',
    }[display.status] || 'fa-circle-dot';

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-gray-900/60 p-2 sm:p-4 backdrop-blur-sm">
      <div
        className="flex h-full w-full max-w-7xl animate-in slide-in-from-right-8 duration-300 flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4 sm:px-8 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-[#0D1742] sm:text-2xl">
              {display.fullName}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${statusBadge}`}
            >
              <i className={`fa-solid ${statusIcon}`} />
              <span className="hidden sm:inline">{display.status}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!readOnly && (
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(candidate.id, 'Pass')}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-xs font-bold text-emerald-600 shadow-sm transition-colors hover:bg-emerald-500 hover:text-white"
                >
                  <i className="fa-solid fa-check" /> Pass
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(candidate.id, 'Pending')}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#FFEFCA] px-4 text-xs font-bold text-[#A28436] shadow-sm transition-colors hover:bg-[#F7D27F] hover:text-[#0D1742]"
                >
                  <i className="fa-solid fa-clock" /> Pending
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(candidate.id, 'Fail')}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#B82649]/10 px-4 text-xs font-bold text-[#B82649] shadow-sm transition-colors hover:bg-[#B82649] hover:text-white"
                >
                  <i className="fa-solid fa-xmark" /> Fail
                </button>
              </div>
            )}
            <div className="hidden h-7 w-px bg-gray-200 sm:block"></div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-[#0D1742]"
            >
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* CỘT TRÁI: Applicant Info */}
          <div className="w-full shrink-0 border-b border-gray-100 bg-white px-5 py-6 sm:px-8 lg:w-85 lg:border-b-0 lg:border-r">
            {isSecondChoiceStage && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#E0D8FF] bg-[#F0EDFF] p-3.5 shadow-sm">
                <i className="fa-solid fa-share mt-0.5 text-[#2C305F]" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#2C305F]">
                    {SECOND_CHOICE_BANNER_TITLE}
                  </h4>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-[#5E5E92]">
                    {secondChoiceBannerMessage(choice1Label)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {/* Profile Block */}
              <div>
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                  Applicant Details
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400">
                      <i className="fa-solid fa-envelope w-4 text-center" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-500">
                        Student Email
                      </p>
                      <p
                        className="truncate text-[14px] font-semibold text-[#0D1742]"
                        title={display.email}
                      >
                        {display.email}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400">
                      <i className="fa-solid fa-phone w-4 text-center" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500">
                        Phone Number
                      </p>
                      <p className="text-[14px] font-semibold text-[#0D1742]">
                        {display.phone || '—'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400">
                      <i className="fa-solid fa-cake-candles w-4 text-center" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500">
                        Date of Birth
                      </p>
                      <p className="text-[14px] font-semibold text-[#0D1742]">
                        {display.dob || '—'}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400">
                      <i className="fa-solid fa-graduation-cap w-4 text-center" />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-xs font-bold text-gray-500">
                        Major & Year
                      </p>
                      <p className="mt-0.5 text-[14px] font-semibold leading-snug text-[#0D1742]">
                        {display.majorLine || '—'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Links Block */}
              <div>
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                  External Links
                </h3>
                <div className="flex flex-col gap-2.5">
                  <a
                    href={display.cvLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-[#0D1742]/30 hover:bg-[#F8F9FC]"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EAEFFF] text-blue-600">
                      <i className="fa-solid fa-file-pdf" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-[14px] font-bold text-[#0D1742]">
                        View Portfolio / CV
                      </p>
                      <p className="truncate text-[11px] font-medium text-gray-500">
                        Click to open document
                      </p>
                    </div>
                  </a>

                  <a
                    href={display.fbLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-[#0D1742]/30 hover:bg-[#F8F9FC]"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1877F2]">
                      <i className="fa-brands fa-facebook-f" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-[14px] font-bold text-[#0D1742]">
                        Facebook Profile
                      </p>
                      <p className="truncate text-[11px] font-medium text-gray-500">
                        Verify social identity
                      </p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Routing Info */}
              {detail && (
                <div className="rounded-xl bg-[#F8F9FC] p-4 border border-gray-100">
                  <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                    Routing Status
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                      <span className="font-bold text-gray-500">
                        1st Choice:
                      </span>
                      <span className="font-bold text-[#0D1742] text-right">
                        {detail.choice1}
                      </span>
                    </div>
                    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                      <span className="font-bold text-gray-500">
                        2nd Choice:
                      </span>
                      <span className="font-bold text-[#0D1742] text-right">
                        {detail.choice2 ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end pt-0.5">
                      <span className="font-bold text-gray-500">
                        Assigned To:
                      </span>
                      <span className="font-black text-[#0D1742] text-right">
                        {detail.department}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Q&A Responses (Màu nền ngả xanh) */}
          <div className="flex-1 bg-[#F5F7FA] px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
            {loadingDetail ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-[#DCB968]" />
                <p className="mt-4 text-sm font-bold text-[#0D1742]">
                  Retrieving application data...
                </p>
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-[#B82649]/20 bg-[#B82649]/5 p-6 text-center text-[#B82649]">
                <i className="fa-solid fa-triangle-exclamation text-2xl" />
                <p className="mt-2 font-semibold">{detailError}</p>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-10 pb-8">
                {/* General Section */}
                <section>
                  <h2 className="mb-5 flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-[#0D1742]">
                    <i className="fa-solid fa-globe text-[#DCB968]" />
                    General Questions
                  </h2>
                  {generalAnswers.length > 0 ? (
                    <div>
                      {generalAnswers.map((row, i) => (
                        <AnswerCard key={`gen-${i}`} row={row} index={i} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-500 italic">
                      No general answers submitted.
                    </p>
                  )}
                </section>

                {/* Department Section */}
                {showDepartmentSection && (
                  <section>
                    <h2 className="mb-5 flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-[#0D1742]">
                      <i className="fa-solid fa-briefcase text-[#DCB968]" />
                      Department Questions
                    </h2>
                    <div>
                      {deptCustomAnswers.map((row, i) => (
                        <AnswerCard key={`dept-${i}`} row={row} index={i} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE ACTION BAR */}
        {!readOnly && (
          <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white p-3.5 sm:hidden gap-2">
            <button
              type="button"
              onClick={() => onUpdateStatus(candidate.id, 'Fail')}
              className="flex flex-1 items-center justify-center rounded-xl bg-[#B82649]/10 py-2.5 text-sm font-bold text-[#B82649] transition-colors active:bg-[#B82649] active:text-white"
            >
              Fail
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(candidate.id, 'Pending')}
              className="flex flex-1 items-center justify-center rounded-xl bg-[#FFEFCA] py-2.5 text-sm font-bold text-[#A28436] transition-colors active:bg-[#F7D27F] active:text-[#0D1742]"
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(candidate.id, 'Pass')}
              className="flex flex-1 items-center justify-center rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-600 transition-colors active:bg-emerald-500 active:text-white"
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

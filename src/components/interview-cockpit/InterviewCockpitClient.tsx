'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, CalendarX2, CalendarCheck, ArrowLeft } from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { DecisionBar } from './DecisionBar';
import { SaveBadge } from './SaveBadge';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type {
  BackendRound2Status,
  CockpitUser,
  InterviewAnswer,
  InterviewCandidate,
  SaveState,
  SlotStatusType,
} from '@/lib/interview-cockpit/types';
import { cn } from '@/lib/utils';

import { ProfilePanel } from './ProfilePanel';
import {
  QuestionEvaluationCard,
  GeneralNoteCard,
  CustomQuestionComposer,
} from './EvaluationCards';

const MIN_PROFILE_PERCENT = 30;
const MAX_PROFILE_PERCENT = 70;
const DEFAULT_PROFILE_PERCENT = 45;
const POLLING_INTERVAL_MS = 10000;

type QuestionDeleteResult = { answers?: InterviewAnswer[] };
type InterviewCockpitRepositoryWithQuestionDeletion =
  typeof interviewCockpitRepository & {
    deleteTemplateQuestion: (
      candidateId: string,
      questionId: string
    ) => Promise<QuestionDeleteResult>;
    deleteCustomQuestion: (
      candidateId: string,
      questionId: string
    ) => Promise<QuestionDeleteResult>;
    updateCustomQuestion: (
      candidateId: string,
      questionId: string,
      question: string
    ) => Promise<QuestionDeleteResult>;
  };

function clampProfilePercent(value: number) {
  return Math.min(MAX_PROFILE_PERCENT, Math.max(MIN_PROFILE_PERCENT, value));
}

export function InterviewCockpitClient({
  candidateId,
  currentUser,
}: {
  candidateId: string;
  currentUser: CockpitUser;
}) {
  const [candidate, setCandidate] = useState<InterviewCandidate | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPolling, setIsPolling] = useState(false);

  const [mobileTab, setMobileTab] = useState<'profile' | 'evaluation'>(
    'evaluation'
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [decision, setDecision] = useState<BackendRound2Status | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCustomComposer, setShowCustomComposer] = useState(false);

  // State cho No Show / Completed Slot Management
  const [slotAction, setSlotAction] = useState<'NO_SHOW' | 'COMPLETED' | null>(
    null
  );
  const [isSlotConfirmOpen, setIsSlotConfirmOpen] = useState(false);
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);

  const [profilePercent, setProfilePercent] = useState(DEFAULT_PROFILE_PERCENT);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const SLOT_LABELS: Record<'COMPLETED' | 'NO_SHOW', string> = {
    COMPLETED: 'Completed',
    NO_SHOW: 'No Show',
  };

  const loadData = useCallback(
    async (background = false) => {
      try {
        if (background) setIsPolling(true);
        const item = await interviewCockpitRepository.getCandidate(candidateId);
        setCandidate(item);
      } catch (cause) {
        if (!background)
          setLoadError(
            cause instanceof Error ? cause.message : 'Could not load cockpit.'
          );
      } finally {
        if (background) setIsPolling(false);
      }
    },
    [candidateId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);
  useEffect(() => {
    const interval = setInterval(
      () => void loadData(true),
      POLLING_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (!isResizing) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isResizing]);

  const saveState = useMemo<SaveState>(
    () =>
      Object.values(saveStates).includes('error')
        ? 'error'
        : Object.values(saveStates).includes('saving')
          ? 'saving'
          : 'saved',
    [saveStates]
  );

  const terminal = candidate?.status !== 'Pending';
  const isDepartmentHead = currentUser.role === 'Department Head';
  const hasEditRights =
    isDepartmentHead ||
    currentUser.role === 'Member' ||
    currentUser.role === 'Executive Board';

  const searchParams = useSearchParams();
  const returnTab = searchParams.get('tab') || 'round2';
  const dashboardHref = useMemo(() => {
    const basePath =
      currentUser.role === 'Executive Board'
        ? '/MasterViewDashboard/candidates'
        : currentUser.role === 'Department Head'
          ? '/HeadDashboard'
          : '/MemberDashboard';
    return `${basePath}?tab=${returnTab}`;
  }, [currentUser.role, returnTab]);

  const updateState = useCallback(
    (key: string, state: SaveState) =>
      setSaveStates((current) => ({ ...current, [key]: state })),
    []
  );

  const saveTemplateAnswer = useCallback(
    async (answer: InterviewAnswer) => {
      if (!candidate) return;
      const nextAnswers = candidate.evaluationAnswers.map((item) =>
        item.id === answer.id ? answer : item
      );
      setCandidate({ ...candidate, evaluationAnswers: nextAnswers });
      const result = await interviewCockpitRepository.saveTemplateAnswers(
        candidateId,
        nextAnswers
      );
      setCandidate((prev) =>
        prev ? { ...prev, evaluationAnswers: result.answers } : prev
      );
    },
    [candidate, candidateId]
  );

  const saveCustomAnswer = useCallback(
    async (answer: InterviewAnswer) => {
      if (!candidate) return;
      const nextAnswers = candidate.adHocQuestions.map((item) =>
        item.id === answer.id ? answer : item
      );
      setCandidate({ ...candidate, adHocQuestions: nextAnswers });
      const result = await interviewCockpitRepository.saveCustomAnswers(
        candidateId,
        nextAnswers
      );
      setCandidate((prev) =>
        prev ? { ...prev, adHocQuestions: result.answers } : prev
      );
    },
    [candidate, candidateId]
  );

  const createCustomQuestion = useCallback(
    async (question: string) => {
      updateState('custom-question', 'saving');
      setActionError(null);
      try {
        const adHocQuestions =
          await interviewCockpitRepository.addCustomQuestion(
            candidateId,
            question
          );
        setCandidate((prev) => (prev ? { ...prev, adHocQuestions } : prev));
        updateState('custom-question', 'saved');
        setShowCustomComposer(false);
      } catch (cause) {
        updateState('custom-question', 'error');
        setActionError(
          cause instanceof Error
            ? cause.message
            : 'Could not create the custom question.'
        );
        throw cause;
      }
    },
    [candidateId, updateState]
  );

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      if (!candidate || !isDepartmentHead) return;
      setActionError(null);
      updateState(questionId, 'saving');

      const isTemplate = candidate.evaluationAnswers.some(
        (q) => q.id === questionId
      );

      try {
        if (isTemplate) {
          setCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  evaluationAnswers: prev.evaluationAnswers.filter(
                    (q) => q.id !== questionId
                  ),
                }
              : prev
          );
          const result = await (
            interviewCockpitRepository as InterviewCockpitRepositoryWithQuestionDeletion
          ).deleteTemplateQuestion(candidateId, questionId);
          setCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  evaluationAnswers: result.answers || prev.evaluationAnswers,
                }
              : prev
          );
        } else {
          setCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  adHocQuestions: prev.adHocQuestions.filter(
                    (q) => q.id !== questionId
                  ),
                }
              : prev
          );
          const result = await (
            interviewCockpitRepository as InterviewCockpitRepositoryWithQuestionDeletion
          ).deleteCustomQuestion(candidateId, questionId);
          setCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  adHocQuestions: result.answers || prev.adHocQuestions,
                }
              : prev
          );
        }
        updateState(questionId, 'saved');
      } catch (cause) {
        updateState(questionId, 'error');
        setActionError(
          cause instanceof Error
            ? cause.message
            : 'Could not delete the question.'
        );
        void loadData();
      }
    },
    [candidate, candidateId, isDepartmentHead, loadData, updateState]
  );

  const updateQuestionText = useCallback(
    async (questionId: string, newText: string) => {
      if (!candidate || !isDepartmentHead) return;
      setActionError(null);
      updateState(questionId, 'saving');

      try {
        setCandidate((prev) =>
          prev
            ? {
                ...prev,
                adHocQuestions: prev.adHocQuestions.map((q) =>
                  q.id === questionId ? { ...q, question: newText } : q
                ),
              }
            : prev
        );

        const result = await (
          interviewCockpitRepository as InterviewCockpitRepositoryWithQuestionDeletion
        ).updateCustomQuestion(candidateId, questionId, newText);
        setCandidate((prev) =>
          prev
            ? { ...prev, adHocQuestions: result.answers || prev.adHocQuestions }
            : prev
        );
        updateState(questionId, 'saved');
      } catch (cause) {
        updateState(questionId, 'error');
        setActionError(
          cause instanceof Error
            ? cause.message
            : 'Could not update the question text.'
        );
        void loadData();
      }
    },
    [candidate, candidateId, isDepartmentHead, loadData, updateState]
  );

  const updateProfilePercent = useCallback((clientX: number) => {
    const bounds = splitContainerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    const next = ((clientX - bounds.left) / bounds.width) * 100;
    setProfilePercent(clampProfilePercent(next));
  }, []);

  const confirmDecision = async () => {
    if (!candidate || !decision || !isDepartmentHead) return;
    updateState('decision', 'saving');
    setActionError(null);
    try {
      const result = await interviewCockpitRepository.setStatus(
        candidate.id,
        decision
      );
      setCandidate({ ...candidate, status: result.status });
      updateState('decision', 'saved');
      setDecision(null);
      setIsConfirmOpen(false);
    } catch (cause) {
      updateState('decision', 'error');
      setActionError(
        cause instanceof Error ? cause.message : 'Could not save decision.'
      );
    }
  };

  // Hàm xử lý cập nhật trạng thái slot (No Show / Completed)
  const handleUpdateSlotStatus = async () => {
    if (!candidate || !slotAction || !candidate.interviewSlotId) {
      setActionError(
        'This candidate does not have a valid interview slot assigned.'
      );
      return;
    }

    setIsUpdatingSlot(true);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/executive/interview-slots/${candidate.interviewSlotId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: slotAction,
            department: candidate.department,
          }),
        }
      );

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to update slot status.');
      }

      setIsSlotConfirmOpen(false);
      setSlotAction(null);
      void loadData(true);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Could not update slot status.'
      );
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  if (loadError) return <AppNotice variant="error">{loadError}</AppNotice>;
  if (!candidate)
    return (
      <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-400 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 ">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-[#DCB968]"></i>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#0D1742]">
            Loading Interview Cockpit
          </h3>
        </div>
      </div>
    );
  // Lấy trạng thái slot hiện tại của ứng viên (ví dụ: 'COMPLETED', 'NO_SHOW', 'BOOKED', 'AVAILABLE')
  const currentSlotStatus = (
    candidate as InterviewCandidate & { interviewSlotStatus?: SlotStatusType }
  ).interviewSlotStatus;

  return (
    <div className="mx-auto flex flex-col">
      {/* GLOBAL HEADER */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <Link
          href={dashboardHref}
          className="group flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-400 transition-colors hover:text-[#0D1742]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Candidate Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <SaveBadge state={saveState} />
        </div>
      </div>

      {actionError && (
        <div className="mb-4 shrink-0">
          <AppNotice variant="error">{actionError}</AppNotice>
        </div>
      )}

      {/* MOBILE TABS */}
      <div className="mb-4 flex shrink-0 rounded-xl bg-gray-100 p-1 lg:hidden">
        <button
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-black transition-all',
            mobileTab === 'profile'
              ? 'bg-white text-[#0D1742] shadow-sm'
              : 'text-gray-500'
          )}
          onClick={() => setMobileTab('profile')}
        >
          Context (Round 1)
        </button>
        <button
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-black transition-all',
            mobileTab === 'evaluation'
              ? 'bg-[#0D1742] text-[#DCB968] shadow-sm'
              : 'text-gray-500'
          )}
          onClick={() => setMobileTab('evaluation')}
        >
          Evaluation (Round 2)
        </button>
      </div>

      <div
        ref={splitContainerRef}
        className={cn(
          'flex-1 min-h-0 lg:grid items-stretch',
          isResizing && 'select-none'
        )}
        style={{
          gridTemplateColumns: `${profilePercent}fr 16px ${100 - profilePercent}fr`,
        }}
      >
        {/* PANEL LEFT: CONTEXT */}
        <div
          className={cn(
            'h-full min-w-0',
            mobileTab !== 'profile' && 'hidden lg:block'
          )}
        >
          <ProfilePanel candidate={candidate} />
        </div>

        {/* RESIZER */}
        <div
          role="separator"
          tabIndex={0}
          className="group hidden cursor-col-resize items-center justify-center self-stretch lg:flex"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsResizing(true);
            updateProfilePercent(event.clientX);
          }}
          onPointerMove={(event) => {
            if (isResizing) updateProfilePercent(event.clientX);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            setIsResizing(false);
          }}
          onPointerCancel={() => setIsResizing(false)}
        >
          <div className="h-16 w-1.5 rounded-full bg-gray-200 transition-colors group-hover:bg-[#DCB968]"></div>
        </div>

        {/* PANEL RIGHT: EVALUATION */}
        <div
          className={cn(
            'flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-gray-50 shadow-sm',
            mobileTab !== 'evaluation' && 'hidden lg:flex'
          )}
        >
          <div className="flex-1 scroll-smooth overflow-y-auto p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-black text-[#0D1742]">
                <i className="fa-solid fa-clipboard-question text-[#DCB968]"></i>{' '}
                Live Assessment
              </h2>
              {isDepartmentHead && (
                <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm gap-1">
                  {/* Nút No Show với hiệu ứng Active động */}
                  <button
                    type="button"
                    disabled={terminal || isUpdatingSlot}
                    onClick={() => {
                      setSlotAction('NO_SHOW');
                      setIsSlotConfirmOpen(true);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50',
                      currentSlotStatus === 'NO_SHOW'
                        ? 'bg-[#B82649] text-white shadow-sm ring-2 ring-[#B82649]/30'
                        : currentSlotStatus
                          ? 'text-gray-400 opacity-40 grayscale-50 hover:bg-red-50 hover:text-red-600'
                          : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                    )}
                  >
                    <CalendarX2
                      className={cn(
                        'h-3.5 w-3.5',
                        currentSlotStatus === 'NO_SHOW'
                          ? 'text-white'
                          : 'text-red-500'
                      )}
                    />{' '}
                    No Show
                  </button>

                  <div className="my-1 w-px bg-gray-200"></div>

                  {/* Nút Completed với hiệu ứng Active động */}
                  <button
                    type="button"
                    disabled={terminal || isUpdatingSlot}
                    onClick={() => {
                      setSlotAction('COMPLETED');
                      setIsSlotConfirmOpen(true);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50',
                      currentSlotStatus === 'COMPLETED'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : currentSlotStatus
                          ? 'text-gray-400 opacity-40 grayscale-50 hover:bg-emerald-50 hover:text-emerald-600'
                          : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                    )}
                  >
                    <CalendarCheck
                      className={cn(
                        'h-3.5 w-3.5',
                        currentSlotStatus === 'COMPLETED'
                          ? 'text-white'
                          : 'text-emerald-500'
                      )}
                    />{' '}
                    Completed
                  </button>
                </div>
              )}
            </div>

            {terminal && (
              <AppNotice variant="info" title="Evaluation closed">
                Answers and notes are read-only after a decision. Department
                Head can still change the decision.
              </AppNotice>
            )}

            <div className="mt-5 space-y-6">
              {candidate.evaluationAnswers.length === 0 && (
                <p className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-gray-400">
                  No standard questions available.
                </p>
              )}

              {/* RENDER TEMPLATE QUESTIONS */}
              {candidate.evaluationAnswers.map((answer, index) => (
                <QuestionEvaluationCard
                  key={answer.id}
                  index={index}
                  answer={answer}
                  disabled={!hasEditRights || terminal}
                  currentUser={currentUser}
                  isDepartmentHead={isDepartmentHead}
                  onSaved={saveTemplateAnswer}
                  onSaveState={(state) => updateState(answer.id, state)}
                  onDeleteQuestion={deleteQuestion}
                />
              ))}

              {/* RENDER AD-HOC QUESTIONS */}
              {candidate.adHocQuestions.map((answer) => (
                <QuestionEvaluationCard
                  key={answer.id}
                  answer={answer}
                  disabled={!hasEditRights || terminal}
                  currentUser={currentUser}
                  isDepartmentHead={isDepartmentHead}
                  onSaved={saveCustomAnswer}
                  onSaveState={(state) => updateState(answer.id, state)}
                  onDeleteQuestion={deleteQuestion}
                  onUpdateQuestion={updateQuestionText}
                />
              ))}

              {showCustomComposer && !terminal && (
                <CustomQuestionComposer
                  onCreate={createCustomQuestion}
                  onCancel={() => setShowCustomComposer(false)}
                />
              )}
            </div>

            {isDepartmentHead && (
              <button
                type="button"
                disabled={terminal || showCustomComposer}
                onClick={() => setShowCustomComposer(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#0D1742]/30 px-5 py-2.5 text-sm font-bold text-[#0D1742] transition hover:bg-[#0D1742]/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4 text-[#DCB968]" />
                {candidate.adHocQuestions.length > 0
                  ? 'Add Another Ad-Hoc Question'
                  : 'Add Ad-Hoc Question'}
              </button>
            )}

            <GeneralNoteCard
              candidateId={candidate.id}
              currentUserId={currentUser.id}
              notes={candidate.generalNotes}
              disabled={!hasEditRights || terminal}
              onSaved={(notes) =>
                setCandidate((prev) =>
                  prev ? { ...prev, generalNotes: notes } : prev
                )
              }
              onSaveState={(state) => updateState('general-note', state)}
            />

            {isDepartmentHead && (
              <div className="mb-2 mt-8 border-t border-gray-200">
                <DecisionBar
                  value={candidate.status}
                  onChange={(val) => {
                    setDecision(val);
                    setIsConfirmOpen(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialog cho Trạng thái Duyệt (Pass / Pending / Fail) */}
      <ConfirmDialog
        open={isConfirmOpen}
        title="Update Candidate Status"
        variant={decision === 'Fail' ? 'destructive' : 'default'}
        description={
          decision ? (
            <>
              Are you sure you want to mark{' '}
              <span className="font-bold text-gray-900">
                {candidate.fullName}
              </span>{' '}
              as{' '}
              <span
                className={
                  decision === 'Pass'
                    ? 'font-bold text-emerald-600'
                    : decision === 'Pending'
                      ? 'font-bold text-[#A28436]'
                      : 'font-bold text-[#B82649]'
                }
              >
                {decision}
              </span>
              ? This will update their current standing in the recruitment
              process.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={`Mark as ${decision || ''}`}
        onConfirm={() => void confirmDecision()}
        onCancel={() => {
          setDecision(null);
          setIsConfirmOpen(false);
        }}
      />

      {/* Confirm Dialog cho Trạng thái Lịch hẹn (No Show / Completed) */}
      <ConfirmDialog
        open={isSlotConfirmOpen}
        title={`Mark Interview as ${slotAction ? SLOT_LABELS[slotAction] : ''}?`}
        variant={slotAction === 'NO_SHOW' ? 'destructive' : 'default'}
        description={
          <p>
            You are about to mark the interview slot for{' '}
            <strong className="text-gray-900">{candidate.fullName}</strong> as{' '}
            <span
              className={
                slotAction === 'COMPLETED'
                  ? 'font-bold text-emerald-600'
                  : 'font-bold text-red-600'
              }
            >
              {slotAction ? SLOT_LABELS[slotAction] : ''}
            </span>
            . This action tracks attendance for this candidate.
          </p>
        }
        confirmLabel={isUpdatingSlot ? 'Updating...' : `Confirm`}
        onConfirm={() => void handleUpdateSlotStatus()}
        onCancel={() => {
          setSlotAction(null);
          setIsSlotConfirmOpen(false);
        }}
        loading={isUpdatingSlot}
      />
    </div>
  );
}

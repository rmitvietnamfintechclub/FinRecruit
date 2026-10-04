'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  GripVertical,
  Lock,
  Plus,
  UserRound,
} from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DecisionBar } from './DecisionBar';
import { SaveBadge } from './SaveBadge';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type {
  CockpitRole,
  InterviewAnswer,
  InterviewCandidate,
  Round2Status,
  SaveState,
} from '@/lib/interview-cockpit/types';
import { cn } from '@/lib/utils';

const MIN_PROFILE_PERCENT = 30;
const MAX_PROFILE_PERCENT = 70;
const DEFAULT_PROFILE_PERCENT = 40;

function clampProfilePercent(value: number) {
  return Math.min(MAX_PROFILE_PERCENT, Math.max(MIN_PROFILE_PERCENT, value));
}

function AutoSaveTextarea({
  answer,
  disabled,
  onSaved,
  onSaveState,
}: {
  answer: InterviewAnswer;
  disabled: boolean;
  onSaved: (answer: InterviewAnswer) => Promise<void>;
  onSaveState: (state: SaveState) => void;
}) {
  const [value, setValue] = useState(answer.answer);
  const onSaveStateRef = useRef(onSaveState);

  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  const save = useCallback(
    async (nextValue: string) => {
      await onSaved({ ...answer, answer: nextValue });
    },
    [answer, onSaved]
  );
  const state = useDebouncedSave(value, save);

  useEffect(() => onSaveStateRef.current(state), [state]);

  return (
    <Textarea
      disabled={disabled}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Record the candidate’s response…"
      className="mt-3 disabled:bg-muted/40"
    />
  );
}

function CustomQuestionEditor({
  answer,
  disabled,
  onSaved,
  onSaveState,
}: {
  answer: InterviewAnswer;
  disabled: boolean;
  onSaved: (answer: InterviewAnswer) => Promise<void>;
  onSaveState: (state: SaveState) => void;
}) {
  const [question, setQuestion] = useState(answer.question);
  const [response, setResponse] = useState(answer.answer);
  const onSaveStateRef = useRef(onSaveState);

  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  const draft = useMemo(
    () => ({ question, answer: response }),
    [question, response]
  );
  const save = useCallback(
    async (next: { question: string; answer: string }) => {
      await onSaved({
        id: answer.id,
        isCustom: true,
        question: next.question,
        answer: next.answer,
      });
    },
    [answer.id, onSaved]
  );
  const state = useDebouncedSave(draft, save, 800);

  useEffect(() => onSaveStateRef.current(state), [state]);

  return (
    <article className="rounded-2xl border border-dashed border-purple-400 bg-purple-50/40 p-4 dark:bg-purple-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:bg-purple-950 dark:text-purple-300">
          Custom · Candidate only
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {state === 'saving'
            ? 'Saving…'
            : state === 'error'
              ? 'Could not save'
              : 'Saved locally'}
        </span>
      </div>
      <label
        htmlFor={`${answer.id}-question`}
        className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
      >
        Question
      </label>
      <Input
        id={`${answer.id}-question`}
        autoFocus={!answer.question}
        disabled={disabled}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Type the custom question…"
        className="mt-2 h-11 border-purple-200 bg-card disabled:bg-muted/40"
      />
      <label
        htmlFor={`${answer.id}-answer`}
        className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
      >
        Candidate response
      </label>
      <Textarea
        id={`${answer.id}-answer`}
        disabled={disabled}
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        placeholder="Record the candidate’s response…"
        className="mt-2 min-h-24 border-purple-200 bg-card disabled:bg-muted/40"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        This Q&amp;A is saved only for this candidate. The department template
        is unchanged.
      </p>
    </article>
  );
}

function GeneralNoteEditor({
  candidateId,
  initialValue,
  disabled,
  onSaved,
  onSaveState,
}: {
  candidateId: string;
  initialValue: string;
  disabled: boolean;
  onSaved: (value: string) => void;
  onSaveState: (state: SaveState) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const onSaveStateRef = useRef(onSaveState);

  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  const save = useCallback(
    async (nextValue: string) => {
      await interviewCockpitRepository.saveGeneralNote(candidateId, nextValue);
      onSaved(nextValue);
    },
    [candidateId, onSaved]
  );
  const state = useDebouncedSave(value, save);

  useEffect(() => onSaveStateRef.current(state), [state]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="general-notes"
          className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
        >
          General Notes
        </label>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {state === 'saving'
            ? 'Saving…'
            : state === 'error'
              ? 'Save failed'
              : 'Saved'}
        </span>
      </div>
      <Textarea
        id="general-notes"
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Any additional observations…"
        className="mt-2 min-h-20 resize-none disabled:bg-muted/40"
      />
    </div>
  );
}

function ProfilePanel({ candidate }: { candidate: InterviewCandidate }) {
  return (
    <section className="h-full overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Candidate profile
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <UserRound />
            </span>
            <div>
              <h2 className="text-xl font-black text-blue-950 dark:text-blue-300">
                {candidate.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {candidate.studentId} · {candidate.department}
              </p>
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase">
          <Lock className="h-3 w-3" /> Read-only
        </span>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ['Date of birth', candidate.dob],
          ['Major & year', candidate.majorAndYear],
          ['Phone', candidate.phone],
          ['Interview slot', candidate.interviewSlot],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <a
          href={candidate.facebookLink}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
        >
          Facebook <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href={candidate.cvLink}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
        >
          View CV <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <h3 className="mt-7 text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        General questions
      </h3>
      <div className="mt-3 space-y-3">
        {candidate.generalAnswers.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3">
            <p className="text-sm font-bold">{item.question}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
      <h3 className="mt-7 text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        Department questions
      </h3>
      <div className="mt-3 rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground">
          First choice: {candidate.choice1}
          <br />
          Second choice: {candidate.choice2}
          <br />
          Current interview: {candidate.department}
        </p>
        {candidate.departmentAnswers.map((item) => (
          <div key={item.id} className="mt-3">
            <p className="text-sm font-bold">{item.question}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InterviewCockpitClient({
  candidateId,
  role,
}: {
  candidateId: string;
  role: CockpitRole;
}) {
  const [candidate, setCandidate] = useState<InterviewCandidate | null>(null);
  const [mobileTab, setMobileTab] = useState<'profile' | 'evaluation'>(
    'profile'
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [decision, setDecision] = useState<Round2Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [profilePercent, setProfilePercent] = useState(DEFAULT_PROFILE_PERCENT);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.all([
      interviewCockpitRepository.getCandidate(candidateId),
      interviewCockpitRepository.getSettings(),
    ])
      .then(([item, settings]) => {
        setCandidate(item);
        setScoringEnabled(settings.isScoringEnabled);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : 'Could not load cockpit.'
        )
      );
  }, [candidateId]);

  useEffect(() => {
    if (!isResizing) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
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
  const isDepartmentHead = role === 'Department Head';

  const updateState = useCallback(
    (key: string, state: SaveState) =>
      setSaveStates((current) => ({ ...current, [key]: state })),
    []
  );

  const saveAnswer = useCallback(
    async (answer: InterviewAnswer) => {
      await interviewCockpitRepository.saveAnswer(candidateId, answer);
      setCandidate((current) =>
        current
          ? {
              ...current,
              evaluationAnswers: current.evaluationAnswers.map((item) =>
                item.id === answer.id ? answer : item
              ),
            }
          : current
      );
    },
    [candidateId]
  );

  const addCustomQuestion = useCallback(async () => {
    if (terminal) return;
    updateState('custom-question', 'saving');
    try {
      const answer = await interviewCockpitRepository.addCustomQuestion(
        candidateId,
        ''
      );
      setCandidate((current) =>
        current
          ? {
              ...current,
              evaluationAnswers: [...current.evaluationAnswers, answer],
            }
          : current
      );
      updateState('custom-question', 'saved');
    } catch {
      updateState('custom-question', 'error');
    }
  }, [candidateId, terminal, updateState]);

  const updateGeneralNote = useCallback((value: string) => {
    setCandidate((current) =>
      current ? { ...current, generalNote: value } : current
    );
  }, []);

  const updateProfilePercent = useCallback((clientX: number) => {
    const bounds = splitContainerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    const next = ((clientX - bounds.left) / bounds.width) * 100;
    setProfilePercent(clampProfilePercent(next));
  }, []);

  const confirmDecision = async () => {
    if (!candidate || !decision || !isDepartmentHead || terminal) return;
    updateState('decision', 'saving');
    try {
      await interviewCockpitRepository.setStatus(candidate.id, decision);
      setCandidate({ ...candidate, status: decision });
      updateState('decision', 'saved');
      setDecision(null);
    } catch {
      updateState('decision', 'error');
    }
  };

  if (error) return <AppNotice variant="error">{error}</AppNotice>;
  if (!candidate)
    return (
      <div className="p-12 text-center text-sm font-semibold text-muted-foreground">
        Loading interview cockpit…
      </div>
    );

  const hasCustomQuestions = candidate.evaluationAnswers.some(
    (answer) => answer.isCustom
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/HeadDashboard/interviews"
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            ← Back to Recruitment Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-black text-blue-950 dark:text-blue-300">
            Interview Cockpit
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {candidate.fullName} · {candidate.studentId}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            {role}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Round 2 · {candidate.status}
          </span>
          <SaveBadge state={saveState} status={candidate.status} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl bg-card p-1 shadow-sm lg:hidden">
        <button
          type="button"
          className={cn(
            'rounded-lg py-2 text-sm font-bold',
            mobileTab === 'profile' && 'bg-blue-600 text-white'
          )}
          onClick={() => setMobileTab('profile')}
        >
          Profile
        </button>
        <button
          type="button"
          className={cn(
            'rounded-lg py-2 text-sm font-bold',
            mobileTab === 'evaluation' && 'bg-blue-600 text-white'
          )}
          onClick={() => setMobileTab('evaluation')}
        >
          Evaluation
        </button>
      </div>

      <div
        ref={splitContainerRef}
        className={cn(
          'lg:grid lg:h-[calc(100dvh-15rem)] lg:min-h-[640px] lg:items-stretch',
          isResizing && 'select-none'
        )}
        style={{
          gridTemplateColumns: `${profilePercent}fr 12px ${100 - profilePercent}fr`,
        }}
      >
        <div
          className={cn(
            'min-w-0 lg:min-h-0',
            mobileTab !== 'profile' && 'hidden lg:block'
          )}
        >
          <ProfilePanel candidate={candidate} />
        </div>

        <div
          role="separator"
          aria-label="Resize profile and evaluation panels"
          aria-orientation="vertical"
          aria-valuemin={MIN_PROFILE_PERCENT}
          aria-valuemax={MAX_PROFILE_PERCENT}
          aria-valuenow={Math.round(profilePercent)}
          tabIndex={0}
          className="group hidden cursor-col-resize touch-none items-center justify-center outline-none lg:flex"
          title="Drag to resize · Double-click to reset to 40/60"
          onDoubleClick={() => setProfilePercent(DEFAULT_PROFILE_PERCENT)}
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
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setIsResizing(false);
          }}
          onPointerCancel={() => setIsResizing(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setProfilePercent((current) => clampProfilePercent(current - 5));
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              setProfilePercent((current) => clampProfilePercent(current + 5));
            }
            if (event.key === 'Home') {
              event.preventDefault();
              setProfilePercent(DEFAULT_PROFILE_PERCENT);
            }
          }}
        >
          <span className="flex h-20 w-2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600 group-focus-visible:ring-2 group-focus-visible:ring-blue-500 dark:group-hover:bg-blue-950/40">
            <GripVertical className="h-4 w-4" />
          </span>
        </div>

        <section
          className={cn(
            'h-[calc(100dvh-13rem)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:h-auto lg:min-h-0',
            mobileTab === 'evaluation' ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-purple-600">
                  Round 2 evaluation
                </p>
                <h2 className="mt-1 text-2xl font-black text-blue-950 dark:text-blue-300">
                  Evaluation form
                </h2>
              </div>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                Department template
              </span>
            </div>

            {terminal && (
              <AppNotice variant="info" title="Evaluation closed">
                This result is final and the cockpit is now read-only.
              </AppNotice>
            )}

            <div className="mt-5 space-y-4">
              {candidate.evaluationAnswers.map((answer, index) =>
                answer.isCustom ? (
                  <CustomQuestionEditor
                    key={`${candidate.id}:${answer.id}`}
                    answer={answer}
                    disabled={terminal}
                    onSaved={saveAnswer}
                    onSaveState={(state) => updateState(answer.id, state)}
                  />
                ) : (
                  <article
                    key={`${candidate.id}:${answer.id}`}
                    className="rounded-2xl border border-border p-4"
                  >
                    <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
                      Question {index + 1}
                    </p>
                    <h3 className="mt-2 text-sm font-extrabold">
                      {answer.question}
                    </h3>
                    <AutoSaveTextarea
                      answer={answer}
                      disabled={terminal}
                      onSaved={saveAnswer}
                      onSaveState={(state) => updateState(answer.id, state)}
                    />
                    {candidate.insights.some(
                      (item) => item.questionId === answer.id
                    ) && (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="text-xs font-extrabold text-muted-foreground">
                          Team Insights
                        </p>
                        {candidate.insights
                          .filter((item) => item.questionId === answer.id)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="mt-2 rounded-xl bg-muted/50 p-3"
                            >
                              <p className="text-xs font-bold">
                                {item.author} · {item.role}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.note}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </article>
                )
              )}
            </div>

            <button
              type="button"
              disabled={terminal || saveStates['custom-question'] === 'saving'}
              onClick={() => void addCustomQuestion()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-500 px-4 py-2.5 text-sm font-bold text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-purple-950/30"
            >
              <Plus className="h-4 w-4" />
              {hasCustomQuestions
                ? 'Add Another Custom Question'
                : 'Add Custom Question'}
            </button>

            {scoringEnabled && (
              <div className="mt-5 max-w-xs rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
                <label
                  htmlFor="overall-score"
                  className="text-sm font-extrabold text-blue-950 dark:text-blue-300"
                >
                  Overall Score
                </label>
                <Input
                  id="overall-score"
                  type="number"
                  disabled={terminal}
                  defaultValue={candidate.score ?? ''}
                  onBlur={(event) => {
                    updateState('score', 'saving');
                    void interviewCockpitRepository
                      .saveScore(
                        candidate.id,
                        event.target.value === ''
                          ? null
                          : Number(event.target.value)
                      )
                      .then(() => updateState('score', 'saved'))
                      .catch(() => updateState('score', 'error'));
                  }}
                  placeholder="Enter score"
                  className="mt-2 border-blue-200 bg-card"
                />
              </div>
            )}
          </div>

          <div className="relative z-20 max-h-[48dvh] shrink-0 overflow-y-auto border-t border-border bg-card/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:p-4 lg:max-h-none lg:overflow-visible">
            <GeneralNoteEditor
              key={candidate.id}
              candidateId={candidate.id}
              initialValue={candidate.generalNote}
              disabled={terminal}
              onSaved={updateGeneralNote}
              onSaveState={(state) => updateState('general-note', state)}
            />

            <div className="mt-3 border-t border-border pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Final decision · Department Head only
                </p>
                {isDepartmentHead ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Available to your account
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted-foreground">
                    Read-only for Member
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Pending keeps the evaluation open. Pass, Fail and No Show are
                terminal.
              </p>
              <DecisionBar
                value={candidate.status}
                disabled={!isDepartmentHead || terminal}
                compact
                onChange={(status) => {
                  if (status !== 'Pending') setDecision(status);
                }}
              />
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={decision !== null}
        title={`Confirm ${decision ?? ''}`}
        description={
          decision === 'No Show'
            ? 'Mark this candidate as No Show? The result is terminal and cannot be changed.'
            : `Submit a final ${decision ?? ''} decision? Round 2 will become read-only for this candidate.`
        }
        confirmLabel={`Confirm ${decision ?? ''}`}
        variant={decision === 'Pass' ? 'default' : 'destructive'}
        onConfirm={() => void confirmDecision()}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
}

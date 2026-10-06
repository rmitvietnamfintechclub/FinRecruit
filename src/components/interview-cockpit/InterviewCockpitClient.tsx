'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  GripVertical,
  Lock,
  Plus,
  Users,
  UserRound,
} from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DecisionBar } from './DecisionBar';
import { Round2StatusBadge } from './Round2StatusBadge';
import { SaveBadge } from './SaveBadge';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type {
  CockpitUser,
  CollaborativeNote,
  InterviewAnswer,
  InterviewCandidate,
  Round2Decision,
  SaveState,
} from '@/lib/interview-cockpit/types';
import { cn } from '@/lib/utils';

const MIN_PROFILE_PERCENT = 30;
const MAX_PROFILE_PERCENT = 70;
const DEFAULT_PROFILE_PERCENT = 40;
const NOTES_SYNC_INTERVAL_MS = 2000;

function clampProfilePercent(value: number) {
  return Math.min(MAX_PROFILE_PERCENT, Math.max(MIN_PROFILE_PERCENT, value));
}

function EvaluationAnswerEditor({
  answer,
  disabled,
  scoringEnabled,
  onSaved,
  onSaveState,
}: {
  answer: InterviewAnswer;
  disabled: boolean;
  scoringEnabled: boolean;
  onSaved: (answer: InterviewAnswer) => Promise<void>;
  onSaveState: (state: SaveState) => void;
}) {
  const [draft, setDraft] = useState({
    answer: answer.answer,
    score: answer.score === null ? '' : String(answer.score),
  });
  const [scoreError, setScoreError] = useState<string | null>(null);
  const onSaveStateRef = useRef(onSaveState);

  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  const save = useCallback(
    async (nextDraft: { answer: string; score: string }) => {
      await onSaved({
        ...answer,
        answer: nextDraft.answer,
        score: nextDraft.score === '' ? null : Number(nextDraft.score),
      });
    },
    [answer, onSaved]
  );
  const state = useDebouncedSave(draft, save);

  useEffect(() => onSaveStateRef.current(state), [state]);

  return (
    <div
      className={cn(
        'mt-3 grid gap-3',
        scoringEnabled && 'sm:grid-cols-[minmax(0,1fr)_8rem]'
      )}
    >
      <Textarea
        disabled={disabled}
        value={draft.answer}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            answer: event.target.value,
          }))
        }
        placeholder="Record the candidate’s response…"
        className="disabled:bg-muted/40"
      />
      {scoringEnabled && (
        <div>
          <label
            htmlFor={`score-${answer.id}`}
            className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300"
          >
            Score
          </label>
          <Input
            id={`score-${answer.id}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
            value={draft.score}
            onChange={(event) => {
              const next = event.target.value;
              if (
                next === '' ||
                (/^\d{1,3}$/.test(next) && Number(next) <= 100)
              ) {
                setDraft((current) => ({ ...current, score: next }));
                setScoreError(null);
              } else {
                setScoreError('Use a whole number from 0 to 100.');
              }
            }}
            placeholder="0–100"
            aria-invalid={Boolean(scoreError)}
            className="mt-1.5 border-blue-200 bg-card text-center font-extrabold"
          />
          {scoreError && (
            <p className="mt-1 text-[10px] font-semibold text-red-600">
              {scoreError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function formatNoteTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function CollaborativeNotesPanel({
  candidateId,
  currentUser,
  notes,
  disabled,
  onSaved,
  onSaveState,
}: {
  candidateId: string;
  currentUser: CockpitUser;
  notes: CollaborativeNote[];
  disabled: boolean;
  onSaved: (notes: CollaborativeNote[]) => void;
  onSaveState: (state: SaveState) => void;
}) {
  const ownNote = notes.find((note) => note.authorId === currentUser.id);
  const [value, setValue] = useState(ownNote?.content ?? '');
  const onSaveStateRef = useRef(onSaveState);

  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  const save = useCallback(
    async (nextValue: string) => {
      const savedNotes = await interviewCockpitRepository.saveCollaborativeNote(
        candidateId,
        nextValue
      );
      onSaved(savedNotes);
    },
    [candidateId, onSaved]
  );
  const state = useDebouncedSave(value, save);

  useEffect(() => onSaveStateRef.current(state), [state]);

  const teammateNotes = notes.filter(
    (note) => note.authorId !== currentUser.id && note.content.trim()
  );

  return (
    <div className="mt-2 grid gap-3">
      <div className="rounded-xl border border-border bg-background/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold">
              {currentUser.name}{' '}
              <span className="font-semibold text-muted-foreground">
                ({currentUser.role})
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">Your note</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {state === 'saving'
              ? 'Saving…'
              : state === 'error'
                ? 'Save failed'
                : 'All changes saved'}
          </span>
        </div>
        <Textarea
          id="collaborative-note"
          disabled={disabled}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Record your interview insight…"
          className="mt-2 min-h-16 resize-none disabled:bg-muted/40"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Team insights
          <span className="normal-case tracking-normal">
            · syncs every 2 seconds
          </span>
        </div>
        {teammateNotes.length === 0 ? (
          <p className="mt-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            No notes from other interviewers yet.
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {teammateNotes.map((note) => (
              <article
                key={note.authorId}
                className="rounded-xl border border-border bg-background/80 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold">{note.authorName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {note.role}
                    </p>
                  </div>
                  <time className="text-[10px] text-muted-foreground">
                    {formatNoteTime(note.updatedAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">
                  {note.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedCustomQuestion({
  answer,
  disabled,
  scoringEnabled,
  onSaved,
  onSaveState,
}: {
  answer: InterviewAnswer;
  disabled: boolean;
  scoringEnabled: boolean;
  onSaved: (answer: InterviewAnswer) => Promise<void>;
  onSaveState: (state: SaveState) => void;
}) {
  return (
    <article className="rounded-2xl border border-dashed border-purple-400 bg-purple-50/40 p-4 dark:bg-purple-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:bg-purple-950 dark:text-purple-300">
          Custom · Candidate only
        </span>
        {answer.addedBy && (
          <span className="text-xs text-muted-foreground">
            Added by {answer.addedBy}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-sm font-extrabold">{answer.question}</h3>
      <EvaluationAnswerEditor
        answer={answer}
        disabled={disabled}
        scoringEnabled={scoringEnabled}
        onSaved={onSaved}
        onSaveState={onSaveState}
      />
    </article>
  );
}

function CustomQuestionComposer({
  onCreate,
  onCancel,
}: {
  onCreate: (question: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!question.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(question.trim());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not create the custom question.'
      );
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-dashed border-purple-400 bg-purple-50/40 p-4 dark:bg-purple-950/20">
      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:bg-purple-950 dark:text-purple-300">
        New custom question · Candidate only
      </span>
      <label
        htmlFor="new-custom-question"
        className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
      >
        Question
      </label>
      <Input
        id="new-custom-question"
        autoFocus
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Type the custom question…"
        className="mt-2 h-11 border-purple-200 bg-card"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        After creation, this question is shared with authorized interviewers for
        this candidate and its response can be recorded like a template
        question.
      </p>
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={!question.trim() || saving}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          {saving ? 'Saving…' : 'Add question'}
        </Button>
      </div>
    </article>
  );
}

function OverallScoreSummary({
  score,
  answers,
}: {
  score: number | null;
  answers: InterviewAnswer[];
}) {
  const scoredCount = answers.filter((answer) => answer.score !== null).length;
  const displayScore =
    score === null
      ? 'Not scored'
      : Number.isInteger(score)
        ? String(score)
        : score.toFixed(2);

  return (
    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
        Computed Overall Score
      </p>
      <p className="mt-1 text-2xl font-black text-blue-950 dark:text-blue-100">
        {displayScore}
        {score !== null && (
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {' '}
            / 100
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Average of {scoredCount} scored{' '}
        {scoredCount === 1 ? 'question' : 'questions'}. Unscored questions are
        excluded.
      </p>
    </div>
  );
}

function ProfilePanel({ candidate }: { candidate: InterviewCandidate }) {
  const details = [
    ['Major & year', candidate.majorAndYear],
    ['Phone', candidate.phone],
    ['Interview slot', candidate.interviewSlot],
    [
      'Cohort',
      [candidate.semester, candidate.generation].filter(Boolean).join(' · '),
    ],
  ].filter(([, value]) => Boolean(value));

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
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-blue-950 dark:text-blue-300">
                {candidate.fullName}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {[candidate.studentId, candidate.department]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {candidate.email}
              </p>
            </div>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase">
          <Lock className="h-3 w-3" /> Read-only
        </span>
      </div>
      {details.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}
      {(candidate.facebookLink || candidate.cvLink) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {candidate.facebookLink && (
            <a
              href={candidate.facebookLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
            >
              Facebook <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {candidate.cvLink && (
            <a
              href={candidate.cvLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"
            >
              View CV <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
      <h3 className="mt-7 text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
        General questions
      </h3>
      <div className="mt-3 space-y-3">
        {candidate.generalAnswers.length === 0 && (
          <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            No general answers were returned by the API.
          </p>
        )}
        {candidate.generalAnswers.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3">
            <p className="text-sm font-bold">{item.question}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
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
          Current interview: {candidate.department}
        </p>
        {candidate.departmentAnswers.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No department answers were returned by the API.
          </p>
        )}
        {candidate.departmentAnswers.map((item) => (
          <div key={item.id} className="mt-3">
            <p className="text-sm font-bold">{item.question}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InterviewCockpitClient({
  candidateId,
  currentUser,
}: {
  candidateId: string;
  currentUser: CockpitUser;
}) {
  const [candidate, setCandidate] = useState<InterviewCandidate | null>(null);
  const candidateRef = useRef<InterviewCandidate | null>(null);
  const [mobileTab, setMobileTab] = useState<'profile' | 'evaluation'>(
    'profile'
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [decision, setDecision] = useState<Round2Decision | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCustomComposer, setShowCustomComposer] = useState(false);
  const [profilePercent, setProfilePercent] = useState(DEFAULT_PROFILE_PERCENT);
  const [isResizing, setIsResizing] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void interviewCockpitRepository
      .getCandidate(candidateId)
      .then((item) => {
        candidateRef.current = item;
        setCandidate(item);
      })
      .catch((cause: unknown) =>
        setLoadError(
          cause instanceof Error ? cause.message : 'Could not load cockpit.'
        )
      );
  }, [candidateId]);

  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    const syncNotes = async () => {
      if (requestInFlight || document.visibilityState !== 'visible') {
        return;
      }

      requestInFlight = true;
      try {
        const collaborativeNotes =
          await interviewCockpitRepository.getCollaborativeNotes(candidateId);
        if (!active) return;
        setCandidate((current) =>
          current ? { ...current, collaborativeNotes } : current
        );
      } catch {
        // Keep the last successful snapshot. The next interval retries without
        // interrupting any local draft currently being typed.
      } finally {
        requestInFlight = false;
      }
    };

    const interval = window.setInterval(
      () => void syncNotes(),
      NOTES_SYNC_INTERVAL_MS
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
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
  const isDepartmentHead = currentUser.role === 'Department Head';

  const updateState = useCallback(
    (key: string, state: SaveState) =>
      setSaveStates((current) => ({ ...current, [key]: state })),
    []
  );

  const saveTemplateAnswer = useCallback(
    async (answer: InterviewAnswer) => {
      const current = candidateRef.current;
      if (!current) return;
      const nextAnswers = current.evaluationAnswers.map((item) =>
        item.id === answer.id ? answer : item
      );
      const optimistic = { ...current, evaluationAnswers: nextAnswers };
      candidateRef.current = optimistic;
      setCandidate(optimistic);

      const result = await interviewCockpitRepository.saveTemplateAnswers(
        candidateId,
        nextAnswers
      );
      setCandidate((latest) => {
        if (!latest) return latest;
        const updated = {
          ...latest,
          evaluationAnswers: result.answers,
          score: result.overallScore,
        };
        candidateRef.current = updated;
        return updated;
      });
    },
    [candidateId]
  );

  const saveCustomAnswer = useCallback(
    async (answer: InterviewAnswer) => {
      const current = candidateRef.current;
      if (!current) return;
      const nextAnswers = current.adHocQuestions.map((item) =>
        item.id === answer.id ? answer : item
      );
      const optimistic = { ...current, adHocQuestions: nextAnswers };
      candidateRef.current = optimistic;
      setCandidate(optimistic);

      const result = await interviewCockpitRepository.saveCustomAnswers(
        candidateId,
        nextAnswers
      );
      setCandidate((latest) => {
        if (!latest) return latest;
        const updated = {
          ...latest,
          adHocQuestions: result.answers,
          score: result.overallScore,
        };
        candidateRef.current = updated;
        return updated;
      });
    },
    [candidateId]
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
        setCandidate((current) => {
          if (!current) return current;
          const updated = { ...current, adHocQuestions };
          candidateRef.current = updated;
          return updated;
        });
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

  const updateCollaborativeNotes = useCallback(
    (collaborativeNotes: CollaborativeNote[]) => {
      setCandidate((current) =>
        current ? { ...current, collaborativeNotes } : current
      );
    },
    []
  );

  const evaluatedAnswers = useMemo(
    () => [
      ...(candidate?.evaluationAnswers ?? []),
      ...(candidate?.adHocQuestions ?? []),
    ],
    [candidate?.adHocQuestions, candidate?.evaluationAnswers]
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
      setCandidate({
        ...candidate,
        status: result.status,
        selectedDecision: result.decision,
      });
      updateState('decision', 'saved');
      setDecision(null);
    } catch (cause) {
      updateState('decision', 'error');
      setActionError(
        cause instanceof Error ? cause.message : 'Could not save decision.'
      );
    }
  };

  if (loadError) return <AppNotice variant="error">{loadError}</AppNotice>;
  if (!candidate)
    return (
      <div className="p-12 text-center text-sm font-semibold text-muted-foreground">
        Loading interview cockpit…
      </div>
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
            {currentUser.role}
          </span>
          {candidate.status !== 'Pending' && (
            <Round2StatusBadge status={candidate.status} />
          )}
          <SaveBadge state={saveState} />
        </div>
      </div>

      {actionError && (
        <div className="mb-4">
          <AppNotice variant="error">{actionError}</AppNotice>
        </div>
      )}

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
                Answers and notes are read-only after a decision. A Department
                Head can still change the decision below after confirmation.
              </AppNotice>
            )}

            <div className="mt-5 space-y-4">
              {candidate.evaluationAnswers.length === 0 && (
                <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                  No template questions were returned for this department and
                  cohort.
                </p>
              )}
              {candidate.evaluationAnswers.map((answer, index) => (
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
                  <EvaluationAnswerEditor
                    answer={answer}
                    disabled={terminal}
                    scoringEnabled={candidate.isScoringEnabled}
                    onSaved={saveTemplateAnswer}
                    onSaveState={(state) => updateState(answer.id, state)}
                  />
                </article>
              ))}

              {candidate.adHocQuestions.map((answer) => (
                <SavedCustomQuestion
                  key={`${candidate.id}:${answer.id}`}
                  answer={answer}
                  disabled={terminal}
                  scoringEnabled={candidate.isScoringEnabled}
                  onSaved={saveCustomAnswer}
                  onSaveState={(state) => updateState(answer.id, state)}
                />
              ))}

              {showCustomComposer && !terminal && (
                <CustomQuestionComposer
                  onCreate={createCustomQuestion}
                  onCancel={() => setShowCustomComposer(false)}
                />
              )}
            </div>

            <button
              type="button"
              disabled={terminal || showCustomComposer}
              onClick={() => setShowCustomComposer(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-500 px-4 py-2.5 text-sm font-bold text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-purple-950/30"
            >
              <Plus className="h-4 w-4" />
              {candidate.adHocQuestions.length > 0
                ? 'Add Another Custom Question'
                : 'Add Custom Question'}
            </button>

            {candidate.isScoringEnabled && (
              <OverallScoreSummary
                score={candidate.score}
                answers={evaluatedAnswers}
              />
            )}
          </div>

          <div className="relative z-20 max-h-[52dvh] shrink-0 overflow-y-auto border-t border-border bg-card/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur sm:p-4 lg:max-h-[50%]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Collaborative Notes · One note per interviewer
              </p>
              <span className="text-[10px] font-semibold text-muted-foreground">
                Auto-save
              </span>
            </div>
            <CollaborativeNotesPanel
              key={`${candidate.id}:${currentUser.id}`}
              candidateId={candidate.id}
              currentUser={currentUser}
              notes={candidate.collaborativeNotes}
              disabled={terminal}
              onSaved={updateCollaborativeNotes}
              onSaveState={(state) => updateState('collaborative-note', state)}
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
                Choose Pass, Fail or No Show. No Show is recorded as Fail. An
                existing decision can be changed, and every change requires
                confirmation.
              </p>
              <DecisionBar
                value={candidate.selectedDecision}
                disabled={!isDepartmentHead}
                compact
                onChange={setDecision}
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
            ? 'No Show will be recorded as Fail. Apply this decision? You can change it later, but each change requires confirmation.'
            : `Apply ${decision ?? ''} to this candidate? You can change the decision later, but each change requires confirmation.`
        }
        confirmLabel={`Confirm ${decision ?? ''}`}
        variant={decision === 'Pass' ? 'default' : 'destructive'}
        onConfirm={() => void confirmDecision()}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
}

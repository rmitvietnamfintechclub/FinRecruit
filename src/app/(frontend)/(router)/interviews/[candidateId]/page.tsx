'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useDashboardTheme } from '@/hooks/use-dashboard-theme';

type Answer = { question: string; answer: string };
type Evaluation = {
  templateAnswers: Answer[];
  adHocQuestions: Answer[];
  notes: { note1: string; note2: string; note3: string };
  score: number | null;
};
type CandidateDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  generation: string;
  semester: string;
  cvLink: string;
  generalAnswers: Answer[];
  customAnswers: Answer[];
  personalInformation?: {
    dob: string;
    majorAndYear: string;
    facebookLink: string;
  };
  round2Status?: 'Pending' | 'Pass' | 'Fail' | 'No Show';
  round2Evaluation: Evaluation;
};
type DetailResponse = {
  success: boolean;
  message?: string;
  candidate?: CandidateDetail;
  meta?: {
    interviewQuestions?: string[];
    isScoringEnabled?: boolean;
    isRound2Locked?: boolean;
    permissions?: { canFinalizeRound2?: boolean };
  };
};
type EvaluationChanges = Partial<Evaluation> & {
  note1?: string;
  note2?: string;
  note3?: string;
  finalStatus?: 'Pass' | 'Fail' | 'No Show';
};
type FinalAction = 'Pass' | 'Fail' | 'No Show';

const emptyEvaluation: Evaluation = {
  templateAnswers: [],
  adHocQuestions: [],
  notes: { note1: '', note2: '', note3: '' },
  score: null,
};

export default function InterviewCockpitPage() {
  const params = useParams<{ candidateId: string }>();
  const themeReady = useDashboardTheme();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [isRound2Locked, setIsRound2Locked] = useState(false);
  const [canFinalizeRound2, setCanFinalizeRound2] = useState(false);
  const [tab, setTab] = useState<'profile' | 'evaluation'>('evaluation');
  const [evaluation, setEvaluation] = useState<Evaluation>(emptyEvaluation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFinalAction, setPendingFinalAction] = useState<FinalAction | null>(null);

  useEffect(() => {
    if (themeReady) {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, [themeReady]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/head-dashboard/candidates/${params.candidateId}`, {
      credentials: 'include',
    });
    const json = (await response.json()) as DetailResponse;
    if (!response.ok || !json.success || !json.candidate) {
      throw new Error(json.message ?? 'Unable to load the interview cockpit.');
    }
    setCandidate(json.candidate);
    setQuestions(json.meta?.interviewQuestions ?? []);
    setScoringEnabled(Boolean(json.meta?.isScoringEnabled));
    setIsRound2Locked(Boolean(json.meta?.isRound2Locked));
    setCanFinalizeRound2(Boolean(json.meta?.permissions?.canFinalizeRound2));
    setEvaluation({
      ...emptyEvaluation,
      ...json.candidate.round2Evaluation,
      notes: { ...emptyEvaluation.notes, ...json.candidate.round2Evaluation?.notes },
    });
  }, [params.candidateId]);

  useEffect(() => {
    void load().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load the interview cockpit.');
    });
  }, [load]);

  const save = useCallback(
    async (changes: EvaluationChanges) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/interviews/${params.candidateId}/evaluation`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(changes),
        });
        const json = (await response.json()) as {
          success: boolean;
          message?: string;
          candidate?: { round2Status: CandidateDetail['round2Status']; round2Evaluation: Evaluation };
        };
        if (!response.ok || !json.success) throw new Error(json.message ?? 'Could not save evaluation.');
        if (json.candidate) {
          setCandidate((current) =>
            current
              ? {
                  ...current,
                  round2Status: json.candidate?.round2Status,
                  round2Evaluation: json.candidate?.round2Evaluation ?? current.round2Evaluation,
                }
              : current
          );
        }
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : 'Could not save evaluation.');
      } finally {
        setSaving(false);
      }
    },
    [params.candidateId]
  );

  const templateAnswers = useMemo(
    () =>
      questions.map((question) => ({
        question,
        answer: evaluation.templateAnswers.find((item) => item.question === question)?.answer ?? '',
      })),
    [evaluation.templateAnswers, questions]
  );

  if (error && !candidate) {
    return <main className="flex min-h-screen items-center justify-center p-6 text-sm text-red-600">{error}</main>;
  }
  if (!candidate) {
    return <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">Loading cockpit…</main>;
  }

  const updateNote = (key: keyof Evaluation['notes'], value: string) => {
    const next = { ...evaluation, notes: { ...evaluation.notes, [key]: value } };
    setEvaluation(next);
    window.setTimeout(
      () =>
        void save({
          note1: next.notes.note1,
          note2: next.notes.note2,
          note3: next.notes.note3,
        }),
      700
    );
  };

  const updateTemplateAnswer = (question: string, answer: string) => {
    const nextAnswers = templateAnswers.map((item) =>
      item.question === question ? { ...item, answer } : item
    );
    const next = { ...evaluation, templateAnswers: nextAnswers };
    setEvaluation(next);
    window.setTimeout(() => void save({ templateAnswers: nextAnswers }), 700);
  };

  const profile = candidate.personalInformation ?? {
    dob: '—',
    majorAndYear: '—',
    facebookLink: '',
  };

  const confirmFinalAction = async () => {
    if (!pendingFinalAction) return;
    const action = pendingFinalAction;
    setPendingFinalAction(null);
    await save({ finalStatus: action });
  };

  const toggleDarkMode = () => {
    setIsDarkMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b border-border bg-card px-4 py-3 shadow-sm transition-colors duration-300 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/ftc_logo.png" alt="FinTech Club" width={34} height={34} className="size-8 rounded-md" />
            <h1 className="truncate text-base font-black text-blue-900 dark:text-blue-400 sm:text-lg">Interview Cockpit</h1>
          </div>
          <div className="hidden items-center rounded-xl border border-border bg-background p-1 shadow-sm sm:flex">
            <span className="rounded-lg border border-purple-500 px-5 py-1.5 text-xs font-black text-purple-600">Recruitment</span>
            <span className="px-5 py-1.5 text-xs font-bold text-muted-foreground">Members</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <strong className="block text-xs font-bold">Department Head</strong>
              <small className="text-[10px] text-muted-foreground">{candidate.department}</small>
            </span>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon'}`} aria-hidden />
            </button>
            <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {candidate.fullName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4 sm:p-6">
        <Link href="/HeadDashboard" className="w-fit rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40">
          <i className="fa-solid fa-arrow-left mr-2" /> Back to Recruitment Dashboard
        </Link>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Digital interview cockpit</p>
          {saving ? <span className="text-xs font-semibold text-muted-foreground">Saving changes…</span> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">All changes saved</span>}
        </div>

        <div className="grid grid-cols-2 rounded-xl border border-border bg-card p-1 shadow-sm lg:hidden">
          {(['profile', 'evaluation'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-lg px-3 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
          <section className={`${tab === 'evaluation' ? 'hidden lg:block' : ''} rounded-2xl border border-border bg-card p-5 shadow-sm`}>
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Candidate profile</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><i className="fa-solid fa-user" /></div>
                  <div>
                    <h2 className="text-lg font-black">{candidate.fullName}</h2>
                    <p className="text-xs text-muted-foreground">{candidate.email} · {candidate.department}</p>
                  </div>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-[9px] font-black uppercase text-muted-foreground"><i className="fa-solid fa-lock mr-1" /> Read-only</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Round 2</p>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                candidate.round2Status === 'Pass'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : candidate.round2Status === 'Fail'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : candidate.round2Status === 'No Show'
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
              }`}>Round 2 · {candidate.round2Status ?? 'Pending'}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {[
                ['Date of birth', profile.dob],
                ['Phone', candidate.phone],
                ['Major & year', profile.majorAndYear],
                ['CV / Portfolio', candidate.cvLink ? 'View CV' : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
                  {label === 'CV / Portfolio' && candidate.cvLink ? <a className="mt-1 block font-bold text-blue-600 dark:text-blue-400" href={candidate.cvLink} target="_blank" rel="noreferrer">{value} <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" /></a> : <p className="mt-1 font-bold text-foreground">{value}</p>}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Application answers</p>
              {[...candidate.generalAnswers, ...candidate.customAnswers].map((item, index) => (
                <article key={`${item.question}-${index}`} className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[10px] font-bold text-muted-foreground">{item.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{item.answer || '—'}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={`${tab === 'profile' ? 'hidden lg:block' : ''} space-y-4`}>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Round 2 evaluation</p>
                  <h2 className="text-xl font-black">Evaluation form</h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Active</span>
              </div>
              <div className="mt-5 space-y-4">
                {isRound2Locked ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    Round 2 is locked. Evaluation is read-only.
                  </p>
                ) : null}
                {templateAnswers.map((item, index) => (
                  <div key={item.question} className="rounded-xl border border-border p-3">
                    <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">Question {index + 1}</p>
                    <p className="mt-1 text-sm font-bold">{item.question}</p>
                    <textarea
                      value={item.answer}
                      disabled={isRound2Locked}
                      onChange={(event) => updateTemplateAnswer(item.question, event.target.value)}
                      placeholder="Record the candidate's response..."
                      className="bg-background text-foreground placeholder:text-muted-foreground mt-3 min-h-24 w-full rounded-xl border border-input p-3 text-sm outline-none focus:border-purple-500 disabled:cursor-not-allowed disabled:bg-muted"
                    />
                    <p className="mt-3 text-[10px] font-black text-muted-foreground"><i className="fa-solid fa-users mr-1" /> Team insights</p>
                    <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Shared notes from interviewers appear here.</div>
                  </div>
                ))}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black">Custom questions</h3>
                    <button
                      type="button"
                      disabled={isRound2Locked}
                      onClick={() => {
                        const next = [...evaluation.adHocQuestions, { question: '', answer: '' }];
                        setEvaluation({ ...evaluation, adHocQuestions: next });
                        void save({ adHocQuestions: next });
                      }}
                      className="rounded-lg border border-dashed border-purple-400 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                    >
                      + Add custom question
                    </button>
                  </div>
                  {evaluation.adHocQuestions.map((item, index) => (
                    <div key={index} className="mt-3 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/20">
                      <input
                        value={item.question}
                        disabled={isRound2Locked}
                        onChange={(event) => {
                          const next = [...evaluation.adHocQuestions];
                          next[index] = { ...next[index], question: event.target.value };
                          setEvaluation({ ...evaluation, adHocQuestions: next });
                        }}
                        placeholder="Custom question"
                        className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-purple-500 disabled:bg-muted"
                      />
                      <textarea
                        value={item.answer}
                        disabled={isRound2Locked}
                        onChange={(event) => {
                          const next = [...evaluation.adHocQuestions];
                          next[index] = { ...next[index], answer: event.target.value };
                          setEvaluation({ ...evaluation, adHocQuestions: next });
                          window.setTimeout(() => void save({ adHocQuestions: next }), 700);
                        }}
                        placeholder="Answer"
                        className="mt-2 min-h-20 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-purple-500 disabled:bg-muted"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <label className="block">
                <span className="text-xs font-black text-foreground">General notes</span>
                <textarea disabled={isRound2Locked} value={evaluation.notes.note1} onChange={(event) => updateNote('note1', event.target.value)} placeholder="Any additional observations..." className="mt-2 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-purple-500 disabled:bg-muted" />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              {scoringEnabled ? (
                <label className="flex items-center gap-2 text-sm font-bold">
                  Score
                  <input
                    type="number"
                    disabled={isRound2Locked}
                    min="0"
                    max="10"
                    value={evaluation.score ?? ''}
                    onChange={(event) => {
                      const score = event.target.value === '' ? null : Number(event.target.value);
                      setEvaluation({ ...evaluation, score });
                      void save({ score });
                    }}
                    className="w-20 rounded-lg border border-input bg-background p-2 text-foreground outline-none focus:border-purple-500 disabled:bg-muted"
                  />
                  / 10
                </label>
              ) : <span className="text-xs text-muted-foreground">Numeric scoring is disabled for this department.</span>}
              {canFinalizeRound2 ? (
                <div className="flex w-full gap-3 sm:w-auto">
                  <button type="button" disabled={isRound2Locked} onClick={() => setPendingFinalAction('Fail')} className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60">Fail</button>
                  <button type="button" disabled={isRound2Locked} onClick={() => setPendingFinalAction('No Show')} className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700 hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/60">No Show</button>
                  <button type="button" disabled={isRound2Locked} onClick={() => setPendingFinalAction('Pass')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600">Pass</button>
                </div>
              ) : null}
            </div>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={pendingFinalAction !== null}
        title={`Confirm ${pendingFinalAction ?? ''} decision`}
        description={
          <>
            Are you sure you want to mark{' '}
            <span className="font-semibold text-foreground">{candidate.fullName}</span>{' '}
            as{' '}
            <span
              className={
                pendingFinalAction === 'Pass'
                  ? 'font-semibold text-emerald-600'
                  : 'font-semibold text-red-600'
              }
            >
              {pendingFinalAction ?? ''}
            </span>
            ? This decision will update the Round 2 evaluation status.
          </>
        }
        confirmLabel={`Confirm ${pendingFinalAction ?? ''}`}
        cancelLabel="Cancel"
        variant={pendingFinalAction === 'Fail' ? 'destructive' : 'default'}
        onConfirm={() => void confirmFinalAction()}
        onCancel={() => setPendingFinalAction(null)}
        loading={saving}
      />
    </main>
  );
}

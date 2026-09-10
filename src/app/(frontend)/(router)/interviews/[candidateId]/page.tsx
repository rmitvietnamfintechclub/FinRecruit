'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

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
  round2Status?: 'Pending' | 'Pass' | 'Fail';
  round2Evaluation: Evaluation;
};
type DetailResponse = {
  success: boolean;
  message?: string;
  candidate?: CandidateDetail;
  meta?: { interviewQuestions?: string[]; isScoringEnabled?: boolean };
};
type EvaluationChanges = Partial<Evaluation> & {
  note1?: string;
  note2?: string;
  note3?: string;
  finalStatus?: 'Pass' | 'Fail';
};
type FinalAction = 'Pass' | 'Fail';

const emptyEvaluation: Evaluation = {
  templateAnswers: [],
  adHocQuestions: [],
  notes: { note1: '', note2: '', note3: '' },
  score: null,
};

export default function InterviewCockpitPage() {
  const params = useParams<{ candidateId: string }>();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [tab, setTab] = useState<'profile' | 'evaluation'>('evaluation');
  const [evaluation, setEvaluation] = useState<Evaluation>(emptyEvaluation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFinalAction, setPendingFinalAction] = useState<FinalAction | null>(null);

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
        const json = (await response.json()) as { success: boolean; message?: string };
        if (!response.ok || !json.success) throw new Error(json.message ?? 'Could not save evaluation.');
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

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/ftc_logo.png" alt="FinTech Club" width={34} height={34} className="size-8 rounded-md" />
            <h1 className="truncate text-base font-black text-blue-950 sm:text-lg">Interview Cockpit</h1>
          </div>
          <div className="hidden items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:flex">
            <span className="rounded-lg border border-purple-500 px-5 py-1.5 text-xs font-black text-purple-600">Recruitment</span>
            <span className="px-5 py-1.5 text-xs font-bold text-slate-500">Members</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <strong className="block text-xs font-bold">Department Head</strong>
              <small className="text-[10px] text-slate-400">{candidate.department}</small>
            </span>
            <div className="flex size-9 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-600">
              {candidate.fullName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4 sm:p-6">
        <Link href="/HeadDashboard" className="w-fit rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50">
          <i className="fa-solid fa-arrow-left mr-2" /> Back to Recruitment Dashboard
        </Link>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Digital interview cockpit</p>
          {saving ? <span className="text-xs font-semibold text-slate-500">Saving changes…</span> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">All changes saved</span>}
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-white p-1 shadow-sm lg:hidden">
          {(['profile', 'evaluation'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-lg px-3 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
          <section className={`${tab === 'evaluation' ? 'hidden lg:block' : ''} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Candidate profile</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600"><i className="fa-solid fa-user" /></div>
                  <div>
                    <h2 className="text-lg font-black">{candidate.fullName}</h2>
                    <p className="text-xs text-slate-400">{candidate.email} · {candidate.department}</p>
                  </div>
                </div>
              </div>
              <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-500"><i className="fa-solid fa-lock mr-1" /> Read-only</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Round 2</p>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-[10px] font-black uppercase text-yellow-700">Round 2 · {candidate.round2Status ?? 'Pending'}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {[
                ['Date of birth', profile.dob],
                ['Phone', candidate.phone],
                ['Major & year', profile.majorAndYear],
                ['CV / Portfolio', candidate.cvLink ? 'View CV' : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                  {label === 'CV / Portfolio' && candidate.cvLink ? <a className="mt-1 block font-bold text-blue-600" href={candidate.cvLink} target="_blank" rel="noreferrer">{value} <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" /></a> : <p className="mt-1 font-bold text-slate-700">{value}</p>}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Application answers</p>
              {[...candidate.generalAnswers, ...candidate.customAnswers].map((item, index) => (
                <article key={`${item.question}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500">{item.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{item.answer || '—'}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={`${tab === 'profile' ? 'hidden lg:block' : ''} space-y-4`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Round 2 evaluation</p>
                  <h2 className="text-xl font-black">Evaluation form</h2>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Active</span>
              </div>
              <div className="mt-5 space-y-4">
                {templateAnswers.map((item, index) => (
                  <div key={item.question} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-[10px] font-black uppercase text-purple-600">Question {index + 1}</p>
                    <p className="mt-1 text-sm font-bold">{item.question}</p>
                    <textarea
                      value={item.answer}
                      onChange={(event) => updateTemplateAnswer(item.question, event.target.value)}
                      placeholder="Record the candidate's response..."
                      className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-purple-500"
                    />
                    <p className="mt-3 text-[10px] font-black text-slate-500"><i className="fa-solid fa-users mr-1" /> Team insights</p>
                    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Shared notes from interviewers appear here.</div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black">Custom questions</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...evaluation.adHocQuestions, { question: '', answer: '' }];
                        setEvaluation({ ...evaluation, adHocQuestions: next });
                        void save({ adHocQuestions: next });
                      }}
                      className="rounded-lg border border-dashed border-purple-400 px-3 py-2 text-xs font-bold text-purple-700"
                    >
                      + Add custom question
                    </button>
                  </div>
                  {evaluation.adHocQuestions.map((item, index) => (
                    <div key={index} className="mt-3 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 p-3">
                      <input
                        value={item.question}
                        onChange={(event) => {
                          const next = [...evaluation.adHocQuestions];
                          next[index] = { ...next[index], question: event.target.value };
                          setEvaluation({ ...evaluation, adHocQuestions: next });
                        }}
                        placeholder="Custom question"
                        className="w-full rounded-lg border p-2 text-sm"
                      />
                      <textarea
                        value={item.answer}
                        onChange={(event) => {
                          const next = [...evaluation.adHocQuestions];
                          next[index] = { ...next[index], answer: event.target.value };
                          setEvaluation({ ...evaluation, adHocQuestions: next });
                          window.setTimeout(() => void save({ adHocQuestions: next }), 700);
                        }}
                        placeholder="Answer"
                        className="mt-2 min-h-20 w-full rounded-lg border p-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block">
                <span className="text-xs font-black text-slate-600">General notes</span>
                <textarea value={evaluation.notes.note1} onChange={(event) => updateNote('note1', event.target.value)} placeholder="Any additional observations..." className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-purple-500" />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {scoringEnabled ? (
                <label className="flex items-center gap-2 text-sm font-bold">
                  Score
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={evaluation.score ?? ''}
                    onChange={(event) => {
                      const score = event.target.value === '' ? null : Number(event.target.value);
                      setEvaluation({ ...evaluation, score });
                      void save({ score });
                    }}
                    className="w-20 rounded-lg border p-2"
                  />
                  / 10
                </label>
              ) : <span className="text-xs text-slate-500">Numeric scoring is disabled for this department.</span>}
              <div className="flex w-full gap-3 sm:w-auto">
                <button type="button" onClick={() => setPendingFinalAction('Fail')} className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700">Fail</button>
                <button type="button" disabled className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700 disabled:cursor-not-allowed disabled:opacity-80">No Show</button>
                <button type="button" onClick={() => setPendingFinalAction('Pass')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Pass</button>
              </div>
            </div>
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
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

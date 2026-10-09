'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type TemplateResponse = {
  success: boolean;
  message?: string;
  questions?: string[];
  cohort?: { generation: string; semester: string };
};

export default function QuestionTemplatePage() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<string[]>([]);
  const [cohort, setCohort] = useState<TemplateResponse['cohort']>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/head-dashboard/question-template', { credentials: 'include' })
      .then(async (response) => {
        const json = (await response.json()) as TemplateResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.message ?? 'Unable to load the question template.');
        }
        if (!active) return;
        const loaded = json.questions ?? [];
        setQuestions(loaded);
        setSavedQuestions(loaded);
        setCohort(json.cohort);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load the question template.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/head-dashboard/question-template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questions }),
      });
      const json = (await response.json()) as TemplateResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? 'Unable to save the question template.');
      }
      const next = json.questions ?? questions;
      setQuestions(next);
      setSavedQuestions(next);
      setMessage('Question template saved and applied to the interview cockpit.');
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the question template.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setQuestions(savedQuestions);
    setMessage(null);
    setError(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <Link href="/HeadDashboard" className="font-bold text-blue-700 hover:underline">
          <i className="fa-solid fa-arrow-left mr-2" />
          Back to Candidate Evaluation
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.18em]">
              Question template
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Interview Question Template
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Define the standard questions used in the Digital Cockpit for all candidates.
            </p>
          </div>
          {cohort ? (
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {cohort.semester} · {cohort.generation}
            </span>
          ) : null}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading questions…</p>
        ) : (
          <>
            <div className="mt-5 space-y-2 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
              {questions.map((question, index) => (
                <div
                  key={`${index}-${question}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
                >
                  <span className="cursor-grab text-muted-foreground" aria-hidden>
                    <i className="fa-solid fa-grip-vertical" />
                  </span>
                  <span className="shrink-0 rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black uppercase text-purple-600">
                    Question {index + 1}
                  </span>
                  <input
                    value={question}
                    onChange={(event) => {
                      const next = [...questions];
                      next[index] = event.target.value;
                      setQuestions(next);
                    }}
                    placeholder="Please enter the question..."
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                    aria-label={`Question ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => setQuestions(questions.filter((_, itemIndex) => itemIndex !== index))}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-red-600"
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQuestions([...questions, ''])}
                className="mt-2 rounded-xl border border-purple-400 px-4 py-2 text-sm font-bold text-purple-700 transition-colors hover:bg-purple-50"
              >
                <i className="fa-solid fa-plus mr-2" />
                Add question
              </button>
            </div>

            {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save & Apply'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  SortableQuestionList,
  type DraftInterviewQuestion,
} from './SortableQuestionList';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type { InterviewSettings } from '@/lib/interview-cockpit/types';

type InterviewSettingsDraft = Omit<InterviewSettings, 'questions'> & {
  questions: DraftInterviewQuestion[];
};

function toDraft(settings: InterviewSettings): InterviewSettingsDraft {
  return {
    ...settings,
    questions: settings.questions.map((text) => ({
      id: crypto.randomUUID(),
      text,
    })),
  };
}

export function InterviewSettingsClient() {
  const [settings, setSettings] = useState<InterviewSettingsDraft | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    void interviewCockpitRepository
      .getSettings()
      .then((result) => setSettings(toDraft(result)))
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not load interview settings.'
        )
      );
  }, []);

  if (error && !settings) return <AppNotice variant="error">{error}</AppNotice>;
  if (!settings)
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading settings…
      </p>
    );

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const result = await interviewCockpitRepository.saveSettings({
        ...settings,
        questions: settings.questions.map((question) => question.text),
      });
      setSettings(toDraft(result));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save interview settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saved && (
        <AppNotice variant="success" title="Configuration saved">
          Questions and scoring were saved through the Team02 department
          configuration API.
        </AppNotice>
      )}
      {error && <AppNotice variant="error">{error}</AppNotice>}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-purple-600">
          Department configuration
        </p>
        <h1 className="mt-1 text-3xl font-black text-blue-950 dark:text-blue-300">
          Interview Question Template
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Define standard questions and choose whether interviewers can score
          each Round 2 question.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Department', settings.department],
              ['Generation', settings.generation],
              ['Semester', settings.semester],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {value || 'Not returned by current API'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {settings.questions.length > 1 && (
              <p
                id="question-reorder-help"
                className="text-xs font-semibold text-muted-foreground"
              >
                Drag the six-dot handle to reorder questions. When the handle is
                focused, you can also use the Up and Down arrow keys.
              </p>
            )}
            {settings.questions.length === 0 && (
              <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                No interview questions are available yet.
              </p>
            )}
            <SortableQuestionList
              questions={settings.questions}
              disabled={saving}
              onDraggingChange={setIsReordering}
              onChange={(questions) => {
                setSettings({ ...settings, questions });
                setSaved(false);
              }}
            />
          </div>
          <Button
            type="button"
            disabled={saving || isReordering}
            onClick={() => {
              setSettings({
                ...settings,
                questions: [
                  ...settings.questions,
                  { id: crypto.randomUUID(), text: '' },
                ],
              });
              setSaved(false);
            }}
            variant="outline"
            className="mt-4 h-10 border-blue-300 px-4 font-bold text-blue-700"
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>
        </section>
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Optional Numeric Scoring</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, a score field appears beside every template and
                additional question.
              </p>
            </div>
            <Switch
              disabled={saving || isReordering}
              checked={settings.isScoringEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, isScoringEnabled: checked })
              }
            />
          </div>
          <div className="mt-5 rounded-xl bg-muted/50 p-4 text-sm">
            <p className="font-extrabold">
              Current state: {settings.isScoringEnabled ? 'ON' : 'OFF'}
            </p>
            <p className="mt-2 text-muted-foreground">
              Each scored question accepts a whole number from 0 to 100. Overall
              Score is calculated automatically from scored questions only;
              unanswered score fields are excluded from the average.
            </p>
          </div>
        </aside>
      </div>
      <div className="flex justify-stretch sm:justify-end">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || isReordering}
          className="h-11 w-full bg-blue-900 px-6 font-extrabold text-white shadow-sm hover:bg-blue-800 sm:w-auto"
        >
          {saving ? 'Saving…' : 'Save & Apply'}
        </Button>
      </div>
    </div>
  );
}

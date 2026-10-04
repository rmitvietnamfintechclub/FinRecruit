'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type { InterviewSettings } from '@/lib/interview-cockpit/types';

export function InterviewSettingsClient() {
  const [settings, setSettings] = useState<InterviewSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void interviewCockpitRepository.getSettings().then(setSettings);
  }, []);
  if (!settings)
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading settings…
      </p>
    );
  const save = async () => {
    await interviewCockpitRepository.saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };
  return (
    <div className="space-y-6">
      {saved && (
        <AppNotice variant="success" title="Configuration saved">
          The cockpit preview now follows this department configuration.
        </AppNotice>
      )}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-purple-600">
          Department configuration
        </p>
        <h1 className="mt-1 text-3xl font-black text-blue-950 dark:text-blue-300">
          Interview Question Template
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Define standard questions and choose whether the cockpit shows one
          Overall Score field.
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
                <p className="mt-1 text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {settings.questions.map((question, index) => (
              <div
                key={index}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-2xl border border-border p-3 sm:gap-3 sm:p-4"
              >
                <span className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-extrabold text-blue-700">
                  Q{index + 1}
                </span>
                <Textarea
                  value={question}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      questions: settings.questions.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item
                      ),
                    })
                  }
                  className="min-h-20"
                />
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      questions: settings.questions.filter(
                        (_, itemIndex) => itemIndex !== index
                      ),
                    })
                  }
                  className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label={`Remove question ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={() =>
              setSettings({
                ...settings,
                questions: [...settings.questions, ''],
              })
            }
            variant="outline"
            className="mt-4 h-10 border-blue-300 px-4 font-bold text-blue-700"
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>
        </section>
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
            Story 5.1
          </p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Optional Numeric Scoring</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When enabled, one Overall Score field appears in every cockpit.
              </p>
            </div>
            <Switch
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
              No per-question score and no invented scoring range are
              introduced.
            </p>
          </div>
        </aside>
      </div>
      <div className="flex justify-stretch sm:justify-end">
        <Button
          type="button"
          onClick={() => void save()}
          className="h-11 w-full bg-blue-900 px-6 font-extrabold text-white shadow-sm hover:bg-blue-800 sm:w-auto"
        >
          Save & Apply
        </Button>
      </div>
    </div>
  );
}

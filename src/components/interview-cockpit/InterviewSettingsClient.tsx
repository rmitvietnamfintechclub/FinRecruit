'use client';

import { useEffect, useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
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

  // State quản lý Confirm Dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
      <div className="flex min-h-100 flex-col items-center justify-center space-y-4">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-[#DCB968]"></i>
        <p className="text-sm font-bold text-[#0D1742]">
          Loading Configuration Setup…
        </p>
      </div>
    );

  const cleanQuestions = settings.questions
    .map((q) => q.text.trim())
    .filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    setIsConfirmOpen(false); // Đóng hộp thoại ngay khi bắt đầu lưu

    try {
      const result = await interviewCockpitRepository.saveSettings({
        ...settings,
        questions: cleanQuestions,
      });
      setSettings(toDraft(result));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 4000);
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

  const handleAddQuestion = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      questions: [...settings.questions, { id: crypto.randomUUID(), text: '' }],
    });
    setSaved(false);
  };

  return (
    <>
      <ConfirmDialog
        open={isConfirmOpen}
        title="Publish Interview Template?"
        description={
          <div className="space-y-3">
            <p>
              You are about to publish a standardized template containing{' '}
              <strong className="text-gray-900">
                {cleanQuestions.length} questions
              </strong>
              . This template will immediately be applied to all{' '}
              <b>{settings.department}</b> candidates in Round 2.
            </p>
          </div>
        }
        confirmLabel="Publish Now"
        cancelLabel="Keep Editing"
        variant="default"
        onConfirm={() => void handleSave()}
        onCancel={() => setIsConfirmOpen(false)}
        loading={saving}
      />

      <div className="mx-auto animate-in fade-in duration-500 pb-2">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-[#0D1742]">
            Question Template Builder
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Design the standardized interview framework for Round 2. These
            questions will automatically populate the Digital Cockpit for all
            candidates.
          </p>
        </div>

        {/* NOTIFICATIONS */}
        <div className="mb-6 space-y-4">
          {saved && (
            <div className="flex animate-in slide-in-from-top-2 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p>
                Template successfully published and applied to all pending
                candidates.
              </p>
            </div>
          )}
          {error && (
            <AppNotice variant="error" onDismiss={() => setError(null)}>
              {error}
            </AppNotice>
          )}
        </div>

        {/* BUILDER WORKSPACE */}
        <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* WORKSPACE HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-6 py-5">
            <div>
              <h2 className="text-lg font-black text-[#0D1742] flex items-center gap-2">
                <i className="fa-solid fa-list-check text-[#DCB968]"></i>
                Standard Questions
              </h2>
              <p className="mt-1 text-xs font-semibold text-gray-500">
                Drag the 6-dot handle to reorder. Empty fields are removed upon
                saving.
              </p>
            </div>
            <div className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-400 shadow-sm border border-gray-100">
              {settings.questions.length} Question
              {settings.questions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* QUESTION LIST */}
          <div className="p-6">
            {settings.questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center transition-colors hover:bg-gray-100 hover:border-gray-300">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-4 ring-gray-50">
                  <i className="fa-regular fa-comment-dots text-3xl text-gray-300"></i>
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  Blank Canvas
                </h3>
                <p className="mt-2 text-sm font-medium text-gray-500 max-w-sm">
                  Your interview template is currently empty. Click the button
                  below to add your first standard question.
                </p>
                <Button
                  type="button"
                  onClick={handleAddQuestion}
                  className="mt-6 h-11 rounded-xl bg-[#0D1742] px-6 font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#0D1742]/90"
                >
                  <Plus className="mr-2 h-5 w-5" /> Add First Question
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-2 sm:p-3">
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
            )}
          </div>

          {/* WORKSPACE FOOTER ACTIONS */}
          <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            {settings.questions.length > 0 ? (
              <Button
                type="button"
                disabled={saving || isReordering}
                onClick={handleAddQuestion}
                variant="outline"
                className="h-11 rounded-xl border-dashed border-gray-300 bg-white px-5 font-bold text-[#0D1742] shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-[#0D1742]/20"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Next Question
              </Button>
            ) : (
              <div /> // Spacer
            )}

            <Button
              type="button"
              onClick={() => setIsConfirmOpen(true)} // Mở Dialog thay vì save luôn
              disabled={saving || isReordering}
              className="h-11 w-full sm:w-auto rounded-xl bg-[#0D1742] px-8 font-black text-[#DCB968] shadow-md transition-all hover:bg-[#0D1742]/90 hover:shadow-lg focus:ring-4 focus:ring-[#0D1742]/20 disabled:opacity-70 disabled:hover:shadow-md"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin text-[#DCB968]"></i>{' '}
                  Publishing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-cloud-arrow-up"></i> Publish
                  Template
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

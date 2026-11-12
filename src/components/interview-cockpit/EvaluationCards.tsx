import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquareDiff, Trash2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { interviewCockpitRepository } from '@/lib/interview-cockpit/repository';
import type {
  CockpitUser,
  CollaborativeNote,
  InterviewAnswer,
  SaveState,
} from '@/lib/interview-cockpit/types';
import { cn } from '@/lib/utils';

export function TeamInsightsFeed({
  notes,
  currentUserId,
}: {
  notes: CollaborativeNote[];
  currentUserId: string;
}) {
  const teamNotes = notes.filter((n) => n.authorId !== currentUserId);
  if (teamNotes.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-2xs">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#0D1742]">
        <MessageSquareDiff className="h-3.5 w-3.5 text-[#DCB968]" /> Team
        Insights
      </p>
      <div className="space-y-3">
        {teamNotes.map((note, idx) => (
          <div key={`${note.authorId}-${idx}`} className="text-left">
            <div className="inline-block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs">
              <div className="mb-1 flex items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-[#0D1742]">
                  <i className="fa-solid fa-user-tie mr-1 text-[#DCB968]"></i>{' '}
                  {note.authorName} ({note.role})
                </p>
                <span className="text-[9px] font-medium text-gray-400">
                  {new Date(note.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-gray-700">
                {note.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuestionEvaluationCard({
  answer,
  disabled,
  currentUser,
  isDepartmentHead,
  index,
  onSaved,
  onSaveState,
  onDeleteQuestion,
  onUpdateQuestion,
}: {
  answer: InterviewAnswer;
  disabled: boolean;
  currentUser: CockpitUser;
  isDepartmentHead: boolean;
  index?: number;
  onSaved: (answer: InterviewAnswer) => Promise<void>;
  onSaveState: (state: SaveState) => void;
  onDeleteQuestion?: (answerId: string) => Promise<void>;
  onUpdateQuestion?: (answerId: string, newText: string) => Promise<void>;
}) {
  const myExistingNote =
    answer.collaborativeNotes.find((n) => n.authorId === currentUser.id)
      ?.content || '';
  const [draftNote, setDraftNote] = useState(myExistingNote);

  // State xóa
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State chỉnh sửa câu hỏi (Inline Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(answer.question);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const onSaveStateRef = useRef(onSaveState);
  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  // Reset edit value nếu answer bên ngoài thay đổi
  useEffect(() => {
    setEditValue(answer.question);
  }, [answer.question]);

  const saveNote = useCallback(
    async (nextValue: string) => {
      const otherNotes = answer.collaborativeNotes.filter(
        (n) => n.authorId !== currentUser.id
      );
      const myNewNote: CollaborativeNote = {
        authorId: currentUser.id,
        authorEmail: currentUser.email,
        authorName: currentUser.name,
        role: currentUser.role,
        content: nextValue,
        updatedAt: new Date().toISOString(),
      };
      const payloadAnswer: InterviewAnswer = {
        ...answer,
        collaborativeNotes: [...otherNotes, myNewNote],
      };
      await onSaved(payloadAnswer);
    },
    [answer, currentUser, onSaved]
  );

  const state = useDebouncedSave(draftNote, saveNote, 1000);
  useEffect(() => onSaveStateRef.current(state), [state]);

  const confirmAndDelete = async () => {
    if (!onDeleteQuestion || !answer.id) return;
    try {
      setIsDeleting(true);
      await onDeleteQuestion(answer.id);
      setIsConfirmDeleteOpen(false);
    } catch {
      setIsDeleting(false);
    }
  };

  const confirmAndSaveEdit = async () => {
    if (!onUpdateQuestion || !answer.id) return;
    if (!editValue.trim() || editValue === answer.question) {
      setIsEditing(false); // Hủy edit nếu không đổi
      setEditValue(answer.question);
      return;
    }
    try {
      setIsSavingEdit(true);
      await onUpdateQuestion(answer.id, editValue.trim());
      setIsEditing(false);
    } catch {
      // Xử lý lỗi thông qua UI tổng nếu cần
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        title="Delete Question?"
        description={
          <p>
            Are you sure you want to remove this question? All associated
            evaluation notes for this question will also be permanently removed.
          </p>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void confirmAndDelete()}
        onCancel={() => setIsConfirmDeleteOpen(false)}
        loading={isDeleting}
      />

      <article
        className={cn(
          'rounded-2xl border p-5 shadow-sm transition-all relative group',
          answer.isCustom
            ? 'border-amber-300 bg-amber-50/20'
            : 'border-gray-200 bg-white'
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              className={cn(
                'flex h-8 shrink-0 items-center justify-center rounded-lg px-2.5 text-xs font-black',
                answer.isCustom
                  ? 'bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200'
                  : 'bg-[#0D1742] text-[#DCB968] w-8'
              )}
            >
              {answer.isCustom
                ? 'Custom'
                : `Q${index !== undefined ? index + 1 : ''}`}
            </span>

            {/* HIỂN THỊ UI INLINE EDIT HOẶC TEXT BÌNH THƯỜNG */}
            {isEditing ? (
              <div className="flex w-full items-start gap-2">
                <Textarea
                  autoFocus
                  disabled={isSavingEdit}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void confirmAndSaveEdit();
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditValue(answer.question);
                    }
                  }}
                  className="min-h-24 resize-y bg-white border-gray-300 text-sm font-bold text-gray-900 focus-visible:ring-[#0D1742]"
                />
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => void confirmAndSaveEdit()}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <i
                      className={cn(
                        'text-xs',
                        isSavingEdit
                          ? 'fa-solid fa-spinner fa-spin'
                          : 'fa-solid fa-check'
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => {
                      setIsEditing(false);
                      setEditValue(answer.question);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <h3 className="mt-1 text-sm font-black text-gray-900 leading-snug wrap-break-word">
                  {answer.question}
                </h3>

                {answer.isCustom && answer.addedBy && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-900/70">
                    <i className="fa-solid fa-user-pen text-[10px] text-amber-600/80" />
                    <span>
                      Added by{' '}
                      <strong className="font-bold text-amber-950">
                        {answer.addedBy.name}
                      </strong>{' '}
                      <span className="font-medium text-amber-800/70">
                        ({answer.addedBy.role})
                      </span>
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* CÁC NÚT TÁC VỤ BÊN PHẢI */}
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {isDepartmentHead &&
              answer.isCustom &&
              onUpdateQuestion &&
              !disabled &&
              !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  title="Edit question"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 shadow-2xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

            {isDepartmentHead &&
              onDeleteQuestion &&
              !disabled &&
              !isEditing && (
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 shadow-2xs"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Your Evaluation Notes
          </label>
          <Textarea
            disabled={disabled}
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Record the candidate’s response or your main takeaways here…"
            className="min-h-25rounded-xl border-gray-200 bg-gray-50/50 p-3 text-sm font-medium text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-[#0D1742] focus-visible:bg-white focus-visible:ring-[#0D1742]"
          />
          <TeamInsightsFeed
            notes={answer.collaborativeNotes}
            currentUserId={currentUser.id}
          />
        </div>
      </article>
    </>
  );
}

export function GeneralNoteCard({
  candidateId,
  currentUserId,
  notes,
  disabled,
  onSaved,
  onSaveState,
}: {
  candidateId: string;
  currentUserId: string;
  notes: CollaborativeNote[];
  disabled: boolean;
  onSaved: (notes: CollaborativeNote[]) => void;
  onSaveState: (state: SaveState) => void;
}) {
  const myExistingNote =
    notes.find((n) => n.authorId === currentUserId)?.content || '';
  const [draftNote, setDraftNote] = useState(myExistingNote);

  const onSaveStateRef = useRef(onSaveState);
  useEffect(() => {
    onSaveStateRef.current = onSaveState;
  }, [onSaveState]);

  const save = useCallback(
    async (nextValue: string) => {
      const savedNotes = await interviewCockpitRepository.saveGeneralNote(
        candidateId,
        nextValue
      );
      onSaved(savedNotes);
    },
    [candidateId, onSaved]
  );

  const state = useDebouncedSave(draftNote, save, 1000);
  useEffect(() => onSaveStateRef.current(state), [state]);

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#0D1742]">
        <i className="fa-solid fa-clipboard-user text-[#DCB968]"></i> Overall
        Observations
      </h3>
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
          Your General Notes
        </label>
        {/* Đồng bộ chuẩn Textarea */}
        <Textarea
          disabled={disabled}
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          placeholder="Add any additional observations about attitude, culture fit, etc…"
          className="min-h-30 resize-y rounded-xl border-gray-200 bg-gray-50/50 p-3 text-sm font-medium text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-[#0D1742] focus-visible:bg-white focus-visible:ring-[#0D1742]"
        />
        <TeamInsightsFeed notes={notes} currentUserId={currentUserId} />
      </div>
    </div>
  );
}

export function CustomQuestionComposer({
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
    <article className="rounded-2xl border border-dashed border-[#DCB968] bg-amber-50/30 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 border border-amber-200">
          New Ad-Hoc Question
        </span>
      </div>
      <Textarea
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          // Ấn Enter (không kèm Shift) để lưu, Esc để hủy
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (question.trim() && !saving) void save();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        disabled={saving}
        placeholder="Type the custom interview question here... (Press Enter to save)"
        className="min-h-20 resize-y rounded-xl border-gray-200 bg-white p-3 text-sm font-medium text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-[#0D1742] focus-visible:bg-white focus-visible:ring-[#0D1742]"
      />
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={!question.trim() || saving}
          className="rounded-xl bg-[#0D1742] font-bold text-[#DCB968] shadow-sm hover:bg-[#0D1742]/90"
        >
          {saving ? 'Saving…' : 'Add Question'}
        </Button>
      </div>
    </article>
  );
}

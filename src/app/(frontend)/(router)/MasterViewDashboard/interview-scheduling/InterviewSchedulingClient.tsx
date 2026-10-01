'use client';

import { CheckCircle2, Pencil, Sparkles, Star, Trash2, TriangleAlert, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppNotice } from '@/components/feedback/AppNotice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/app/(frontend)/(router)/MasterViewDashboard/interview-scheduling/ShareLinkModal';
import {
  useDeleteSlot,
  useInterviewLinks,
  useInterviewSlots,
  usePublishSlots,
  useUpdateSlot,
} from '@/hooks/use-interview-scheduling';
import {
  formatDateBand,
  generateTimeSlots,
  slotRangeLabel,
} from '@/lib/interview-scheduling/format';
import { groupSlotsByDate, groupSlotsByRoom } from '@/lib/interview-scheduling/reducer';
import { SEED_GENERATION, SEED_SEMESTER } from '@/lib/interview-scheduling/seed';
import type { InterviewSlot, NewInterviewSlot } from '@/types/interviewScheduling';

// TODO(backend): take generation/semester from the active SystemConfig instead of the seed.
const GENERATION = SEED_GENERATION;
const SEMESTER = SEED_SEMESTER;

type DraftSlot = NewInterviewSlot & { key: string };

const inputClass =
  'border-input bg-background w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/40';
const labelClass = 'text-muted-foreground mb-1.5 block text-[11px] font-bold tracking-wider uppercase';

function draftKey(s: NewInterviewSlot) {
  return `${s.date}|${s.room}|${s.startTime}`;
}

export function InterviewSchedulingClient() {
  const publishedSlots = useInterviewSlots();
  const links = useInterviewLinks();
  const { publish, pending: publishing } = usePublishSlots();
  const { update } = useUpdateSlot();
  const { remove } = useDeleteSlot();

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [duration, setDuration] = useState('40');

  const [draft, setDraft] = useState<DraftSlot[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ variant: 'error' | 'success'; text: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  function addToDraft() {
    setFormError(null);
    const mins = Number(duration);
    if (!date || !room.trim() || !startTime || !endTime) {
      setFormError('Fill in date, start time, end time and room.');
      return;
    }
    if (!Number.isInteger(mins) || mins <= 0) {
      setFormError('Slot duration must be a positive number of minutes.');
      return;
    }
    const chunks = generateTimeSlots(startTime, endTime, mins);
    if (chunks.length === 0) {
      setFormError('That range is too short for even one slot. Check the times and duration.');
      return;
    }
    setDraft((prev) => {
      const existing = new Set(prev.map(draftKey));
      const added = chunks
        .map((c) => ({
          generation: GENERATION,
          semester: SEMESTER,
          date,
          room: room.trim(),
          ...c,
        }))
        .filter((s) => !existing.has(draftKey(s)))
        .map((s) => ({ ...s, key: draftKey(s) }));
      return [...prev, ...added];
    });
  }

  const draftByDate = useMemo(() => {
    const sorted = [...draft].sort(
      (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    );
    const dates = new Map<string, Map<string, DraftSlot[]>>();
    for (const s of sorted) {
      const rooms = dates.get(s.date) ?? new Map<string, DraftSlot[]>();
      rooms.set(s.room, [...(rooms.get(s.room) ?? []), s]);
      dates.set(s.date, rooms);
    }
    return dates;
  }, [draft]);

  async function handlePublish() {
    if (draft.length === 0) return;
    setNotice(null);
    try {
      await publish(
        draft.map(({ key: _key, ...s }) => {
          void _key;
          return s;
        })
      );
      setShowSuccess(true);
    } catch (e) {
      setNotice({ variant: 'error', text: e instanceof Error ? e.message : 'Failed to publish slots.' });
    }
  }

  async function handleDelete(id: string) {
    setNotice(null);
    const result = await remove(id);
    if (!result.ok) setNotice({ variant: 'error', text: result.message });
  }

  const [editing, setEditing] = useState<InterviewSlot | null>(null);
  async function saveEdit() {
    if (!editing) return;
    const result = await update(editing.id, {
      date: editing.date,
      startTime: editing.startTime,
      endTime: editing.endTime,
      room: editing.room.trim(),
    });
    if (!result.ok) setNotice({ variant: 'error', text: result.message });
    else setNotice({ variant: 'success', text: 'Slot updated.' });
    setEditing(null);
  }

  const published = useMemo(() => groupSlotsByDate(publishedSlots), [publishedSlots]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Interview Schedule Configuration</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Define and generate interview time slots for Interview Round.
        </p>
      </div>

      {notice ? (
        <AppNotice
          variant={notice.variant}
          title={notice.variant === 'error' ? 'Action not allowed' : 'Done'}
          onDismiss={() => setNotice(null)}
        >
          {notice.text}
        </AppNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Interview Slot Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="slot-date">Interview date</label>
              <input id="slot-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="slot-start">Start time</label>
                <input id="slot-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="slot-end">End time</label>
                <input id="slot-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="slot-room">Room / Location</label>
              <input id="slot-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="1.2.036" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="slot-duration">Slot duration</label>
              <div className="relative">
                <input id="slot-duration" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={`${inputClass} pr-16`} />
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold">MINS</span>
              </div>
            </div>
            {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
            <button
              type="button"
              onClick={addToDraft}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9810FA] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" aria-hidden /> Add Slots
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-bold">Interview Slot Preview</CardTitle>
              <span className="rounded-full bg-[#EAE7EF] px-3 py-1 text-xs font-bold text-slate-700">
                {draft.length} Slots Generated
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No slots yet. Fill in the form and click “Add Slots”.
              </p>
            ) : (
              [...draftByDate.entries()].map(([d, rooms]) => (
                <div key={d} className="border-border overflow-hidden rounded-xl border">
                  <div className="flex items-center justify-between bg-sky-50 px-4 py-2 dark:bg-sky-950/40">
                    <span className="text-sm font-extrabold tracking-wide">{formatDateBand(d)}</span>
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => prev.filter((s) => s.date !== d))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 dark:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Discard
                    </button>
                  </div>
                  <div className="space-y-3 p-4">
                    {[...rooms.entries()].map(([r, list]) => (
                      <div key={r}>
                        <p className="text-muted-foreground mb-2 text-[11px] font-bold tracking-wider uppercase">Room: {r}</p>
                        <div className="flex flex-wrap gap-2">
                          {list.map((s) => (
                            <span key={s.key} className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums">
                              {slotRangeLabel(s)}
                              <button
                                type="button"
                                aria-label={`Remove ${slotRangeLabel(s)}`}
                                onClick={() => setDraft((prev) => prev.filter((x) => x.key !== s.key))}
                                className="text-muted-foreground hover:text-red-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Changes are not saved until published.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={draft.length === 0}
                  onClick={() => setDraft([])}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                >
                  Discard All
                </button>
                <button
                  type="button"
                  disabled={draft.length === 0 || publishing}
                  onClick={handlePublish}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E6B656] px-4 py-2 text-sm font-bold text-[#010A63] hover:opacity-90 disabled:opacity-50"
                >
                  <Star className="h-4 w-4" aria-hidden /> {publishing ? 'Publishing…' : 'Save & Publish'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Published Slots</CardTitle>
          <CardDescription>{publishedSlots.length} slots · booked slots cannot be edited or deleted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {publishedSlots.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing published yet.</p>
          ) : (
            [...published.entries()].map(([d, list]) => (
              <div key={d}>
                <p className="mb-2 text-sm font-extrabold tracking-wide">{formatDateBand(d)}</p>
                {[...groupSlotsByRoom(list).entries()].map(([r, roomSlots]) => (
                  <div key={r} className="mb-3">
                    <p className="text-muted-foreground mb-1.5 text-[11px] font-bold tracking-wider uppercase">Room: {r}</p>
                    <ul className="divide-border border-border divide-y rounded-xl border">
                      {roomSlots.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                          {editing?.id === s.id ? (
                            <>
                              <input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className={`${inputClass} w-auto`} />
                              <input type="time" value={editing.startTime} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} className={`${inputClass} w-auto`} />
                              <input type="time" value={editing.endTime} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} className={`${inputClass} w-auto`} />
                              <input value={editing.room} onChange={(e) => setEditing({ ...editing, room: e.target.value })} className={`${inputClass} w-28`} />
                              <button type="button" onClick={saveEdit} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white">Save</button>
                              <button type="button" onClick={() => setEditing(null)} className="text-muted-foreground text-xs font-bold">Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold tabular-nums">{slotRangeLabel(s)}</span>
                              {s.status === 'BOOKED' ? (
                                <span className="rounded-full bg-[#FEF9C2] px-2 py-0.5 text-[11px] font-bold text-[#A65F00]">Booked</span>
                              ) : (
                                <span className="rounded-full bg-[#DBF5FF] px-2 py-0.5 text-[11px] font-bold text-[#007BA7]">Available</span>
                              )}
                              <span className="ml-auto flex gap-1">
                                <button type="button" aria-label="Edit slot" onClick={() => setEditing(s)} className="text-muted-foreground hover:text-foreground rounded-lg p-1.5">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button type="button" aria-label="Delete slot" onClick={() => handleDelete(s.id)} className="text-muted-foreground rounded-lg p-1.5 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {showSuccess ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="publish-success-title" className="bg-card border-border w-full max-w-lg rounded-2xl border p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </div>
              <h3 id="publish-success-title" className="mt-4 text-xl font-extrabold">Slots Published Successfully!</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Interview slots have been generated. Share the links below to start receiving registrations.
              </p>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { label: 'Send to Interviewers (Internal)', url: links?.internalUrl ?? '' },
                { label: 'Send to Candidates (Public)', url: links?.publicUrl ?? '' },
              ].map((row) => (
                <div key={row.label}>
                  <p className={labelClass}>{row.label}</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={row.url} className="border-input bg-background min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                    <CopyButton text={row.url} />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraft([]);
                setShowSuccess(false);
              }}
              className="mt-6 w-full rounded-xl bg-[#9810FA] px-4 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

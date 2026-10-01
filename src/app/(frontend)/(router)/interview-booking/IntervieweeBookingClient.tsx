'use client';

import { Lock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PublicPageShell } from '@/components/dashboard/PublicPageShell';
import { SegmentedControl } from '@/components/interview-scheduling/SegmentedControl';
import { SlotPicker } from '@/components/interview-scheduling/SlotPicker';
import { DetailRows, TransactionalCard } from '@/components/interview-scheduling/TransactionalCard';
import { useConfirmBooking } from '@/hooks/use-interview-scheduling';
import { getInterviewSchedulingApi } from '@/lib/interview-scheduling/api';
import { DEPARTMENT_META, DEPARTMENT_ORDER } from '@/lib/interview-scheduling/departments';
import { formatDateLong, slotDuration, slotRangeLabel } from '@/lib/interview-scheduling/format';
import type { BookableSlot, InterviewDepartment, InterviewSlot } from '@/types/interviewScheduling';

const CONTACT_EMAIL = 'fintechclub.sgs@rmit.edu.vn';
const inputClass =
  'border-input bg-background w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40';
const labelClass = 'text-muted-foreground mb-1.5 block text-[11px] font-bold tracking-wider uppercase';
const amberBtn = 'rounded-xl bg-[#E6B656] px-5 py-2.5 text-sm font-bold text-[#010A63] hover:opacity-90 disabled:opacity-50';

type Screen =
  | { kind: 'form' }
  | { kind: 'success'; booking: InterviewSlot; email: string }
  | { kind: 'already'; booking: InterviewSlot };

function DeptDot({ department }: { department: InterviewDepartment }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEPARTMENT_META[department].strong }} />
      {DEPARTMENT_META[department].full}
    </span>
  );
}

export function IntervieweeBookingClient() {
  const { confirm, pending } = useConfirmBooking();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<InterviewDepartment>('Technology Department');
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: 'form' });

  const loadSchedule = useCallback(async (dept: InterviewDepartment) => {
    setLoading(true);
    try {
      setSlots(await getInterviewSchedulingApi().getBookableSchedule(dept));
    } catch {
      setError('Could not load interview slots. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule(department);
  }, [department, loadSchedule]);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const selected = slots.find((s) => s.id === selectedId) ?? null;

  function openConfirm() {
    setError(null);
    if (!name.trim()) return setError('Please enter your full name.');
    if (!validEmail) return setError('Please enter a valid student email.');
    if (!selected) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      const result = await confirm({
        name: name.trim(),
        email: email.trim(),
        department,
        slotId: selected.id,
      });
      setShowConfirm(false);
      if (result.ok) {
        setScreen({ kind: 'success', booking: result.booking, email: email.trim() });
      } else if (result.reason === 'ALREADY_BOOKED') {
        setScreen({ kind: 'already', booking: result.existingBooking });
      } else {
        setShowUnavailable(true);
      }
    } catch (e) {
      setShowConfirm(false);
      setError(e instanceof Error ? e.message : 'Failed to confirm booking.');
    }
  }

  const header = {
    title: 'Register Your Interview Slot',
    subtitle: 'Congratulations on passing Round 1! Please select a single time slot for your interview.',
  };

  if (screen.kind === 'success') {
    const b = screen.booking;
    return (
      <PublicPageShell headerColor="amber" {...header}>
        <TransactionalCard
          variant="success"
          title="Interview Booked"
          subtitle="Your schedule has been successfully updated."
          actions={
            <button type="button" onClick={() => window.location.reload()} className={`w-full ${amberBtn}`}>Done</button>
          }
        >
          <div className="space-y-4">
            <DetailRows
              rows={[
                {
                  label: 'Date & time',
                  value: (
                    <>
                      {formatDateLong(b.date)}
                      <br />
                      <span className="text-xs font-medium text-slate-400">
                        {slotRangeLabel(b)} ({slotDuration(b)})
                      </span>
                    </>
                  ),
                },
                { label: 'Department', value: <DeptDot department={b.bookedDepartment ?? department} /> },
                { label: 'Room', value: b.room },
              ]}
            />
            <p className="rounded-xl bg-[#1B1F2E] p-3 text-xs leading-relaxed text-slate-300">
              A calendar invitation (.ics) has been sent to your email: {screen.email}
            </p>
          </div>
        </TransactionalCard>
      </PublicPageShell>
    );
  }

  if (screen.kind === 'already') {
    const b = screen.booking;
    return (
      <PublicPageShell headerColor="amber" {...header}>
        <TransactionalCard
          variant="failure"
          title="You already have a booked slot"
          subtitle={
            <>
              You are currently scheduled for: {formatDateLong(b.date)}, {b.startTime} - {b.endTime}. If you need to
              reschedule or cancel, please contact us directly via our email: {CONTACT_EMAIL}.
            </>
          }
          actions={
            <div className="space-y-3">
              <a href={`mailto:${CONTACT_EMAIL}`} className={`block w-full text-center ${amberBtn}`}>Contact Us</a>
              <button
                type="button"
                onClick={() => {
                  // Back to the form; clear the email so a mistyped one can be corrected
                  // (the same email would land here again).
                  setScreen({ kind: 'form' });
                  setEmail('');
                  setSelectedId(null);
                  setError(null);
                  void loadSchedule(department);
                }}
                className="w-full rounded-xl border border-[#232838] px-5 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
              >
                Back
              </button>
            </div>
          }
        />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell headerColor="amber" {...header}>
      <div className="space-y-6 pb-28">
        <section className="bg-card border-border space-y-4 rounded-2xl border p-5 shadow-sm">
          <h2 className="text-base font-extrabold">Your Details</h2>
          <div>
            <label className={labelClass} htmlFor="ib-name">Full name</label>
            <input id="ib-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Please enter your full name" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="ib-email">Student email</label>
            <input id="ib-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Please enter your student email" className={inputClass} />
          </div>
          <div>
            <p className={labelClass}>Select your applied department</p>
            <SegmentedControl
              ariaLabel="Applied department"
              options={DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_META[d].short, color: DEPARTMENT_META[d].strong }))}
              value={department}
              onChange={(d) => {
                setDepartment(d);
                setSelectedId(null);
              }}
              activeClassName="bg-[#E6B656] text-[#010A63] shadow-sm"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold">Available Slots</h2>
            <span className="rounded-full bg-[#EAE7EF] px-3 py-1 text-xs font-bold text-slate-700">Select ONE preferred time slot</span>
          </div>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Loading slots…</p>
          ) : (
            <SlotPicker
              slots={slots}
              band={{ label: DEPARTMENT_META[department].full, department }}
              isSelected={(s) => s.id === selectedId}
              isDisabled={(s) => !s.bookable}
              onToggle={(s) => setSelectedId(s.id === selectedId ? null : s.id)}
            />
          )}
        </section>

        <div className="bg-card border-border fixed inset-x-0 bottom-0 z-20 border-t shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {selected
                  ? `${formatDateLong(selected.date)}, ${slotRangeLabel(selected)} · Room ${selected.room}`
                  : 'No slot selected'}
              </p>
              {error ? <p className="truncate text-xs font-medium text-red-600" role="alert">{error}</p> : null}
            </div>
            <button type="button" disabled={!selected || pending} onClick={openConfirm} className={`shrink-0 ${amberBtn}`}>
              Confirm Booking
            </button>
          </div>
        </div>
      </div>

      {showConfirm && selected ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl border-2 border-[#FFA200] bg-white p-6 text-slate-900 shadow-2xl">
            <h3 id="confirm-title" className="text-xl font-extrabold">Confirm Your Booking?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to lock in your interview for {formatDateLong(selected.date)}, {selected.startTime} - {selected.endTime}.
            </p>
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
              This action cannot be undone. You will not be able to change this slot once confirmed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={pending} onClick={() => setShowConfirm(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" disabled={pending} onClick={handleConfirm} className={`inline-flex items-center gap-2 ${amberBtn}`}>
                <Lock className="h-4 w-4" aria-hidden /> {pending ? 'Locking…' : 'Confirm & Lock'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUnavailable ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation">
          <TransactionalCard
            variant="failure"
            title="Slot Unavailable"
            subtitle="Another candidate just booked this time slot. Please select a different time for your interview."
            actions={
              <button
                type="button"
                onClick={() => {
                  setShowUnavailable(false);
                  setSelectedId(null);
                  void loadSchedule(department);
                }}
                className={`w-full ${amberBtn}`}
              >
                Choose Another Slot
              </button>
            }
          />
        </div>
      ) : null}
    </PublicPageShell>
  );
}

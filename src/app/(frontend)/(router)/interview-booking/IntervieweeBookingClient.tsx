'use client';

import Link from 'next/link';
import { AlertCircle, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { PublicPageShell } from '@/components/dashboard/PublicPageShell';
import { SegmentedControl } from '@/components/interview-scheduling/SegmentedControl';
import { SlotPicker } from '@/components/interview-scheduling/SlotPicker';
import {
  DetailRows,
  TransactionalCard,
} from '@/components/interview-scheduling/TransactionalCard';
import { useConfirmBooking } from '@/hooks/use-interview-scheduling';
import { httpGetBookableSchedule } from '@/lib/interview-scheduling/http-api';
import {
  DEPARTMENT_META,
  DEPARTMENT_ORDER,
} from '@/lib/interview-scheduling/departments';
import {
  formatDateLong,
  slotDuration,
  slotRangeLabel,
} from '@/lib/interview-scheduling/format';
import type {
  BookableSlot,
  InterviewDepartment,
  InterviewSlot,
} from '@/types/interviewScheduling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { filterSlotsByAssignedDept } from '@/lib/interview-scheduling/reducer';

const CONTACT_EMAIL = 'fintechclub.sgs@rmit.edu.vn';

const inputClass =
  'w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/30 focus:border-[#0D1742] focus:bg-white focus:ring-1 focus:ring-[#0D1742] focus:outline-none placeholder:text-gray-400';
const labelClass =
  'mb-2 block text-[11px] font-bold tracking-widest uppercase text-[#5E5E92]';

type Screen =
  | { kind: 'form' }
  | { kind: 'success'; booking: InterviewSlot; email: string }
  | { kind: 'already'; booking: InterviewSlot }
  | {
      kind: 'error';
      title: string;
      subtitle: ReactNode;
      allowRetry?: boolean;
      showContact?: boolean;
    };

function DeptDot({ department }: { department: InterviewDepartment }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: DEPARTMENT_META[department].strong }}
      />
      <span className="font-bold text-gray-900">
        {department === 'HR Department'
          ? 'Human Resources'
          : DEPARTMENT_META[department].full}
      </span>
    </span>
  );
}

function getCandidateDepartment(
  slot: InterviewSlot,
  candidateEmail: string
): InterviewDepartment | undefined {
  const normalizedEmail = candidateEmail.trim().toLowerCase();
  const studentId = normalizedEmail.split('@')[0].toUpperCase();
  const booking = slot.bookings?.find(
    (b) =>
      b.candidateStudentId === studentId ||
      b.candidateId === `cand-${normalizedEmail}`
  );
  return booking?.department;
}

export function IntervieweeBookingClient() {
  const { confirm, pending } = useConfirmBooking();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<InterviewDepartment>(
    'Technology Department'
  );
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [screen, setScreen] = useState<Screen>({ kind: 'form' });

  const loadSchedule = useCallback(async (dept: InterviewDepartment) => {
    setLoading(true);
    try {
      setSlots(await httpGetBookableSchedule(dept));
    } catch {
      setError('Could not load interview slots. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule(department);
  }, [department, loadSchedule]);

  const filteredSlotsForCandidate = useMemo(() => {
    return filterSlotsByAssignedDept(slots, department) as BookableSlot[];
  }, [slots, department]);

  const selected =
    filteredSlotsForCandidate.find((s) => s.id === selectedId) ?? null;

  function openConfirm() {
    setError(null);
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) return setError('Please enter your full name.');

    // CẬP NHẬT: Thêm cờ 'i' để không phân biệt hoa thường và check chính xác hơn
    if (!/^s\d{7}@rmit\.edu\.vn$/i.test(normalizedEmail)) {
      return setError(
        'Please enter a valid RMIT student email (e.g., s1234567@rmit.edu.vn).'
      );
    }

    if (!selected)
      return setError('Please select a preferred interview time slot.');
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      const result = await confirm({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department,
        slotId: selected.id,
      });
      setShowConfirm(false);

      if (result.ok) {
        setScreen({
          kind: 'success',
          booking: result.booking,
          email: email.trim().toLowerCase(),
        });
      } else if (result.reason === 'ALREADY_BOOKED') {
        setScreen({ kind: 'already', booking: result.existingBooking });
      } else if (result.reason === 'CANDIDATE_NOT_FOUND') {
        setScreen({
          kind: 'error',
          title: 'Email Not Found',
          subtitle: (
            <span className="text-gray-900 font-medium">
              We could not find this email in our Round 1 Pass list. Please
              ensure you are using the{' '}
              <strong className="text-black font-black">
                exact student email
              </strong>{' '}
              you registered with.
            </span>
          ),
          allowRetry: true,
          showContact: true,
        });
      } else if (result.reason === 'NOT_PASSED_ROUND_1') {
        setScreen({
          kind: 'error',
          title: 'Not Eligible',
          subtitle: (
            <span className="text-gray-900 font-medium">
              Sorry, this email is not eligible for Round 2 interview bookings
              according to our records. Please contact us directly via our
              email:{' '}
              <span className="font-bold text-[#DCB968] hover:text-[#b89547]">
                {CONTACT_EMAIL}
              </span>{' '}
              for further assistance.
            </span>
          ),
          allowRetry: false,
          showContact: true,
        });
      } else if (result.reason === 'DEPARTMENT_MISMATCH') {
        const correctDeptName = DEPARTMENT_META[result.correctDepartment].full;
        setScreen({
          kind: 'error',
          title: 'Department Mismatch',
          subtitle: (
            <span className="text-gray-900 font-medium">
              Our records show you are assigned to the{' '}
              <strong className="text-black font-black">
                {correctDeptName}
              </strong>
              . Please switch to the correct department tab above to book your
              slot.
            </span>
          ),
          allowRetry: true,
          showContact: false,
        });
      } else {
        setScreen({
          kind: 'error',
          title: 'Slot Unavailable',
          subtitle: (
            <span className="text-gray-900 font-medium">
              Another candidate just booked this time slot. Please select a
              different time for your interview.
            </span>
          ),
          allowRetry: true,
          showContact: false,
        });
      }
    } catch (e) {
      setShowConfirm(false);
      setError(e instanceof Error ? e.message : 'Failed to confirm booking.');
    }
  }

  const headerProps = {
    title: 'Interview Booking',
    subtitle:
      'Congratulations! Please select a time slot for your upcoming interview.',
    headerColor: 'navy' as const,
  };

  if (screen.kind === 'success') {
    const b = screen.booking;
    const bookedDept = getCandidateDepartment(b, screen.email) ?? department;

    return (
      <PublicPageShell {...headerProps} minimal>
        <TransactionalCard
          variant="success"
          title="Interview Booked"
          subtitle="Your interview slot has been successfully confirmed."
          actions={
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] shadow-sm"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Chi tiết ca phỏng vấn */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <DetailRows
                rows={[
                  { label: 'Date', value: formatDateLong(b.date) },
                  {
                    label: 'Time',
                    value: (
                      <span className="tabular-nums">
                        {slotRangeLabel(b)} ({slotDuration(b)})
                      </span>
                    ),
                  },
                  {
                    label: 'Department',
                    value: <DeptDot department={bookedDept} />,
                  },
                  {
                    label: 'Room',
                    value: (
                      <span className="font-black uppercase tracking-widest text-[#5E5E92]">
                        {b.room}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            <div className="rounded-2xl border border-gray-150 bg-gray-50/70 p-4 sm:p-5 text-left space-y-3.5">
              {/* Dòng 1: Xác nhận Calendar Invite */}
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#0D1742] text-[#DCB968] shadow-sm mt-0.5">
                  <AlertCircle className="size-4" />
                </div>
                <p className="text-[13px] leading-relaxed text-gray-700 font-medium">
                  A calendar invitation (
                  <span className="font-bold text-[#0D1742]">.ics</span>) has
                  been sent to{' '}
                  <strong className="text-[#0D1742]">{screen.email}</strong>.
                  Please check your inbox and <strong>accept</strong> it to
                  synchronize the interview to your calendar.
                </p>
              </div>

              <div className="border-t border-gray-200/70" />

              {/* Dòng 2: Hướng dẫn tra cứu với CTA rõ ràng */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                <div>
                  <p className="text-[12px] font-bold text-[#0D1742]">
                    Need to re-check your interview details later?
                  </p>
                </div>

                <Link
                  href="/interview-lookup"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0D1742] px-3.5 py-2 text-xs font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#1a2b75] hover:text-white"
                >
                  <span>Interview Lookup Portal</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </TransactionalCard>
      </PublicPageShell>
    );
  }

  if (screen.kind === 'already') {
    const b = screen.booking;
    return (
      <PublicPageShell {...headerProps} minimal>
        <TransactionalCard
          variant="failure"
          title="Booking Exists"
          subtitle="You already have a confirmed interview slot in our system."
          actions={
            <div className="space-y-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex w-full items-center justify-center rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] shadow-sm"
              >
                Contact Support
              </a>
              <button
                type="button"
                onClick={() => {
                  setScreen({ kind: 'form' });
                  setEmail('');
                  setSelectedId(null);
                  setError(null);
                  void loadSchedule(department);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
            </div>
          }
        >
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <DetailRows
              rows={[
                { label: 'Scheduled Date', value: formatDateLong(b.date) },
                {
                  label: 'Time',
                  value: (
                    <span className="tabular-nums">{slotRangeLabel(b)}</span>
                  ),
                },
                {
                  label: 'Room',
                  value: (
                    <span className="font-black uppercase tracking-widest text-[#5E5E92]">
                      {b.room}
                    </span>
                  ),
                },
              ]}
            />
          </div>
          <p className="mt-4 text-[13px] text-center text-gray-500 font-medium px-4">
            If you need to reschedule or cancel, please contact us directly via
            our email:{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold text-[#DCB968] hover:text-[#b89547] underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </TransactionalCard>
      </PublicPageShell>
    );
  }

  if (screen.kind === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <TransactionalCard
          variant="failure"
          title={screen.title}
          subtitle={screen.subtitle}
          actions={
            <div className="space-y-3">
              {screen.allowRetry && (
                <button
                  type="button"
                  onClick={() => {
                    setScreen({ kind: 'form' });
                    setSelectedId(null);
                    void loadSchedule(department);
                  }}
                  className="w-full rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] shadow-sm"
                >
                  Try Again
                </button>
              )}
              {screen.showContact && (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Contact Support
                </a>
              )}
              {!screen.allowRetry && !screen.showContact && (
                <button
                  type="button"
                  onClick={() => setScreen({ kind: 'form' })}
                  className="w-full rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] shadow-sm"
                >
                  Go Back
                </button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <PublicPageShell {...headerProps}>
      <div className="mx-auto max-w-4xl space-y-8 mb-20 animate-in fade-in duration-500">
        <Card className="rounded-[24px] border-gray-200 bg-white shadow-sm pt-0 overflow-hidden">
          <CardHeader className="border-b border-gray-200 bg-[#0D1742] pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[15px] font-black uppercase tracking-wider text-[#DCB968]">
                Candidate Profile
              </CardTitle>
              <Link
                href="/interview-lookup"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCB968]/40 bg-[#DCB968]/10 px-3.5 py-1.5 text-xs font-bold text-[#DCB968] shadow-sm transition-all group hover:bg-[#DCB968] hover:text-[#0D1742]"
              >
                <Search className="size-3.5 text-[#DCB968] transition-colors group-hover:text-[#0D1742]" />
                <span>Already booked? Check schedule here</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="ib-name">
                  Full Name
                </label>
                <input
                  id="ib-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Please enter your full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="ib-email">
                  Student Email
                </label>
                <input
                  id="ib-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sXXXXXXX@rmit.edu.vn"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <p className={labelClass}>Applied Department</p>
              <SegmentedControl
                ariaLabel="Applied department"
                options={DEPARTMENT_ORDER.map((d) => ({
                  value: d,
                  label:
                    d === 'HR Department'
                      ? 'Human Resources'
                      : DEPARTMENT_META[d].abbr || DEPARTMENT_META[d].short,
                }))}
                value={department}
                onChange={(d) => {
                  setDepartment(d);
                  setSelectedId(null);
                }}
                activeClassName="bg-[#0D1742] text-[#DCB968] shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-gray-200 bg-white shadow-sm pt-0 overflow-hidden">
          <CardHeader className="border-b border-gray-200 bg-[#0D1742] pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-[15px] font-black uppercase tracking-wider text-[#DCB968]">
                Available Slots
              </CardTitle>
              <span className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#DCB968] backdrop-blur-sm shadow-sm">
                Select One
              </span>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300 mb-4" />
                <p className="text-sm font-bold text-gray-500">
                  Loading interview schedule...
                </p>
              </div>
            ) : (
              <TooltipProvider>
                <SlotPicker
                  slots={filteredSlotsForCandidate}
                  chipTitle={(s) =>
                    !s.bookable ? 'This session is not available.' : undefined
                  }
                  isSelected={(s) => s.id === selectedId}
                  isDisabled={(s) => !s.bookable}
                  onToggle={(s) =>
                    setSelectedId(s.id === selectedId ? null : s.id)
                  }
                />
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Sticky Bottom Bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/85 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] transition-all">
          <div className="mx-auto flex max-w-4xl flex-row items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-[13px] sm:text-[15px] font-black text-[#0D1742] truncate">
                {selected ? (
                  <>
                    {formatDateLong(selected.date)},{' '}
                    <span className="text-gray-500 font-bold">
                      {slotRangeLabel(selected)}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">No slot selected</span>
                )}
              </p>
              {error && (
                <div className="flex items-center gap-1 mt-0.5 text-red-600">
                  <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <p
                    className="truncate text-[10px] sm:text-[11px] font-bold tracking-wide uppercase"
                    title={error}
                    role="alert"
                  >
                    {error}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!selected || pending}
              onClick={openConfirm}
              className="shrink-0 rounded-xl bg-[#0D1742] px-5 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] focus:outline-none focus:ring-2 focus:ring-[#0D1742]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selected && (
        <ConfirmDialog
          open={showConfirm}
          title="Confirm Booking"
          description={
            <div className="space-y-4">
              <p>
                You are about to lock in your interview for{' '}
                <strong>{formatDateLong(selected.date)}</strong> from{' '}
                <strong>
                  {selected.startTime} - {selected.endTime}
                </strong>
                .
              </p>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-[11px] font-bold tracking-wide text-amber-800 uppercase flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> This action cannot be
                  undone
                </p>
                <p className="mt-1 text-xs text-amber-700/80 font-medium">
                  You will not be able to change this slot once confirmed.
                </p>
              </div>
            </div>
          }
          confirmLabel="Confirm & Lock"
          cancelLabel="Cancel"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          loading={pending}
          variant="default"
        />
      )}
    </PublicPageShell>
  );
}

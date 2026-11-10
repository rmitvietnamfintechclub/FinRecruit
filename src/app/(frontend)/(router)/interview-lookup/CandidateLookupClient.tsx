'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Download,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mail,
  HelpCircle,
  CalendarCheck,
  RotateCcw,
} from 'lucide-react';
import { PublicPageShell } from '@/components/dashboard/PublicPageShell';
import { DEPARTMENT_META } from '@/lib/interview-scheduling/departments';
import { formatDateBand } from '@/lib/interview-scheduling/format';
import type {
  InterviewSlot,
  InterviewDepartment,
} from '@/types/interviewScheduling';
import { generateIcsCalendar } from '@/lib/interview-scheduling/ics';

const CONTACT_EMAIL = 'fintechclub.sgs@rmit.edu.vn';

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not_found'; message: string }
  | { status: 'not_passed'; message: string }
  | {
      status: 'not_scheduled';
      candidateName: string;
      department: InterviewDepartment;
    }
  | {
      status: 'found';
      booking: InterviewSlot;
      candidateName: string;
      department: InterviewDepartment;
      candidateId: string;
    };

export function CandidateLookupClient() {
  const [emailInput, setEmailInput] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>({
    status: 'idle',
  });
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputError(null);

    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setInputError('Please enter your RMIT student email.');
      return;
    }

    if (!/^s\d{7}@rmit\.edu\.vn$/i.test(email)) {
      setInputError('Email must follow format sXXXXXXX@rmit.edu.vn');
      return;
    }

    setLookupState({ status: 'loading' });

    try {
      const res = await fetch(
        `/api/public/interview-booking?email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.reason === 'NOT_PASSED_ROUND_1') {
          setLookupState({
            status: 'not_passed',
            message:
              'Sorry, this email is not eligible for Round 2 interview bookings according to our records.',
          });
          return;
        }

        setLookupState({
          status: 'not_found',
          message:
            data.message ||
            'We could not find this email in our application records. Please ensure you are using the exact student email you registered with.',
        });
        return;
      }

      // Đã pass Round 1 nhưng chưa đặt ca phỏng vấn
      if (!data.booking) {
        setLookupState({
          status: 'not_scheduled',
          candidateName: data.candidate?.fullName || 'Candidate',
          department: data.candidate?.department,
        });
        return;
      }

      // Đã book lịch thành công
      const matchedBooking = data.booking.bookings?.find(
        (b: { candidateStudentId?: string }) =>
          b.candidateStudentId?.toLowerCase() === email.split('@')[0]
      );

      setLookupState({
        status: 'found',
        booking: data.booking,
        candidateName:
          matchedBooking?.candidateName ||
          data.candidate?.fullName ||
          'Candidate',
        department: matchedBooking?.department || data.candidate?.department,
        candidateId: matchedBooking?.candidateId || '',
      });
    } catch {
      setLookupState({
        status: 'not_found',
        message: 'Could not connect to the system. Please try again.',
      });
    }
  };

  const handleDownloadIcs = () => {
    if (lookupState.status !== 'found') return;
    const { booking, candidateName, department } = lookupState;

    const icsString = generateIcsCalendar(
      booking,
      candidateName,
      emailInput.trim().toLowerCase(),
      department
    );

    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-invite-${booking.date}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleResetSearch = () => {
    setEmailInput('');
    setInputError(null);
    setLookupState({ status: 'idle' });
  };

  return (
    <PublicPageShell
      headerColor="navy"
      title="Interview Schedule Lookup"
      subtitle="Check your assigned department and confirmed interview time slot."
    >
      <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
        {/* Search Card */}
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="student-email"
                  className="block text-[11px] font-bold uppercase tracking-widest text-[#5E5E92]"
                >
                  RMIT Student Email
                </label>
                {lookupState.status !== 'idle' && (
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DCB968] hover:text-[#0D1742] transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    <span>Clear Search</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="student-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="sXXXXXXX@rmit.edu.vn"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 pr-28 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/30 focus:border-[#0D1742] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
                />
                <button
                  type="submit"
                  disabled={lookupState.status === 'loading'}
                  className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-[#0D1742] px-5 text-xs font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#1a2b75] disabled:opacity-50"
                >
                  {lookupState.status === 'loading' ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>Search</span>
                </button>
              </div>
              {inputError && (
                <p className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {inputError}
                </p>
              )}
            </div>
          </form>
        </div>

        {lookupState.status === 'idle' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-[24px] border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#0D1742]/5 text-[#0D1742]">
                  <HelpCircle className="size-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0D1742]">
                  How to check your interview schedule
                </h4>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#0D1742] text-[11px] font-black text-[#DCB968]">
                    1
                  </div>
                  <p className="text-xs font-black text-[#0D1742]">
                    Enter Student Email
                  </p>
                  <p className="text-[12px] font-medium leading-relaxed text-gray-500">
                    Use your exact RMIT student email (
                    <code className="text-[#0D1742] font-bold">
                      sXXXXXXX@rmit.edu.vn
                    </code>
                    ) submitted in your application.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#0D1742] text-[11px] font-black text-[#DCB968]">
                    2
                  </div>
                  <p className="text-xs font-black text-[#0D1742]">
                    Review Information
                  </p>
                  <p className="text-[12px] font-medium leading-relaxed text-gray-500">
                    Confirm your allocated department, interview date, session
                    time, and room at RMIT Saigon South Campus.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#0D1742] text-[11px] font-black text-[#DCB968]">
                    3
                  </div>
                  <p className="text-xs font-black text-[#0D1742]">
                    Save to Calendar
                  </p>
                  <p className="text-[12px] font-medium leading-relaxed text-gray-500">
                    Download the calendar invite file (
                    <code className="text-[#0D1742] font-bold">.ics</code>) to
                    add the session directly to Outlook or Google Calendar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. KẾT QUẢ ĐÃ CONFIRM LỊCH */}
        {lookupState.status === 'found' && (
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-md animate-in zoom-in-95 duration-300">
            <div
              className="flex items-center justify-between px-6 py-4 text-white"
              style={{
                backgroundColor:
                  DEPARTMENT_META[lookupState.department]?.strong || '#0D1742',
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#DCB968]" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Confirmed Schedule
                </span>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                Round 2 Interview
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Candidate
                </p>
                <h3 className="text-2xl font-black text-[#0D1742] tracking-tight mt-0.5">
                  {lookupState.candidateName}
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-sm">
                    <Building2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Department
                    </p>
                    <p className="text-sm font-black text-gray-900 truncate mt-0.5">
                      {DEPARTMENT_META[lookupState.department]?.full ||
                        lookupState.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shadow-sm">
                    <Calendar className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Date
                    </p>
                    <p className="text-sm font-black text-gray-900 truncate mt-0.5">
                      {formatDateBand(lookupState.booking.date, true)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-sm">
                    <Clock className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Time
                    </p>
                    <p className="text-sm font-black text-gray-900 truncate mt-0.5">
                      {lookupState.booking.startTime} -{' '}
                      {lookupState.booking.endTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 shadow-sm">
                    <MapPin className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Location
                    </p>
                    <p className="text-sm font-black text-gray-900 truncate mt-0.5">
                      Room {lookupState.booking.room} • RMIT Saigon South Campus
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0D1742] px-5 py-3 text-sm font-bold text-[#DCB968] shadow-sm transition-all hover:bg-[#1a2b75]"
                >
                  <Download className="size-4" />
                  <span>Add to Calendar (.ics)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. ĐÃ PASS ROUND 1 NHƯNG CHƯA BOOK LỊCH */}
        {lookupState.status === 'not_scheduled' && (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-6 sm:p-8 text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900">
                Hi {lookupState.candidateName}, you haven&apos;t booked your
                interview slot yet!
              </h4>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-2xl mx-auto">
                Congratulations on passing Round 1 for the{' '}
                <strong>
                  {DEPARTMENT_META[lookupState.department]?.full ||
                    lookupState.department}
                </strong>
                . Please select an interview time slot to lock in your schedule.
              </p>
            </div>
            <Link
              href="/interview-booking"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1742] px-6 py-3 text-sm font-bold text-[#DCB968] shadow-sm hover:bg-[#1a2b75] transition-all"
            >
              <span>Go to Slot Booking</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* 3. KHÔNG ĐỦ ĐIỀU KIỆN (CHƯA PASS ROUND 1) */}
        {lookupState.status === 'not_passed' && (
          <div className="rounded-[24px] border border-[#B82649]/30 bg-rose-50/50 p-6 sm:p-8 text-center space-y-4 animate-in fade-in duration-300 shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#B82649]/10 text-[#B82649]">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900">
                Not Eligible for Round 2
              </h4>
              <p className="text-sm font-medium text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
                {lookupState.message}
              </p>
            </div>
            <div className="pt-2">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Mail className="size-3.5 text-gray-500" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        )}

        {/* 4. KHÔNG TÌM THẤY HỒ SƠ EMAIL */}
        {lookupState.status === 'not_found' && (
          <div className="rounded-[24px] border border-gray-200 bg-white p-8 text-center space-y-4 animate-in fade-in duration-300 shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900">
                Email Not Found
              </h4>
              <p className="text-sm font-medium text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                {lookupState.message}
              </p>
            </div>
            <div className="pt-2">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Mail className="size-3.5 text-gray-500" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}

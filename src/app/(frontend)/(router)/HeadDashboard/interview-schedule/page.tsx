'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Interview = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  round2Status: string;
  slot: {
    date: string;
    startTime: string;
    endTime: string;
    room: string;
  };
};

type ScheduleResponse = {
  success: boolean;
  message?: string;
  interviews?: Interview[];
};

export default function InterviewSchedulePage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/head-dashboard/interview-schedule', { credentials: 'include' })
      .then(async (response) => {
        const json = (await response.json()) as ScheduleResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.message ?? 'Unable to load interview schedule.');
        }
        if (active) setInterviews(json.interviews ?? []);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to load interview schedule.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <nav className="bg-card border-border grid grid-cols-3 overflow-hidden rounded-xl border shadow-sm">
        <Link href="/HeadDashboard" className="flex items-center justify-center border-b-2 border-transparent px-2 py-3 text-center text-xs font-bold text-muted-foreground hover:text-foreground sm:text-sm">
          Candidate Evaluation
        </Link>
        <Link href="/HeadDashboard/interview-schedule" aria-current="page" className="flex items-center justify-center border-b-2 border-purple-600 px-2 py-3 text-center text-xs font-bold text-purple-600 sm:text-sm">
          Interview Schedule
        </Link>
        <Link href="/HeadDashboard/question-template" className="flex items-center justify-center border-b-2 border-transparent px-2 py-3 text-center text-xs font-bold text-muted-foreground hover:text-foreground sm:text-sm">
          Question Template
        </Link>
      </nav>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.18em]">Round 2</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Interview Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scheduled candidates in the active cohort and your department.
          </p>
        </div>

        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading interview schedule…</p>
        ) : interviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <i className="fa-regular fa-calendar-xmark text-2xl text-muted-foreground" />
            <p className="mt-3 font-bold">No interviews scheduled</p>
            <p className="mt-1 text-sm text-muted-foreground">Scheduled interview slots will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead className="bg-muted/40 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Date &amp; time</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {interviews.map((interview) => (
                  <tr key={interview.id} className="text-sm">
                    <td className="px-4 py-3">
                      <p className="font-bold">{interview.fullName}</p>
                      <p className="text-xs text-muted-foreground">{interview.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{new Date(interview.slot.date).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{interview.slot.startTime} – {interview.slot.endTime}</p>
                    </td>
                    <td className="px-4 py-3">{interview.slot.room}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-black uppercase text-yellow-800">
                        {interview.round2Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/interviews/${interview.id}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white">
                        Access Cockpit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

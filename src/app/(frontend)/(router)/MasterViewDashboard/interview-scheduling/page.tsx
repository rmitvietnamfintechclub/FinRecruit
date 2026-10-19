'use client';

import dynamic from 'next/dynamic';

const InterviewSchedulingClient = dynamic(
  () => import('@/app/(frontend)/(router)/MasterViewDashboard/interview-scheduling/InterviewSchedulingClient').then(mod => mod.InterviewSchedulingClient),
  { ssr: false }
);

export default function InterviewSchedulingPage() {
  return <InterviewSchedulingClient />;
}
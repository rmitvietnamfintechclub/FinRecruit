import { InterviewSchedulingTabs } from '@/app/(frontend)/(router)/MasterViewDashboard/interview-scheduling/InterviewSchedulingTabs';

export default function InterviewSchedulingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InterviewSchedulingTabs />
      {children}
    </>
  );
}

import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import type { InterviewDepartment } from '@/types/interviewScheduling';
import { HeadInterviewSchedulingClient } from './HeadInterviewSchedulingClient';

export default async function HeadInterviewSchedulingPage() {
  const session = await getServerSession(buildAuthOptions());
  
  const department = (session?.user?.department as InterviewDepartment) || 'Technology Department';

  return (
    <HeadInterviewSchedulingClient department={department} />
  );
}
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import type { InterviewDepartment } from '@/types/interviewScheduling';
import { MemberInterviewSchedulingClient } from './MemberInterviewSchedulingClient';

export default async function MemberInterviewSchedulingPage() {
  const session = await getServerSession(buildAuthOptions());
  
  const department = (session?.user?.department as InterviewDepartment) || 'Technology Department';

  return (
    <MemberInterviewSchedulingClient department={department} />
  );
}
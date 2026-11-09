import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { InterviewCockpitClient } from '@/components/interview-cockpit/InterviewCockpitClient';
import type { CockpitRole } from '@/lib/interview-cockpit/types';

const ALLOWED_ROLES = ['Executive Board', 'Department Head', 'Member'];

export default async function InterviewCockpitPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const session = await getServerSession(buildAuthOptions());
  
  if (!session?.user?.id || !session?.user?.email) redirect('/loginPage');
  
  if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role as string)) {
    redirect('/waiting-room');
  }

  return (
    <InterviewCockpitClient
      candidateId={candidateId}
      currentUser={{
        id: session.user.id,
        email: session.user.email,
        name:
          session.user.name?.trim() ||
          session.user.email.split('@')[0],
        role: session.user.role as CockpitRole, 
      }}
    />
  );
}
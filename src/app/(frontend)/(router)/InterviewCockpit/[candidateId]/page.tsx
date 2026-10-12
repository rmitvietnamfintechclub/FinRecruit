import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { InterviewCockpitClient } from '@/components/interview-cockpit/InterviewCockpitClient';

export default async function InterviewCockpitPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const session = await getServerSession(buildAuthOptions());
  if (!session?.user) redirect('/loginPage');
  if (
    session.user.role !== 'Department Head' &&
    session.user.role !== 'Member'
  ) {
    redirect('/waiting-room');
  }
  if (!session.user.id || !session.user.email) redirect('/loginPage');

  return (
    <InterviewCockpitClient
      candidateId={candidateId}
      currentUser={{
        id: session.user.id,
        email: session.user.email,
        name:
          session.user.name?.trim() ||
          session.user.email.split('@')[0] ||
          session.user.email,
        role: session.user.role,
      }}
    />
  );
}

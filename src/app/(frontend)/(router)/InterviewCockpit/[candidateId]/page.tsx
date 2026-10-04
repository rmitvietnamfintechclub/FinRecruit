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

  const role =
    session.user.role === 'Department Head' ? 'Department Head' : 'Member';

  return <InterviewCockpitClient candidateId={candidateId} role={role} />;
}

import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import Candidate from '@/app/(backend)/models/Candidate';
import type { CandidateChoiceType, DepartmentType } from '@/app/(backend)/types';

export const runtime = 'nodejs';

const CHOICE_VALUES: CandidateChoiceType[] = [
  'Technology Department',
  'Business Department',
  'HR Department',
  'Marketing Department',
];

type IntakeBody = {
  fullName?: string;
  email?: string;
  dob?: string;
  phone?: string;
  majorAndYear?: string;
  facebookLink?: string;
  cvLink?: string;
  futurePlans?: string;
  fintechAspect?: string;
  achievementExpectation?: string;
  timeCommitment?: string;
  explanation?: string;
  questionsForUs?: string;
  choice1?: string;
  choice2?: string;
  customAnswers?: Array<{ question?: string; answer?: string }>;
};

function unauthorized() {
  return NextResponse.json(
    { success: false, message: 'Unauthorized.' },
    { status: 401 }
  );
}

function isValidChoice(value: string): value is CandidateChoiceType {
  return CHOICE_VALUES.includes(value as CandidateChoiceType);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CANDIDATE_INTAKE_SECRET?.trim();
  if (secret) {
    const header =
      req.headers.get('x-intake-secret') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (header !== secret) {
      return unauthorized();
    }
  }

  let body: IntakeBody;
  try {
    body = (await req.json()) as IntakeBody;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const active = await getActiveConfig();
  if (!active.isRecruitmentActive) {
    return NextResponse.json(
      { success: false, message: 'Recruitment is not active.' },
      { status: 403 }
    );
  }

  const required: Array<keyof IntakeBody> = [
    'fullName',
    'email',
    'dob',
    'phone',
    'majorAndYear',
    'facebookLink',
    'cvLink',
    'futurePlans',
    'fintechAspect',
    'achievementExpectation',
    'timeCommitment',
    'choice1',
  ];

  for (const key of required) {
    const val = body[key];
    if (typeof val !== 'string' || !val.trim()) {
      return NextResponse.json(
        { success: false, message: `Missing or invalid field: ${key}.` },
        { status: 400 }
      );
    }
  }

  if (!isValidChoice(body.choice1!.trim())) {
    return NextResponse.json(
      { success: false, message: 'Invalid choice1 department.' },
      { status: 400 }
    );
  }

  const choice2Raw = body.choice2?.trim() ?? '';
  if (choice2Raw && !isValidChoice(choice2Raw)) {
    return NextResponse.json(
      { success: false, message: 'Invalid choice2 department.' },
      { status: 400 }
    );
  }

  const email = body.email!.trim().toLowerCase();
  await dbConnect();

  const existing = await Candidate.findOne({ email }).select('_id').lean().exec();
  if (existing) {
    return NextResponse.json(
      { success: false, message: 'Candidate with this email already exists.' },
      { status: 409 }
    );
  }

  const department: DepartmentType = body.choice1!.trim() as DepartmentType;
  const customAnswers = (body.customAnswers ?? [])
    .filter((a) => a.question?.trim())
    .map((a) => ({
      question: a.question!.trim(),
      answer: a.answer?.trim() ?? '',
    }));

  try {
    const doc = await Candidate.create({
      fullName: body.fullName!.trim(),
      email,
      dob: body.dob!.trim(),
      phone: body.phone!.trim(),
      majorAndYear: body.majorAndYear!.trim(),
      facebookLink: body.facebookLink!.trim(),
      cvLink: body.cvLink!.trim(),
      futurePlans: body.futurePlans!.trim(),
      fintechAspect: body.fintechAspect!.trim(),
      achievementExpectation: body.achievementExpectation!.trim(),
      timeCommitment: body.timeCommitment!.trim(),
      explanation: body.explanation?.trim() ?? '',
      questionsForUs: body.questionsForUs?.trim() ?? '',
      choice1: body.choice1!.trim(),
      choice2: choice2Raw,
      department,
      status: 'Pending',
      isRerouted: false,
      customAnswers,
      generation: active.currentGeneration,
      semester: active.currentSemester,
    });

    return NextResponse.json(
      {
        success: true,
        candidateId: doc._id.toString(),
        generation: active.currentGeneration,
        semester: active.currentSemester,
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to create candidate.',
      },
      { status: 500 }
    );
  }
}

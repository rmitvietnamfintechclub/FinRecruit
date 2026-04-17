import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  DASHBOARD_STATUS_OPTIONS,
  serializeCandidateDetail,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

export const runtime = 'nodejs';

type CandidateDetailRouteContext = {
  params: Promise<{ candidateId: string }>;
};

export const GET = withRBAC<CandidateDetailRouteContext>(
  'Department Head',
  async (_req: NextRequest, { session, params }) => {
    const assignedDepartment = normalizeHeadDepartment(session.user.department);

    if (!assignedDepartment) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The authenticated Department Head account does not have a valid department assignment.',
        },
        { status: 403 }
      );
    }

    const { candidateId } = await params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'A valid candidateId is required.',
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const candidate = await Candidate.findOne({
      _id: candidateId,
      department: assignedDepartment,
      status: { $in: [...DASHBOARD_STATUS_OPTIONS] },
    })
      .select(
        [
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
          'explanation',
          'questionsForUs',
          'choice1',
          'choice2',
          'department',
          'status',
          'customAnswers',
          'generation',
          'semester',
          'appliedAt',
          'updatedAt',
        ].join(' ')
      )
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Candidate not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Candidate details fetched successfully.',
        candidate: serializeCandidateDetail({
          ...candidate,
          _id: candidate._id as mongoose.Types.ObjectId,
          choice2: candidate.choice2 ?? null,
          cvLink: candidate.cvLink,
          dob: candidate.dob,
          majorAndYear: candidate.majorAndYear,
          facebookLink: candidate.facebookLink,
          futurePlans: candidate.futurePlans,
          fintechAspect: candidate.fintechAspect,
          achievementExpectation: candidate.achievementExpectation,
          timeCommitment: candidate.timeCommitment,
          explanation: candidate.explanation ?? '',
          questionsForUs: candidate.questionsForUs ?? '',
        }),
        meta: {
          allowedStatusOptions: [...DASHBOARD_STATUS_OPTIONS],
          permissions: {
            canUpdateStatus: true,
            canEditSubmittedData: false,
            canDeleteCandidate: false,
          },
        },
      },
      { status: 200 }
    );
  }
);

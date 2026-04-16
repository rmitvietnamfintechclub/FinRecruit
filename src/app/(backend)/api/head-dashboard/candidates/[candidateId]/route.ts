import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  DASHBOARD_STATUS_OPTIONS,
  isHeadDepartment,
  serializeCandidateDetail,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

export const runtime = 'nodejs';

type CandidateDetailRouteContext = {
  params: Promise<{ candidateId: string }>;
};

export const GET = withRBAC<CandidateDetailRouteContext>(
  'Department Head',
  async (_req: NextRequest, { session, params }) => {
    const assignedDepartment = session.user.department;

    if (!isHeadDepartment(assignedDepartment)) {
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
        'studentId fullName email phone cvLink choice1 choice2 department status customAnswers generation semester appliedAt updatedAt'
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
          choice2: candidate.choice2 ?? null,
          customAnswers:
            candidate.customAnswers &&
            typeof candidate.customAnswers === 'object' &&
            !Array.isArray(candidate.customAnswers)
              ? (candidate.customAnswers as Record<string, unknown>)
              : {},
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

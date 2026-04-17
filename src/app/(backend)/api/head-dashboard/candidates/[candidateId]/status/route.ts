import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  DASHBOARD_STATUS_OPTIONS,
  parseDashboardStatus,
  resolveCandidateStatusChange,
  serializeCandidateListItem,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import { isHeadDepartment } from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

export const runtime = 'nodejs';

type CandidateStatusRouteContext = {
  params: Promise<{ candidateId: string }>;
};

type CandidateStatusUpdatePayload = {
  status?: string;
  confirmReroute?: boolean;
};

export const PATCH = withRBAC<CandidateStatusRouteContext>(
  'Department Head',
  async (req: NextRequest, { session, params }) => {
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

    let body: CandidateStatusUpdatePayload;

    try {
      body = (await req.json()) as CandidateStatusUpdatePayload;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON payload.',
        },
        { status: 400 }
      );
    }

    const requestedStatus = parseDashboardStatus(body.status ?? null);

    if (!requestedStatus) {
      return NextResponse.json(
        {
          success: false,
          message: `A valid status is required. Supported values: ${DASHBOARD_STATUS_OPTIONS.join(', ')}.`,
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
        'fullName email phone cvLink choice1 choice2 department status customAnswers generation semester appliedAt updatedAt'
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

    const decision = resolveCandidateStatusChange(
      {
        choice1: candidate.choice1,
        choice2: candidate.choice2 ?? null,
        department: candidate.department,
      },
      requestedStatus,
      Boolean(body.confirmReroute)
    );

    if (decision.kind === 'reroute-confirmation-required') {
      return NextResponse.json(
        {
          success: false,
          code: decision.code,
          message: decision.message,
          requiresConfirmation: true,
          reroutePreview: {
            targetDepartment: decision.targetDepartment,
            resultingStatus: 'Pending',
          },
          candidate: serializeCandidateListItem({
            ...candidate,
            _id: candidate._id as mongoose.Types.ObjectId,
            choice2: candidate.choice2 ?? null,
          }),
        },
        { status: 409 }
      );
    }

    const updatePayload =
      decision.kind === 'reroute'
        ? {
            status: decision.nextStatus,
            department: decision.targetDepartment,
          }
        : {
            status: decision.nextStatus,
          };

    const updatedCandidate = await Candidate.findOneAndUpdate(
      {
        _id: candidateId,
        department: assignedDepartment,
        status: { $in: [...DASHBOARD_STATUS_OPTIONS] },
      },
      {
        $set: updatePayload,
      },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    )
      .select(
        'fullName email phone cvLink choice1 choice2 department status customAnswers generation semester appliedAt updatedAt'
      )
      .lean()
      .exec();

    if (!updatedCandidate) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Candidate could not be updated because their routing state changed. Please refresh and try again.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: decision.code,
        message: decision.message,
        candidate: serializeCandidateListItem({
          ...updatedCandidate,
          _id: updatedCandidate._id as mongoose.Types.ObjectId,
          choice2: updatedCandidate.choice2 ?? null,
        }),
      },
      { status: 200 }
    );
  }
);

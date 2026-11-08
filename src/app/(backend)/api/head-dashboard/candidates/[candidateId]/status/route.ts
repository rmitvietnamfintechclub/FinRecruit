import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  DASHBOARD_STATUS_OPTIONS,
  parseDashboardStatus,
  resolveCandidateStatusChange,
  serializeCandidateListItem,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import {
  departmentHeadCandidateVisibilityFilter,
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

export const runtime = 'nodejs';

type CandidateStatusRouteContext = {
  params: Promise<{ candidateId: string }>;
};

type CandidateStatusUpdatePayload = {
  status?: string;
  confirmReroute?: boolean;
  targetRound?: 1 | 2; // <-- Cờ báo hiệu đang update cho Round 1 hay Round 2
};

export const PATCH = withRBAC<CandidateStatusRouteContext>(
  'Department Head',
  async (req: NextRequest, { session, params }) => {
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
    const isRound2 = body.targetRound === 2;

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

    // Đối với Round 2, chúng ta không cần gò bó điều kiện status phải nằm trong mảng của Round 1
    const candidateQuery = isRound2 
      ? { _id: candidateId, ...departmentHeadCandidateVisibilityFilter(assignedDepartment) }
      : { _id: candidateId, ...departmentHeadCandidateVisibilityFilter(assignedDepartment), status: { $in: [...DASHBOARD_STATUS_OPTIONS] } };

    const candidate = await Candidate.findOne(candidateQuery)
      .select(
        'fullName email phone dob cvLink choice1 choice2 department status round2Status customAnswers generation semester appliedAt createdAt updatedAt'
      )
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Candidate not found or not accessible in this round.',
        },
        { status: 404 }
      );
    }

    let updatePayload: {
      status?: string;
      round2Status?: string;
      department?: string;
    } = {};
    let codeStr = 'status_updated';
    let msgStr = 'Status updated successfully.';

    // ==========================================
    // LOGIC CHO ROUND 2
    // ==========================================
    if (isRound2) {
      // Vòng 2: Pass là Pass, Fail là Fail, không rẽ nhánh.
      updatePayload = { round2Status: requestedStatus };
    } 
    // ==========================================
    // LOGIC CHO ROUND 1 (Giữ nguyên)
    // ==========================================
    else {
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

      updatePayload =
        decision.kind === 'reroute'
          ? {
              status: decision.nextStatus,
              department: decision.targetDepartment,
            }
          : {
              status: decision.nextStatus,
              ...(decision.nextStatus === 'Pass' &&
              candidate.department === 'Unassigned'
                ? { department: assignedDepartment }
                : {}),
            };
            
      codeStr = decision.code;
      msgStr = decision.message;
    }

    // Thực hiện Update
    const updatedCandidate = await Candidate.findOneAndUpdate(
      candidateQuery,
      { $set: updatePayload },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    )
      .select(
        'fullName email phone dob cvLink choice1 choice2 department status round2Status customAnswers generation semester appliedAt createdAt updatedAt'
      )
      .lean()
      .exec();

    if (!updatedCandidate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Candidate could not be updated because their routing state changed. Please refresh and try again.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: codeStr,
        message: msgStr,
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
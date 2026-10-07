import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import {
  ROUND2_DECISIONS,
  type Round2DecisionType,
  type StatusType,
} from '@/app/(backend)/types';

type InterviewStatusRouteContext = {
  params: Promise<{ id: string }>;
};

export const PATCH = withRBAC<InterviewStatusRouteContext>(
  'Department Head',
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );
      const body = (await req.json()) as {
        round2Status?: unknown;
        round2Decision?: unknown;
      };

      if (!assignedDepartment) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_DEPARTMENT',
            message:
              'Your account does not have a valid department assignment.',
          },
          { status: 403 }
        );
      }

      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_CANDIDATE_ID',
            message: 'A valid candidate ID is required.',
          },
          { status: 400 }
        );
      }

      const round2Status = body.round2Status as StatusType | undefined;

      if (
        !round2Status ||
        !['Pass', 'Pending', 'Fail'].includes(round2Status)
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_STATUS',
            message: 'Invalid status. Must be Pass, Pending, or Fail',
          },
          { status: 400 }
        );
      }

      const fallbackDecision: Round2DecisionType | null =
        round2Status === 'Pass'
          ? 'Pass'
          : round2Status === 'Fail'
            ? 'Fail'
            : null;
      const round2Decision =
        body.round2Decision === undefined
          ? fallbackDecision
          : body.round2Decision;

      if (
        round2Decision !== null &&
        !ROUND2_DECISIONS.includes(round2Decision as Round2DecisionType)
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_DECISION',
            message: 'Decision must be Pass, Fail, No Show, or null.',
          },
          { status: 400 }
        );
      }

      const expectedStatus =
        round2Decision === 'Pass'
          ? 'Pass'
          : round2Decision === 'Fail' || round2Decision === 'No Show'
            ? 'Fail'
            : 'Pending';

      if (round2Status !== expectedStatus) {
        return NextResponse.json(
          {
            success: false,
            code: 'INCONSISTENT_DECISION',
            message:
              'round2Status does not match round2Decision. No Show must use status Fail.',
          },
          { status: 400 }
        );
      }

      const updatedCandidate = await Candidate.findOneAndUpdate(
        {
          _id: candidateId,
          department: assignedDepartment,
          status: 'Pass',
        },
        {
          $set: {
            round2Status,
            round2Decision,
          },
        },
        { new: true, runValidators: true }
      );

      if (!updatedCandidate) {
        return NextResponse.json(
          {
            success: false,
            code: 'CANDIDATE_NOT_FOUND',
            message: 'Candidate not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Candidate Round 2 status set to ${round2Status}`,
        data: {
          id: updatedCandidate.id,
          round2Status: updatedCandidate.round2Status,
          round2Decision: updatedCandidate.round2Decision ?? null,
        },
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          code: 'SERVER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Could not update the Round 2 decision.',
        },
        { status: 500 }
      );
    }
  }
);

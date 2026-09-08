import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';

type InterviewStatusRouteContext = {
  params: Promise<{ id: string }>;
};

export const PATCH = withRBAC<InterviewStatusRouteContext>(
  'Department Head',
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const { round2Status } = await req.json();

      if (!['Pass', 'Pending', 'Fail'].includes(round2Status)) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_STATUS',
            message: 'Invalid status. Must be Pass, Pending, or Fail',
          },
          { status: 400 }
        );
      }

      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $set: { round2Status } },
        { new: true }
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
        },
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, code: 'SERVER_ERROR', message: error.message },
        { status: 500 }
      );
    }
  }
);

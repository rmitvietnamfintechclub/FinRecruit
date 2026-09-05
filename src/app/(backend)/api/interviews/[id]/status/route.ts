import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Candidate from '@/types/models/Candidate';
import { withRBAC } from '@/middleware/auth';

export const PATCH = withRBAC(['HEAD'], async (req: NextRequest, sessionUser: any, { params }: { params: { id: string } }) => {
  try {
    await connectToDatabase();
    const candidateId = params.id;
    const { round2Status } = await req.json();

    if (!['Pass', 'Pending', 'Fail'].includes(round2Status)) {
      return NextResponse.json(
        { success: false, code: 'INVALID_STATUS', message: 'Invalid status. Must be Pass, Pending, or Fail' },
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
        { success: false, code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' },
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
});
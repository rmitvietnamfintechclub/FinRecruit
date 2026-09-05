import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';

type InterviewAdHocRouteContext = {
  params: Promise<{ id: string }>;
};

export const POST = withRBAC<InterviewAdHocRouteContext>(
  ['Department Head', 'Member'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const { question, answer } = await req.json();

      if (!question || typeof question !== 'string') {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_INPUT',
            message: 'Question content is required',
          },
          { status: 400 }
        );
      }

      const adHocItem = {
        question: question.trim(),
        answer: answer ? answer.trim() : '',
        addedBy: session.user.email,
      };

      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $push: { 'round2Evaluation.adHocQuestions': adHocItem } },
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
        message: 'Ad-hoc question injected successfully',
        data: updatedCandidate.round2Evaluation?.adHocQuestions,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, code: 'SERVER_ERROR', message: error.message },
        { status: 500 }
      );
    }
  }
);

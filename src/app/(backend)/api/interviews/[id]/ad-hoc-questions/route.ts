import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Candidate from '@/types/models/Candidate';
import { withRBAC } from '@/middleware/auth';

export const POST = withRBAC(['HEAD', 'MEMBER'], async (req: NextRequest, sessionUser: any, { params }: { params: { id: string } }) => {
  try {
    await connectToDatabase();
    const candidateId = params.id;
    const { question, answer } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, code: 'INVALID_INPUT', message: 'Question content is required' },
        { status: 400 }
      );
    }

    const adHocItem = {
      question: question.trim(),
      answer: answer ? answer.trim() : '',
      addedBy: sessionUser.email,
    };

    // Appends only to the individual candidate's record
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { $push: { 'round2Evaluation.adHocQuestions': adHocItem } },
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
      message: 'Ad-hoc question injected successfully',
      data: updatedCandidate.round2Evaluation?.adHocQuestions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
});
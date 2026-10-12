import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';

type InterviewAdHocRouteContext = {
  params: Promise<{ id: string }>;
};

export const POST = withRBAC<InterviewAdHocRouteContext>(
  ['Department Head', 'Member'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const question = body.question;
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

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

      if (typeof question !== 'string' || !question.trim()) {
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
        answer: '',
        addedBy: session.user.email,
        score: null,
      };

      const updatedCandidate = await Candidate.findOneAndUpdate(
        {
          _id: candidateId,
          department: assignedDepartment,
          status: 'Pass',
        },
        { $push: { 'round2Evaluation.adHocQuestions': adHocItem } },
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
        message: 'Ad-hoc question injected successfully',
        data: updatedCandidate.round2Evaluation?.adHocQuestions,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          code: 'SERVER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Could not add the custom question.',
        },
        { status: 500 }
      );
    }
  }
);

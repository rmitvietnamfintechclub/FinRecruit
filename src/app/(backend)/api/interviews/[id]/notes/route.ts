import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';

type InterviewNotesRouteContext = {
  params: Promise<{ id: string }>;
};

export const PATCH = withRBAC<InterviewNotesRouteContext>(
  ['Department Head', 'Member'],
  async (req: NextRequest, { params }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = await req.json();

      const updatePayload: Record<string, any> = {};

      if (
        body.score !== undefined &&
        body.score !== null &&
        (!Number.isInteger(body.score) || body.score < 0 || body.score > 100)
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_SCORE',
            message: 'Overall score must be a whole number from 0 to 100.',
          },
          { status: 400 }
        );
      }

      if (
        body.adHocQuestions !== undefined &&
        (!Array.isArray(body.adHocQuestions) ||
          body.adHocQuestions.some(
            (item: unknown) =>
              !item ||
              typeof item !== 'object' ||
              typeof (item as { question?: unknown }).question !== 'string' ||
              typeof (item as { answer?: unknown }).answer !== 'string'
          ))
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_AD_HOC_QUESTIONS',
            message:
              'Custom questions must contain string question and answer fields.',
          },
          { status: 400 }
        );
      }

      if (body.$set) {
        Object.keys(body.$set).forEach((key) => {
          if (
            key.startsWith('notes.') ||
            key.startsWith('round2Evaluation.notes.')
          ) {
            const sanitizedKey = key.startsWith('round2Evaluation.')
              ? key
              : `round2Evaluation.${key}`;
            updatePayload[sanitizedKey] = body.$set[key];
          }
        });
      } else {
        if (body.note1 !== undefined)
          updatePayload['round2Evaluation.notes.note1'] = body.note1;
        if (body.note2 !== undefined)
          updatePayload['round2Evaluation.notes.note2'] = body.note2;
        if (body.note3 !== undefined)
          updatePayload['round2Evaluation.notes.note3'] = body.note3;
        if (body.score !== undefined)
          updatePayload['round2Evaluation.score'] = body.score;
        if (body.templateAnswers !== undefined)
          updatePayload['round2Evaluation.templateAnswers'] =
            body.templateAnswers;
        if (body.adHocQuestions !== undefined)
          updatePayload['round2Evaluation.adHocQuestions'] =
            body.adHocQuestions;
      }

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_PAYLOAD',
            message: 'No valid evaluation fields provided for update',
          },
          { status: 400 }
        );
      }

      const updatedCandidate = await Candidate.findByIdAndUpdate(
        candidateId,
        { $set: updatePayload },
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
        message: 'Evaluation updated successfully',
        data: {
          notes: updatedCandidate.round2Evaluation?.notes,
          score: updatedCandidate.round2Evaluation?.score,
          templateAnswers: updatedCandidate.round2Evaluation?.templateAnswers,
          adHocQuestions: updatedCandidate.round2Evaluation?.adHocQuestions,
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

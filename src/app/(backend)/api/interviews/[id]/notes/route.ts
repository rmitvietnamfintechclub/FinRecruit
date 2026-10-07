import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import {
  calculateOverallScore,
  isValidQuestionScore,
  questionScore,
} from '@/app/(backend)/libs/round2Evaluation';
import type { ICollaborativeNote, ICustomAnswer } from '@/app/(backend)/types';

type InterviewNotesRouteContext = {
  params: Promise<{ id: string }>;
};

type RawAnswer = {
  question?: unknown;
  answer?: unknown;
  addedBy?: unknown;
  score?: unknown;
};

function sanitizeAnswers(value: unknown): ICustomAnswer[] | null {
  if (!Array.isArray(value)) return null;

  const isValid = value.every(
    (item: unknown) =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as RawAnswer).question === 'string' &&
      typeof (item as RawAnswer).answer === 'string' &&
      isValidQuestionScore((item as RawAnswer).score)
  );

  if (!isValid) return null;

  return value.map((item: RawAnswer) => ({
    question: String(item.question),
    answer: String(item.answer),
    ...(typeof item.addedBy === 'string' ? { addedBy: item.addedBy } : {}),
    score: questionScore(item.score),
  }));
}

function serializeOwnGeneralNote(
  notes: ICollaborativeNote[] | undefined,
  authorId: string
) {
  return [...(notes ?? [])]
    .filter((note) => String(note.authorId) === authorId)
    .map((note) => ({
      authorId: String(note.authorId),
      authorEmail: String(note.authorEmail),
      authorName: String(note.authorName),
      role: note.role,
      content: String(note.content ?? ''),
      updatedAt:
        note.updatedAt instanceof Date
          ? note.updatedAt.toISOString()
          : String(note.updatedAt),
    }))
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
}

function invalidDepartmentResponse() {
  return NextResponse.json(
    {
      success: false,
      code: 'INVALID_DEPARTMENT',
      message: 'Your account does not have a valid department assignment.',
    },
    { status: 403 }
  );
}

function invalidCandidateIdResponse() {
  return NextResponse.json(
    {
      success: false,
      code: 'INVALID_CANDIDATE_ID',
      message: 'A valid candidate ID is required.',
    },
    { status: 400 }
  );
}

function headOnlyGeneralNotesResponse() {
  return NextResponse.json(
    {
      success: false,
      code: 'HEAD_ONLY_GENERAL_NOTES',
      message: 'General Notes are available only to the Department Head.',
    },
    { status: 403 }
  );
}

export const GET = withRBAC<InterviewNotesRouteContext>(
  'Department Head',
  async (_req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      if (!assignedDepartment) return invalidDepartmentResponse();
      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return invalidCandidateIdResponse();
      }

      const candidate = await Candidate.findOne({
        _id: candidateId,
        department: assignedDepartment,
        status: 'Pass',
      })
        .select('round2Evaluation.collaborativeNotes')
        .lean()
        .exec();

      if (!candidate) {
        return NextResponse.json(
          {
            success: false,
            code: 'CANDIDATE_NOT_FOUND',
            message: 'Candidate not found.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'General Notes retrieved successfully.',
        data: {
          collaborativeNotes: serializeOwnGeneralNote(
            candidate.round2Evaluation?.collaborativeNotes,
            session.user.id
          ),
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
              : 'Could not retrieve collaborative notes.',
        },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withRBAC<InterviewNotesRouteContext>(
  ['Department Head', 'Member'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      if (!assignedDepartment) return invalidDepartmentResponse();
      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return invalidCandidateIdResponse();
      }

      const body = (await req.json()) as Record<string, unknown>;
      const candidateScope = {
        _id: candidateId,
        department: assignedDepartment,
        status: 'Pass',
      };
      const legacySetKeys =
        body.$set && typeof body.$set === 'object'
          ? Object.keys(body.$set as Record<string, unknown>)
          : [];
      const hasLegacyGeneralNoteMutation =
        body.note1 !== undefined ||
        body.note2 !== undefined ||
        body.note3 !== undefined ||
        legacySetKeys.some(
          (key) =>
            key.startsWith('notes.') ||
            key.startsWith('round2Evaluation.notes.')
        );

      if (
        session.user.role !== 'Department Head' &&
        (body.collaborativeNote !== undefined || hasLegacyGeneralNoteMutation)
      ) {
        return headOnlyGeneralNotesResponse();
      }

      if (body.collaborativeNote !== undefined) {
        if (typeof body.collaborativeNote !== 'string') {
          return NextResponse.json(
            {
              success: false,
              code: 'INVALID_COLLABORATIVE_NOTE',
              message: 'Collaborative note content must be a string.',
            },
            { status: 400 }
          );
        }

        const authorId = session.user.id;
        const authorEmail = session.user.email;
        const authorName =
          session.user.name?.trim() ||
          session.user.email.split('@')[0] ||
          session.user.email;
        const role = 'Department Head' as const;
        const updatedAt = new Date();

        let updatedCandidate = await Candidate.findOneAndUpdate(
          {
            ...candidateScope,
            'round2Evaluation.collaborativeNotes.authorId': authorId,
          },
          {
            $set: {
              'round2Evaluation.collaborativeNotes.$[note].authorEmail':
                authorEmail,
              'round2Evaluation.collaborativeNotes.$[note].authorName':
                authorName,
              'round2Evaluation.collaborativeNotes.$[note].role': role,
              'round2Evaluation.collaborativeNotes.$[note].content':
                body.collaborativeNote,
              'round2Evaluation.collaborativeNotes.$[note].updatedAt':
                updatedAt,
            },
          },
          {
            arrayFilters: [{ 'note.authorId': authorId }],
            new: true,
            runValidators: true,
          }
        );

        if (!updatedCandidate) {
          updatedCandidate = await Candidate.findOneAndUpdate(
            {
              ...candidateScope,
              'round2Evaluation.collaborativeNotes.authorId': {
                $ne: authorId,
              },
            },
            {
              $push: {
                'round2Evaluation.collaborativeNotes': {
                  authorId,
                  authorEmail,
                  authorName,
                  role,
                  content: body.collaborativeNote,
                  updatedAt,
                },
              },
            },
            { new: true, runValidators: true }
          );
        }

        // If two first saves for the same author race, the push condition lets
        // only one win. Retry the positional update for the other request.
        if (!updatedCandidate) {
          updatedCandidate = await Candidate.findOneAndUpdate(
            {
              ...candidateScope,
              'round2Evaluation.collaborativeNotes.authorId': authorId,
            },
            {
              $set: {
                'round2Evaluation.collaborativeNotes.$[note].authorEmail':
                  authorEmail,
                'round2Evaluation.collaborativeNotes.$[note].authorName':
                  authorName,
                'round2Evaluation.collaborativeNotes.$[note].role': role,
                'round2Evaluation.collaborativeNotes.$[note].content':
                  body.collaborativeNote,
                'round2Evaluation.collaborativeNotes.$[note].updatedAt':
                  updatedAt,
              },
            },
            {
              arrayFilters: [{ 'note.authorId': authorId }],
              new: true,
              runValidators: true,
            }
          );
        }

        if (!updatedCandidate) {
          return NextResponse.json(
            {
              success: false,
              code: 'CANDIDATE_NOT_FOUND',
              message: 'Candidate not found.',
            },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'General Notes saved successfully.',
          data: {
            collaborativeNotes: serializeOwnGeneralNote(
              updatedCandidate.round2Evaluation?.collaborativeNotes,
              session.user.id
            ),
          },
        });
      }

      if (body.score !== undefined) {
        return NextResponse.json(
          {
            success: false,
            code: 'OVERALL_SCORE_IS_COMPUTED',
            message:
              'Overall score is calculated from scored questions and cannot be set directly.',
          },
          { status: 400 }
        );
      }

      const candidate = await Candidate.findOne(candidateScope)
        .select('round2Evaluation')
        .exec();

      if (!candidate) {
        return NextResponse.json(
          {
            success: false,
            code: 'CANDIDATE_NOT_FOUND',
            message: 'Candidate not found.',
          },
          { status: 404 }
        );
      }

      const updatePayload: Record<string, unknown> = {};

      if (body.$set && typeof body.$set === 'object') {
        Object.entries(body.$set as Record<string, unknown>).forEach(
          ([key, value]) => {
            if (
              key.startsWith('notes.') ||
              key.startsWith('round2Evaluation.notes.')
            ) {
              const sanitizedKey = key.startsWith('round2Evaluation.')
                ? key
                : `round2Evaluation.${key}`;
              updatePayload[sanitizedKey] = value;
            }
          }
        );
      } else {
        if (body.note1 !== undefined)
          updatePayload['round2Evaluation.notes.note1'] = body.note1;
        if (body.note2 !== undefined)
          updatePayload['round2Evaluation.notes.note2'] = body.note2;
        if (body.note3 !== undefined)
          updatePayload['round2Evaluation.notes.note3'] = body.note3;
      }

      let templateAnswers = (candidate.round2Evaluation?.templateAnswers ||
        []) as ICustomAnswer[];
      let adHocQuestions = (candidate.round2Evaluation?.adHocQuestions ||
        []) as ICustomAnswer[];

      if (body.templateAnswers !== undefined) {
        const sanitized = sanitizeAnswers(body.templateAnswers);
        if (!sanitized) {
          return NextResponse.json(
            {
              success: false,
              code: 'INVALID_TEMPLATE_ANSWERS',
              message:
                'Template answers require string question/answer fields and an optional whole-number score from 0 to 100.',
            },
            { status: 400 }
          );
        }
        templateAnswers = sanitized;
        updatePayload['round2Evaluation.templateAnswers'] = sanitized;
      }

      if (body.adHocQuestions !== undefined) {
        const sanitized = sanitizeAnswers(body.adHocQuestions);
        if (!sanitized) {
          return NextResponse.json(
            {
              success: false,
              code: 'INVALID_AD_HOC_QUESTIONS',
              message:
                'Custom questions require string question/answer fields and an optional whole-number score from 0 to 100.',
            },
            { status: 400 }
          );
        }
        adHocQuestions = sanitized;
        updatePayload['round2Evaluation.adHocQuestions'] = sanitized;
      }

      if (
        body.templateAnswers !== undefined ||
        body.adHocQuestions !== undefined
      ) {
        updatePayload['round2Evaluation.score'] = calculateOverallScore(
          templateAnswers,
          adHocQuestions
        );
      }

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_PAYLOAD',
            message: 'No valid evaluation fields provided for update.',
          },
          { status: 400 }
        );
      }

      const updatedCandidate = await Candidate.findOneAndUpdate(
        candidateScope,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );

      if (!updatedCandidate) {
        return NextResponse.json(
          {
            success: false,
            code: 'CANDIDATE_NOT_FOUND',
            message: 'Candidate not found.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Evaluation updated successfully.',
        data: {
          notes:
            session.user.role === 'Department Head'
              ? updatedCandidate.round2Evaluation?.notes
              : { note1: '', note2: '', note3: '' },
          collaborativeNotes:
            session.user.role === 'Department Head'
              ? serializeOwnGeneralNote(
                  updatedCandidate.round2Evaluation?.collaborativeNotes,
                  session.user.id
                )
              : [],
          score: updatedCandidate.round2Evaluation?.score ?? null,
          templateAnswers:
            updatedCandidate.round2Evaluation?.templateAnswers ?? [],
          adHocQuestions:
            updatedCandidate.round2Evaluation?.adHocQuestions ?? [],
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
              : 'Could not update the evaluation.',
        },
        { status: 500 }
      );
    }
  }
);

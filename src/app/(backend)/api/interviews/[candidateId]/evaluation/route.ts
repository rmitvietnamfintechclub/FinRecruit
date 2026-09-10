import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  departmentHeadCandidateVisibilityFilter,
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

type Context = { params: Promise<{ candidateId: string }> };

type EvaluationPayload = {
  note1?: string;
  note2?: string;
  note3?: string;
  score?: number | null;
  templateAnswers?: Array<{ question: string; answer: string }>;
  adHocQuestions?: Array<{ question: string; answer: string }>;
  finalStatus?: 'Pass' | 'Fail';
};

export const PATCH = withRBAC<Context>(
  ['Department Head', 'Member'],
  async (req: NextRequest, { session, params }) => {
    const { candidateId } = await params;
    const department = normalizeHeadDepartment(session.user.department);
    if (!department || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return NextResponse.json(
        { success: false, message: 'A valid candidate and department are required.' },
        { status: 400 }
      );
    }

    let body: EvaluationPayload;
    try {
      body = (await req.json()) as EvaluationPayload;
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
    }

    if (body.finalStatus && session.user.role !== 'Department Head') {
      return NextResponse.json(
        { success: false, message: 'Only the Department Head can finalize Round 2.' },
        { status: 403 }
      );
    }

    const update: Record<string, unknown> = {};
    if (body.note1 !== undefined) update['round2Evaluation.notes.note1'] = body.note1;
    if (body.note2 !== undefined) update['round2Evaluation.notes.note2'] = body.note2;
    if (body.note3 !== undefined) update['round2Evaluation.notes.note3'] = body.note3;
    if (body.score !== undefined) update['round2Evaluation.score'] = body.score;
    if (body.templateAnswers !== undefined) {
      update['round2Evaluation.templateAnswers'] = body.templateAnswers;
    }
    if (body.adHocQuestions !== undefined) {
      update['round2Evaluation.adHocQuestions'] = body.adHocQuestions;
    }
    if (body.finalStatus) update.round2Status = body.finalStatus;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: 'No evaluation changes supplied.' }, { status: 400 });
    }

    await dbConnect();
    const candidate = await Candidate.findOneAndUpdate(
      {
        _id: candidateId,
        ...departmentHeadCandidateVisibilityFilter(department),
      },
      { $set: update },
      { new: true, runValidators: true }
    )
      .select('_id round2Status round2Evaluation')
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json({ success: false, message: 'Candidate not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate });
  }
);

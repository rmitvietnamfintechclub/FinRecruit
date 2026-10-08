import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  departmentHeadCandidateVisibilityFilter,
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import SystemConfig from '@/app/(backend)/models/SystemConfig';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import { ROUND2_STATUSES } from '@/app/(backend)/types';

type Context = { params: Promise<{ candidateId: string }> };

type EvaluationPayload = {
  note1?: string;
  note2?: string;
  note3?: string;
  score?: number | null;
  templateAnswers?: Array<{ question: string; answer: string }>;
  adHocQuestions?: Array<{ question: string; answer: string }>;
  finalStatus?: 'Pass' | 'Fail' | 'No Show';
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, message: 'Invalid evaluation payload.' }, { status: 400 });
    }

    if (
      body.finalStatus !== undefined &&
      !(ROUND2_STATUSES as readonly string[]).includes(body.finalStatus)
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid Round 2 final status.' },
        { status: 400 }
      );
    }
    for (const note of [body.note1, body.note2, body.note3]) {
      if (note !== undefined && typeof note !== 'string') {
        return NextResponse.json(
          { success: false, message: 'Evaluation notes must be text.' },
          { status: 400 }
        );
      }
    }
    if (
      body.score !== undefined &&
      body.score !== null &&
      (!Number.isFinite(body.score) || body.score < 0 || body.score > 10)
    ) {
      return NextResponse.json(
        { success: false, message: 'Score must be between 0 and 10.' },
        { status: 400 }
      );
    }
    for (const answers of [body.templateAnswers, body.adHocQuestions]) {
      if (
        answers !== undefined &&
        (!Array.isArray(answers) ||
          answers.some(
            (answer) =>
              !answer ||
              typeof answer.question !== 'string' ||
              typeof answer.answer !== 'string'
          ))
      ) {
        return NextResponse.json(
          { success: false, message: 'Questions and answers must be text.' },
          { status: 400 }
        );
      }
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
      update['round2Evaluation.adHocQuestions'] = body.adHocQuestions.map((answer) => ({
        ...answer,
        addedBy: session.user.name?.trim() || session.user.email,
      }));
    }
    if (body.finalStatus) update.round2Status = body.finalStatus;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: 'No evaluation changes supplied.' }, { status: 400 });
    }

    await dbConnect();
    const active = await getActiveConfig();
    const departmentConfig = await DepartmentConfig.findOne({
      department,
      generation: active.currentGeneration,
      semester: active.currentSemester,
    })
      .select('isScoringEnabled')
      .lean()
      .exec();
    if (body.score !== undefined && !departmentConfig?.isScoringEnabled) {
      return NextResponse.json(
        { success: false, message: 'Scoring is disabled for this department.' },
        { status: 403 }
      );
    }
    const systemConfig = await SystemConfig.findOne({ configName: 'global_settings' })
      .select('departmentStates')
      .lean()
      .exec();
    const round2Locked = Boolean(
      systemConfig?.departmentStates?.find(
        (state: { department: string; isRound2Locked?: boolean }) =>
          state.department === department
      )?.isRound2Locked
    );
    if (round2Locked) {
      return NextResponse.json(
        { success: false, message: 'Round 2 is locked for this department.' },
        { status: 423 }
      );
    }

    const candidate = await Candidate.findOneAndUpdate(
      {
        _id: candidateId,
        ...departmentHeadCandidateVisibilityFilter(department),
        generation: active.currentGeneration,
        semester: active.currentSemester,
        status: 'Pass',
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

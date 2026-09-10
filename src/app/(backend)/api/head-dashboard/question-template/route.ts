import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';

type TemplatePayload = {
  questions?: unknown;
};

async function getDepartmentContext(department: string | null | undefined) {
  const assignedDepartment = normalizeHeadDepartment(department);
  if (!assignedDepartment) return null;

  const active = await getActiveConfig();
  return { assignedDepartment, active };
}

export const GET = withRBAC(
  ['Department Head', 'Member'],
  async (_req: NextRequest, { session }) => {
    const context = await getDepartmentContext(session.user.department);
    if (!context) {
      return NextResponse.json(
        { success: false, message: 'A valid department assignment is required.' },
        { status: 403 }
      );
    }

    await dbConnect();
    const config = await DepartmentConfig.findOne({
      department: context.assignedDepartment,
      generation: context.active.currentGeneration,
      semester: context.active.currentSemester,
    })
      .select('interviewQuestions isScoringEnabled')
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      questions: config?.interviewQuestions ?? [],
      isScoringEnabled: config?.isScoringEnabled ?? false,
      cohort: {
        generation: context.active.currentGeneration,
        semester: context.active.currentSemester,
      },
    });
  }
);

export const PATCH = withRBAC(
  'Department Head',
  async (req: NextRequest, { session }) => {
    const context = await getDepartmentContext(session.user.department);
    if (!context) {
      return NextResponse.json(
        { success: false, message: 'A valid department assignment is required.' },
        { status: 403 }
      );
    }

    let body: TemplatePayload;
    try {
      body = (await req.json()) as TemplatePayload;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON payload.' },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(body.questions) ||
      body.questions.some((question) => typeof question !== 'string')
    ) {
      return NextResponse.json(
        { success: false, message: 'Questions must be an array of strings.' },
        { status: 400 }
      );
    }

    const questions = body.questions
      .map((question) => question.trim())
      .filter(Boolean);

    await dbConnect();
    const config = await DepartmentConfig.findOneAndUpdate(
      {
        department: context.assignedDepartment,
        generation: context.active.currentGeneration,
        semester: context.active.currentSemester,
      },
      {
        $set: { interviewQuestions: questions },
        $setOnInsert: {
          department: context.assignedDepartment,
          generation: context.active.currentGeneration,
          semester: context.active.currentSemester,
        },
      },
      { new: true, upsert: true, runValidators: true }
    )
      .select('interviewQuestions isScoringEnabled')
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      questions: config?.interviewQuestions ?? questions,
      isScoringEnabled: config?.isScoringEnabled ?? false,
    });
  }
);

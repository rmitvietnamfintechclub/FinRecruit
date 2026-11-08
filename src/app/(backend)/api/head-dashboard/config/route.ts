import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import { reconcileTemplateAnswers } from '@/app/(backend)/libs/round2Evaluation';
import type { ICustomAnswer } from '@/app/(backend)/types';

export const runtime = 'nodejs';

export const GET = withRBAC(
  'Department Head',
  async (_req: NextRequest, { session }: { session: ActiveAppSession }) => {
    const assignedDepartment = normalizeHeadDepartment(session.user.department);
    if (!assignedDepartment) {
      return NextResponse.json(
        { success: false, message: 'Invalid department assignment.' },
        { status: 403 }
      );
    }

    try {
      await dbConnect();
      const active = await getActiveConfig();
      const config = await DepartmentConfig.findOne({
        department: assignedDepartment,
        generation: active.currentGeneration,
        semester: active.currentSemester,
      })
        .lean()
        .exec();

      return NextResponse.json({
        success: true,
        message: 'Department configuration retrieved successfully.',
        data: config ?? {
          department: assignedDepartment,
          generation: active.currentGeneration,
          semester: active.currentSemester,
          interviewQuestions: [],
        },
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Could not retrieve configuration.' },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withRBAC(
  'Department Head',
  async (req: NextRequest, { session }: { session: ActiveAppSession }) => {
    const assignedDepartment = normalizeHeadDepartment(session.user.department);
    if (!assignedDepartment) {
      return NextResponse.json(
        { success: false, message: 'Invalid department assignment.' },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { interviewQuestions } = body;

      if (interviewQuestions && !Array.isArray(interviewQuestions)) {
        return NextResponse.json(
          {
            success: false,
            message: 'interviewQuestions must be an array of strings.',
          },
          { status: 400 }
        );
      }

      await dbConnect();
      const active = await getActiveConfig();
      const normalizedQuestions = interviewQuestions
        ? interviewQuestions
            .map(String)
            .map((question: string) => question.trim())
            .filter(Boolean)
        : [];

      const config = await DepartmentConfig.findOneAndUpdate(
        {
          department: assignedDepartment,
          generation: active.currentGeneration,
          semester: active.currentSemester,
        },
        { $set: { interviewQuestions: normalizedQuestions } },
        { new: true, upsert: true }
      )
        .lean()
        .exec();

      // Đồng bộ câu hỏi vào bảng Candidate (Reconcile)
      if (interviewQuestions !== undefined) {
        const candidates = await Candidate.find({
          department: assignedDepartment,
          generation: active.currentGeneration,
          semester: active.currentSemester,
        })
          .select('_id round2Evaluation.templateAnswers')
          .lean()
          .exec();

        const updates = candidates.map((candidate) => {
          const templateAnswers = reconcileTemplateAnswers(
            normalizedQuestions,
            (candidate.round2Evaluation?.templateAnswers ||
              []) as ICustomAnswer[]
          );

          return {
            updateOne: {
              filter: { _id: candidate._id },
              update: {
                $set: { 'round2Evaluation.templateAnswers': templateAnswers },
              },
            },
          };
        });

        if (updates.length > 0) {
          await Candidate.bulkWrite(updates);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Department configuration updated successfully.',
        data: config,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid request payload or server error.' },
        { status: 500 }
      );
    }
  }
);

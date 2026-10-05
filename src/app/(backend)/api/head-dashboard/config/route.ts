import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

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
          isScoringEnabled: false,
        },
      });
    } catch (error) {
      console.error('[config/GET] Error:', error);
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
      const { interviewQuestions, isScoringEnabled } = body;

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

      // Configuration is scoped to the current active recruitment cycle
      const active = await getActiveConfig();

      // Upsert the configuration for this department/cohort combo
      const config = await DepartmentConfig.findOneAndUpdate(
        {
          department: assignedDepartment,
          generation: active.currentGeneration,
          semester: active.currentSemester,
        },
        {
          $set: {
            interviewQuestions: interviewQuestions
              ? interviewQuestions
                  .map(String)
                  .map((q: string) => q.trim())
                  .filter(Boolean)
              : [],
            isScoringEnabled: Boolean(isScoringEnabled) ?? false, // Default to false if not provided
          },
        },
        { new: true, upsert: true }
      )
        .lean()
        .exec();

      return NextResponse.json({
        success: true,
        message: 'Department configuration updated successfully.',
        data: config,
      });
    } catch (error) {
      console.error('[config/PATCH] Error:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid request payload or server error.' },
        { status: 500 }
      );
    }
  }
);

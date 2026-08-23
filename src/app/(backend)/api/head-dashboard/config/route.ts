import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import SystemConfig from '@/app/(backend)/models/SystemConfig';

export const runtime = 'nodejs';

export const PATCH = withRBAC(
  ['Department Head'],
  async (req: NextRequest, { session }) => {
    try {
      await dbConnect();
      const body = await req.json();
      const { interviewQuestions, isScoringEnabled } = body ?? {};

      const systemConfig = await SystemConfig.findOne({
        configName: 'global_settings',
      }).exec();
      if (!systemConfig) {
        return NextResponse.json(
          {
            success: false,
            code: 'CONFIG_NOT_FOUND',
            message: 'System configuration not found.',
          },
          { status: 404 }
        );
      }

      const { currentGeneration, currentSemester } = systemConfig;
      const department = session.user.department;

      const updatedConfig = await DepartmentConfig.findOneAndUpdate(
        {
          department,
          generation: currentGeneration,
          semester: currentSemester,
        },
        {
          $set: {
            interviewQuestions: Array.isArray(interviewQuestions)
              ? interviewQuestions
              : [],
            isScoringEnabled: Boolean(isScoringEnabled),
          },
        },
        { new: true, upsert: true, runValidators: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Department question configuration updated successfully.',
        data: updatedConfig,
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          code: 'SERVER_ERROR',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);

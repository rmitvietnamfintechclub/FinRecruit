import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { DepartmentType } from '@/app/(backend)/types';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

const ALL_DEPARTMENTS: DepartmentType[] = [
  'Technology Department',
  'Business Department',
  'HR Department',
  'Marketing Department',
];

type CohortFilter = { generation: string; semester: string };
type CohortMeta = CohortFilter & { isRecruitmentActive: boolean };

interface StatusCount {
  total: number;
  pass: number;
  fail: number;
  pending: number;
}

// Bổ sung thêm cấu trúc trả về cho Round 2
interface DualStatusCount {
  round1: StatusCount;
  round2: StatusCount;
}

interface EvaluationStats {
  success: true;
  data: {
    overall: DualStatusCount;
    byDepartment: Partial<Record<DepartmentType, DualStatusCount>>;
    activeCohort: CohortMeta;
    timestamp: string;
    lastUpdated: string;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// 👇 ĐÃ SỬA: ĐẾM CHO CẢ 2 VÒNG 👇
async function getEvaluationStats(cohort: CohortFilter): Promise<DualStatusCount> {
  const stats = await Candidate.aggregate([
    {
      $match: {
        generation: cohort.generation,
        semester: cohort.semester,
      },
    },
    {
      $group: {
        _id: null,
        totalR1: { $sum: 1 },
        passR1: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } },
        failR1: { $sum: { $cond: [{ $eq: ['$status', 'Fail'] }, 1, 0] } },
        pendingR1: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        
        // Đếm Round 2: Chỉ những người ĐÃ PASS R1 mới được tính vào Total của R2
        totalR2: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } },
        passR2: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pass'] }, { $eq: ['$round2Status', 'Pass'] }] }, 1, 0] } },
        failR2: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pass'] }, { $eq: ['$round2Status', 'Fail'] }] }, 1, 0] } },
        pendingR2: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pass'] }, { $in: ['$round2Status', [null, undefined, 'Pending']] }] }, 1, 0] } },
      },
    },
  ]);

  if (!stats || stats.length === 0) {
    return {
      round1: { total: 0, pass: 0, fail: 0, pending: 0 },
      round2: { total: 0, pass: 0, fail: 0, pending: 0 },
    };
  }

  return {
    round1: {
      total: stats[0].totalR1,
      pass: stats[0].passR1,
      fail: stats[0].failR1,
      pending: stats[0].pendingR1,
    },
    round2: {
      total: stats[0].totalR2,
      pass: stats[0].passR2,
      fail: stats[0].failR2,
      pending: stats[0].pendingR2,
    },
  };
}

async function getEvaluationStatsByDepartment(
  dept: DepartmentType,
  cohort: CohortFilter
): Promise<DualStatusCount> {
  const stats = await Candidate.aggregate([
    {
      $match: {
        department: dept,
        generation: cohort.generation,
        semester: cohort.semester,
      },
    },
    {
      $group: {
        _id: null,
        totalR1: { $sum: 1 },
        passR1: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } },
        failR1: { $sum: { $cond: [{ $eq: ['$status', 'Fail'] }, 1, 0] } },
        pendingR1: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        
        totalR2: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } },
        passR2: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pass'] }, { $eq: ['$round2Status', 'Pass'] }] }, 1, 0] } },
        failR2: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pass'] }, { $eq: ['$round2Status', 'Fail'] }] }, 1, 0] } },
        pendingR2: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Pass'] }, { $in: ['$round2Status', [null, undefined, 'Pending']] }] }, 1, 0] } },
      },
    },
  ]);

  if (!stats || stats.length === 0) {
    return {
      round1: { total: 0, pass: 0, fail: 0, pending: 0 },
      round2: { total: 0, pass: 0, fail: 0, pending: 0 },
    };
  }

  return {
    round1: {
      total: stats[0].totalR1,
      pass: stats[0].passR1,
      fail: stats[0].failR1,
      pending: stats[0].pendingR1,
    },
    round2: {
      total: stats[0].totalR2,
      pass: stats[0].passR2,
      fail: stats[0].failR2,
      pending: stats[0].pendingR2,
    },
  };
}

export const GET = withRBAC(
  'Executive Board',
  async (
    _req: NextRequest,
    context: { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      await dbConnect();
      const active = await getActiveConfig();
      const cohort: CohortFilter = {
        generation: active.currentGeneration,
        semester: active.currentSemester,
      };

      const overall = await getEvaluationStats(cohort);
      const byDepartment: Partial<Record<DepartmentType, DualStatusCount>> = {};
      for (const dept of ALL_DEPARTMENTS) {
        byDepartment[dept] = await getEvaluationStatsByDepartment(dept, cohort);
      }

      const now = new Date().toISOString();
      const response: EvaluationStats = {
        success: true,
        data: {
          overall,
          byDepartment,
          activeCohort: {
            ...cohort,
            isRecruitmentActive: active.isRecruitmentActive,
          },
          timestamp: now,
          lastUpdated: now,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error: unknown) {
      console.error('[statistics/GET] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'Failed to fetch evaluation statistics.',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);
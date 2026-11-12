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
  incomingSecondChoicePending?: number;
}

interface DualStatusCount {
  round1: StatusCount;
  round2: StatusCount;
}

interface EvaluationStats {
  success: true;
  data: {
    overall: DualStatusCount;
    byDepartment: Record<DepartmentType, DualStatusCount>;
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

const emptyStatusCount = (includeIncoming = false): StatusCount => ({
  total: 0,
  pass: 0,
  fail: 0,
  pending: 0,
  ...(includeIncoming ? { incomingSecondChoicePending: 0 } : {}),
});

const emptyDualStatusCount = (includeIncoming = false): DualStatusCount => ({
  round1: emptyStatusCount(includeIncoming),
  round2: emptyStatusCount(false),
});

// Helper tái sử dụng cho các biểu thức accumulator của $group
const statsAccumulators = {
  totalR1: { $sum: 1 },
  passR1: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } },
  failR1: { $sum: { $cond: [{ $eq: ['$status', 'Fail'] }, 1, 0] } },
  pendingR1: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },

  // Round 2: Chỉ tính khi Round 1 Pass
  totalR2: { $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] } },
  passR2: {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ['$status', 'Pass'] },
            { $eq: ['$round2Status', 'Pass'] },
          ],
        },
        1,
        0,
      ],
    },
  },
  failR2: {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ['$status', 'Pass'] },
            { $eq: ['$round2Status', 'Fail'] },
          ],
        },
        1,
        0,
      ],
    },
  },
  pendingR2: {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ['$status', 'Pass'] },
            { $eq: [{ $ifNull: ['$round2Status', 'Pending'] }, 'Pending'] },
          ],
        },
        1,
        0,
      ],
    },
  },
};

type RawAggRow = {
  _id: string | null;
  totalR1: number;
  passR1: number;
  failR1: number;
  pendingR1: number;
  totalR2: number;
  passR2: number;
  failR2: number;
  pendingR2: number;
};

type RawIncomingRow = {
  _id: string | null;
  count: number;
};

function mapRowToDualStatus(
  row?: RawAggRow,
  incomingSecondChoicePending?: number
): DualStatusCount {
  if (!row)
    return emptyDualStatusCount(incomingSecondChoicePending !== undefined);
  return {
    round1: {
      total: row.totalR1 ?? 0,
      pass: row.passR1 ?? 0,
      fail: row.failR1 ?? 0,
      pending: row.pendingR1 ?? 0,
      ...(incomingSecondChoicePending !== undefined
        ? { incomingSecondChoicePending }
        : {}),
    },
    round2: {
      total: row.totalR2 ?? 0,
      pass: row.passR2 ?? 0,
      fail: row.failR2 ?? 0,
      pending: row.pendingR2 ?? 0,
    },
  };
}

export const GET = withRBAC(
  'Executive Board',
  async (
    _req: NextRequest,
    _context: { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      await dbConnect();
      const active = await getActiveConfig();
      const cohort: CohortFilter = {
        generation: active.currentGeneration,
        semester: active.currentSemester,
      };

      // TẬP HỢP TOÀN BỘ SỐ LIỆU OVERALL, THEO BAN, VÀ INCOMING CHOICE 2 TRONG 1 AGGREGATION
      const [aggResult] = await Candidate.aggregate<{
        overall: RawAggRow[];
        byDepartment: RawAggRow[];
        incomingSecondChoice: RawIncomingRow[];
      }>([
        {
          $match: {
            generation: cohort.generation,
            semester: cohort.semester,
          },
        },
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  ...statsAccumulators,
                },
              },
            ],
            byDepartment: [
              {
                $group: {
                  _id: '$department',
                  ...statsAccumulators,
                },
              },
            ],
            incomingSecondChoice: [
              {
                $match: {
                  status: 'Pending',
                  choice2: { $in: ALL_DEPARTMENTS },
                  $expr: { $ne: ['$department', '$choice2'] },
                },
              },
              {
                $group: {
                  _id: '$choice2',
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]);

      const overall = mapRowToDualStatus(aggResult?.overall?.[0]);

      // Map số lượng ứng viên đang chờ reroute từ choice 1 theo từng ban
      const incomingMap = new Map<DepartmentType, number>();
      aggResult?.incomingSecondChoice?.forEach((row) => {
        if (row._id && ALL_DEPARTMENTS.includes(row._id as DepartmentType)) {
          incomingMap.set(row._id as DepartmentType, row.count ?? 0);
        }
      });

      // Khởi tạo sẵn cấu trúc cho toàn bộ 4 ban (kể cả ban chưa có ứng viên nào nộp hồ sơ)
      const byDepartment = ALL_DEPARTMENTS.reduce(
        (acc, dept) => {
          acc[dept] = emptyDualStatusCount(true);
          acc[dept].round1.incomingSecondChoicePending =
            incomingMap.get(dept) ?? 0;
          return acc;
        },
        {} as Record<DepartmentType, DualStatusCount>
      );

      // Điền số liệu thực tế từ aggregation
      aggResult?.byDepartment?.forEach((row) => {
        if (row._id && ALL_DEPARTMENTS.includes(row._id as DepartmentType)) {
          const dept = row._id as DepartmentType;
          byDepartment[dept] = mapRowToDualStatus(
            row,
            incomingMap.get(dept) ?? 0
          );
        }
      });

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
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'Failed to fetch evaluation statistics.',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);

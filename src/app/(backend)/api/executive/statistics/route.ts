import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { DepartmentType } from '@/app/(backend)/types';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

// Define all possible departments for aggregation
const ALL_DEPARTMENTS: DepartmentType[] = [
    'Technology Department',
    'Business Department',
    'HR Department',
    'Marketing Department'
];

type CohortFilter = { generation: string; semester: string };

type CohortMeta = CohortFilter & { isRecruitmentActive: boolean };

interface StatusCount {
    total: number;
    pass: number;
    fail: number;
    pending: number;
}

interface EvaluationStats {
    success: true;
    data: {
        overall: StatusCount;
        byDepartment: Partial<Record<DepartmentType, StatusCount>>;
        /** The active cohort applied as an implicit filter on these stats. */
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

async function getEvaluationStats(cohort: CohortFilter): Promise<StatusCount> {
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
                total: { $sum: 1 },
                pass: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] },
                },
                fail: {
                    $sum: { $cond: [{ $eq: ['$status', 'Fail'] }, 1, 0] },
                },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                pass: 1,
                fail: 1,
                pending: 1,
            },
        },
    ]);

    if (!stats || stats.length === 0) {
        return { total: 0, pass: 0, fail: 0, pending: 0 };
    }

    return stats[0];
}

async function getEvaluationStatsByDepartment(
        dept: DepartmentType,
        cohort: CohortFilter
): Promise<StatusCount> {
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
                total: { $sum: 1 },
                pass: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pass'] }, 1, 0] },
                },
                fail: {
                    $sum: { $cond: [{ $eq: ['$status', 'Fail'] }, 1, 0] },
                },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                pass: 1,
                fail: 1,
                pending: 1,
            },
        },
    ]);

    if (!stats || stats.length === 0) {
        return { total: 0, pass: 0, fail: 0, pending: 0 };
    }

    return stats[0];
}

export const GET = withRBAC(
    'Executive Board',
    async (_req: NextRequest, context: { session: ActiveAppSession }): Promise<Response> =>     
    {
        try {
            // Connect to database
            await dbConnect();

            const active = await getActiveConfig();
            const cohort: CohortFilter = {
                generation: active.currentGeneration,
                semester: active.currentSemester,
            };

            // Get overall statistics
            const overall = await getEvaluationStats(cohort);

            // Get statistics by department
            const byDepartment: Partial<Record<DepartmentType, StatusCount>> = {};

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
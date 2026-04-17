import { Types } from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  buildDepartmentHeadCandidateMatch,
  DASHBOARD_STATUS_OPTIONS,
  parseDashboardStatus,
  parsePaginationParams,
  sanitizeSearchQuery,
  serializeCandidateListItem,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import {
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

export const runtime = 'nodejs';

type CandidateListAggregationResult = {
  metadata: Array<{ total: number }>;
  items: Array<{
    _id: Types.ObjectId;
    fullName: string;
    email: string;
    phone: string;
    department: 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department';
    choice1: 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department';
    choice2?: 'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department' | null;
    status: 'Pending' | 'Pass' | 'Fail';
    generation: string;
    semester: string;
    appliedAt: Date;
    updatedAt: Date;
  }>;
};

export const GET = withRBAC(
  'Department Head',
  async (req: NextRequest, { session }) => {
    const assignedDepartment = normalizeHeadDepartment(session.user.department);

    if (!assignedDepartment) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The authenticated Department Head account does not have a valid department assignment.',
        },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const search = sanitizeSearchQuery(searchParams.get('search'));
    const statusParam = searchParams.get('status');
    const status = parseDashboardStatus(statusParam);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    if (statusParam && statusParam !== 'All' && !status) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status filter. Supported values: ${DASHBOARD_STATUS_OPTIONS.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const match = buildDepartmentHeadCandidateMatch({
      department: assignedDepartment,
      search,
      status,
    });

    const aggregateResults = (await Candidate.aggregate([
      { $match: match },
      {
        $addFields: {
          statusRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'Pending'] }, then: 0 },
                { case: { $eq: ['$status', 'Pass'] }, then: 1 },
                { case: { $eq: ['$status', 'Fail'] }, then: 2 },
              ],
              default: 99,
            },
          },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [
            { $sort: { statusRank: 1, updatedAt: -1, appliedAt: -1, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                statusRank: 0,
                customAnswers: 0,
                cvLink: 0,
                __v: 0,
                createdAt: 0,
              },
            },
          ],
        },
      },
    ]).exec()) as CandidateListAggregationResult[];

    const aggregationResult = aggregateResults[0];

    const total = aggregationResult?.metadata?.[0]?.total ?? 0;
    const items =
      aggregationResult?.items?.map((candidate) =>
        serializeCandidateListItem({
          ...candidate,
          _id: candidate._id,
          choice2: candidate.choice2 ?? null,
        })
      ) ?? [];

    const hasNoDepartmentCandidates = total === 0 && !search && !status;
    const hasNoFilteredResults = total === 0 && !hasNoDepartmentCandidates;

    return NextResponse.json(
      {
        success: true,
        message: 'Candidates fetched successfully.',
        candidates: items,
        meta: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
          filters: {
            search,
            status,
            department: assignedDepartment,
          },
          allowedStatusOptions: [...DASHBOARD_STATUS_OPTIONS],
          emptyState:
            hasNoDepartmentCandidates
              ? 'No candidates have been routed to your department yet.'
              : hasNoFilteredResults
                ? 'No results found for the current search or filter.'
                : null,
        },
      },
      { status: 200 }
    );
  }
);

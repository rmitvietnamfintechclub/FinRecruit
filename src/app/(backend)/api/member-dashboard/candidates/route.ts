import { Types, type PipelineStage } from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  buildDepartmentHeadCandidateMatch,
  parseDashboardStatus,
  parsePaginationParams,
  sanitizeSearchQuery,
  serializeCandidateListItem,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import {
  STATUSES,
  type DepartmentType,
  type StatusType,
} from '@/app/(backend)/types';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import MasterInterviewSlot from '@/app/(backend)/models/MasterInterviewSlot';

export const runtime = 'nodejs';

type CandidateListAggregationResult = {
  metadata: Array<{ total: number }>;
  items: Array<{
    _id: Types.ObjectId;
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    department: DepartmentType;
    choice1: DepartmentType;
    choice2?: DepartmentType | null;
    status: StatusType;
    generation: string;
    semester: string;
    appliedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    round2Status: StatusType;
    interviewSlotId?: Types.ObjectId | null;
    interviewDate?: Date | string | null;
    interviewStartTime?: string | null;
    interviewEndTime?: string | null;
    interviewRoom?: string | null;
    interviewAttendance?: string | null;
  }>;
};

// CHỈ CẤP QUYỀN CHO MEMBER
export const GET = withRBAC('Member', async (req: NextRequest, { session }) => {
  const assignedDepartment = normalizeHeadDepartment(session.user.department);

  if (!assignedDepartment) {
    return NextResponse.json(
      { success: false, message: 'Invalid department assignment for Member.' },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const search = sanitizeSearchQuery(searchParams.get('search'));
  const statusParam = searchParams.get('status');
  const status = parseDashboardStatus(statusParam);
  const { page, limit, skip } = parsePaginationParams(searchParams);
  const populateInterview = searchParams.get('populateInterview') === 'true';

  if (statusParam && statusParam !== 'All' && !status) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid status filter. Supported values: ${STATUSES.join(', ')}.`,
      },
      { status: 400 }
    );
  }

  await dbConnect();

  if (!MasterInterviewSlot) {
    console.warn('MasterInterviewSlot model not found');
  }

  const active = await getActiveConfig();
  const cohort = {
    generation: active.currentGeneration,
    semester: active.currentSemester,
  };

  const match = buildDepartmentHeadCandidateMatch({
    department: assignedDepartment,
    search,
    status,
    cohort,
  });

  const sortStage: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };

  const pipeline: PipelineStage.FacetPipelineStage[] = [
    { $match: match },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
  ];

  if (populateInterview) {
    pipeline.push(
      {
        $lookup: {
          from: 'masterinterviewslots',
          localField: 'interviewSlotId',
          foreignField: '_id',
          as: 'slotInfo',
        },
      },
      { $addFields: { firstSlot: { $arrayElemAt: ['$slotInfo', 0] } } },
      {
        $addFields: {
          interviewDate: '$firstSlot.date',
          interviewStartTime: '$firstSlot.startTime',
          interviewEndTime: '$firstSlot.endTime',
          interviewRoom: '$firstSlot.room',
          interviewAttendance: {
            $let: {
              vars: {
                matchedBooking: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $ifNull: ['$firstSlot.bookings', []] },
                        as: 'booking',
                        cond: {
                          $eq: ['$$booking.department', assignedDepartment],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
              in: '$$matchedBooking.status',
            },
          },
        },
      }
    );
  }

  const projectStage: Record<string, number> = {
    customAnswers: 0,
    cvLink: 0,
    __v: 0,
    round2Evaluation: 0, // Loại bỏ toàn bộ evaluation khỏi payload của member
  };

  if (populateInterview) {
    projectStage.slotInfo = 0;
    projectStage.firstSlot = 0;
  }

  const aggregateResults = (await Candidate.aggregate([
    { $match: match },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [...pipeline, { $project: projectStage }],
      },
    },
  ]).exec()) as CandidateListAggregationResult[];

  const aggregationResult = aggregateResults[0];
  const total = aggregationResult?.metadata?.[0]?.total ?? 0;
  const items =
    aggregationResult?.items?.map((candidate) => ({
      ...serializeCandidateListItem({
        ...candidate,
        _id: candidate._id,
        choice2: candidate.choice2 ?? null,
      }),
      interviewDate: candidate.interviewDate ?? null,
      interviewStartTime: candidate.interviewStartTime ?? null,
      interviewEndTime: candidate.interviewEndTime ?? null,
      interviewRoom: candidate.interviewRoom ?? null,
      interviewAttendance: candidate.interviewAttendance ?? null,
    })) ?? [];

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
        activeCohort: {
          ...cohort,
          isRecruitmentActive: active.isRecruitmentActive,
        },
        allowedStatusOptions: [...STATUSES],
        emptyState: hasNoDepartmentCandidates
          ? `No candidates have been routed to your department for ${cohort.semester} · ${cohort.generation} yet.`
          : hasNoFilteredResults
            ? 'No results found for the current search or filter.'
            : null,
      },
    },
    { status: 200 }
  );
});

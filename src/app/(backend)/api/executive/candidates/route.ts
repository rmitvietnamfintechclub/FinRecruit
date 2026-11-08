import type { PipelineStage } from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import MasterInterviewSlot from '@/app/(backend)/models/MasterInterviewSlot'; 
import type { DepartmentType, StatusType } from '@/app/(backend)/types';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import type { DashboardStatus } from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';

export const runtime = 'nodejs';

// Validation helpers
function isValidDepartment(value: unknown): value is DepartmentType {
  const validDepartments: DepartmentType[] = [
    'Technology Department',
    'Business Department',
    'HR Department',
    'Marketing Department',
  ];
  return (
    typeof value === 'string' &&
    validDepartments.includes(value as DepartmentType)
  );
}

function isValidStatus(value: unknown): value is StatusType {
  const validStatuses: StatusType[] = ['Pending', 'Pass', 'Fail'];
  return (
    typeof value === 'string' && validStatuses.includes(value as StatusType)
  );
}

// Interfaces
interface CandidateListItem {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  department: DepartmentType;
  status: StatusType;
  round2Status?: DashboardStatus;
  choice1: string;
  choice2?: string;
  generation: string;
  semester: string;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  interviewSlot?: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    room: string;
    attendanceStatus: 'COMPLETED' | 'NO_SHOW' | null;
  } | null;
}

interface QueryFilters {
  department?: DepartmentType;
  status?: StatusType;
}

interface ActiveCohortInfo {
  generation: string;
  semester: string;
  isRecruitmentActive: boolean;
}

interface CandidateListResponse {
  success: true;
  data: {
    candidates: CandidateListItem[];
    count: number;
    filters: QueryFilters;
    activeCohort: ActiveCohortInfo;
    timestamp: string;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export const GET = withRBAC(
  'Executive Board',
  async (
    req: NextRequest,
    context: { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const departmentParam = searchParams.get('department');
      const statusParam = searchParams.get('status');

      // Cờ lấy lịch phỏng vấn (Dành riêng cho Round 2)
      const populateInterview = searchParams.get('populateInterview') === 'true';

      const filters: QueryFilters = {};

      if (departmentParam && isValidDepartment(departmentParam)) {
        filters.department = departmentParam;
      }
      if (statusParam && isValidStatus(statusParam)) {
        filters.status = statusParam;
      }

      await dbConnect();

      // Đảm bảo model MasterInterviewSlot được load
      if (!MasterInterviewSlot) {
        console.warn('MasterInterviewSlot model not found');
      }

      const active = await getActiveConfig();

      const matchStage: Record<string, unknown> = {
        generation: active.currentGeneration,
        semester: active.currentSemester,
      };

      if (filters.department) {
        matchStage.department = filters.department;
      }
      if (filters.status) {
        // EB truyền status=Pass để lọc danh sách được vào vòng 2
        matchStage.status = filters.status;
      }

      // 1. Khởi tạo Pipeline
      const pipeline: PipelineStage[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1, _id: -1 } },
      ];

      // 2. Chèn logic Lấy lịch phỏng vấn nếu Client yêu cầu
      if (populateInterview) {
        pipeline.push(
          {
            $lookup: {
              from: 'masterinterviewslots', // Collection chữ thường, có 's'
              localField: 'interviewSlotId', // Trường ref bên bảng Candidate
              foreignField: '_id', // Trường ID bên bảng MasterInterviewSlot
              as: 'slotInfo',
            },
          },
          {
            $addFields: {
              firstSlot: { $arrayElemAt: ['$slotInfo', 0] },
            },
          },
          {
            $addFields: {
              interviewSlot: {
                $cond: {
                  if: { $ifNull: ['$firstSlot', false] },
                  then: {
                    id: '$firstSlot._id',
                    date: '$firstSlot.date',
                    startTime: '$firstSlot.startTime',
                    endTime: '$firstSlot.endTime',
                    room: '$firstSlot.room', 
                    attendanceStatus: {
                      $let: {
                        vars: {
                          matchedBooking: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: { $ifNull: ['$firstSlot.bookings', []] },
                                  as: 'booking',
                                  cond: {
                                    // So sánh ID ứng viên (candidateId) trong mảng bookings với _id của Candidate hiện tại
                                    $eq: ['$$booking.candidateId', '$_id'],
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
                  else: null,
                },
              },
            },
          }
        );
      }

      // 3. Project: Dọn rác
      const projectStage: Record<string, 0 | 1> = {
        fullName: 1,
        email: 1,
        phone: 1,
        dob: 1,
        department: 1,
        status: 1,
        round2Status: 1,
        choice1: 1,
        choice2: 1,
        generation: 1,
        semester: 1,
        appliedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      };

      if (populateInterview) {
        projectStage.interviewSlot = 1;
      }

      pipeline.push({ $project: projectStage });

      // Thực thi query
      const candidates = await Candidate.aggregate(pipeline).exec();
      const now = new Date().toISOString();

      const response: CandidateListResponse = {
        success: true,
        data: {
          candidates: candidates as unknown as CandidateListItem[],
          count: candidates.length,
          filters,
          activeCohort: {
            generation: active.currentGeneration,
            semester: active.currentSemester,
            isRecruitmentActive: active.isRecruitmentActive,
          },
          timestamp: now,
        },
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error: unknown) {
      console.error('[candidates/GET] Error:', error);
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'Failed to fetch candidates.',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);
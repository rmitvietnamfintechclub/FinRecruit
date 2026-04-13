import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { DepartmentType, StatusType } from '@/app/(backend)/types';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

// Validation helpers
function isValidDepartment(value: unknown): value is DepartmentType {
  const validDepartments: DepartmentType[] = [
    'Technology Department',
    'Business Department',
    'HR Department',
    'Marketing Department'
  ];
  return typeof value === 'string' && validDepartments.includes(value as DepartmentType);
}

function isValidStatus(value: unknown): value is StatusType {
  const validStatuses: StatusType[] = ['Pending', 'Pass', 'Fail'];
  return typeof value === 'string' && validStatuses.includes(value as StatusType);
}

// Interfaces
interface CandidateListItem {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  department: DepartmentType;
  status: StatusType;
  choice1: string;
  choice2?: string;
  generation: string;
  semester: string;
  appliedAt: Date;
  updatedAt: Date;
}

interface QueryFilters {
  department?: DepartmentType;
  status?: StatusType;
}

interface CandidateListResponse {
  success: true;
  data: {
    candidates: CandidateListItem[];
    count: number;
    filters: QueryFilters;
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
  async (req: NextRequest, context: { session: ActiveAppSession }): Promise<Response> => {
    try {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const departmentParam = searchParams.get('department');
      const statusParam = searchParams.get('status');

      // Validate query parameters
      const filters: QueryFilters = {};

      if (departmentParam && isValidDepartment(departmentParam)) {
        filters.department = departmentParam;
      }

      if (statusParam && isValidStatus(statusParam)) {
        filters.status = statusParam;
      }

      // Connect to database
      await dbConnect();

      // Build mongodb filter
      const mongoFilter: Record<string, unknown> = {};

      if (filters.department) {
        mongoFilter.department = filters.department;
      }

      if (filters.status) {
        mongoFilter.status = filters.status;
      }

      // Query database
      const candidates = await Candidate.find(mongoFilter)
        .select(
          'fullName email phone department status choice1 choice2 generation semester appliedAt updatedAt'
        )
        .lean()
        .exec();

      const now = new Date().toISOString();

      const response: CandidateListResponse = {
        success: true,
        data: {
          candidates: candidates as CandidateListItem[],
          count: candidates.length,
          filters,
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
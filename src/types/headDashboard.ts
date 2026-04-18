import type { CandidateChoiceType, DepartmentType, StatusType } from '@/app/(backend)/types';
import type {
  CandidateRoutingInfo,
  DepartmentHeadCandidateDetail,
} from '@/app/(backend)/libs/departmentHeadDashboard';

/**
 * One row from GET /api/head-dashboard/candidates (JSON).
 * Matches `serializeCandidateListItem` / `DepartmentHeadCandidateListItem` with ISO date strings.
 */
export type HeadDashboardListCandidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** `Candidate.dob` */
  dob: string;
  department: DepartmentType;
  choice1: CandidateChoiceType;
  choice2: CandidateChoiceType | null;
  status: StatusType;
  generation: string;
  semester: string;
  appliedAt: string;
  /** Mongoose `createdAt` — ngày tạo bản ghi (hiển thị “Applied on”). */
  createdAt: string;
  updatedAt: string;
  routing: CandidateRoutingInfo;
};

/**
 * GET /api/head-dashboard/candidates/:id — `candidate` object (wire format uses ISO strings for dates).
 */
export type HeadDashboardCandidateDetailApi = Omit<
  DepartmentHeadCandidateDetail,
  'appliedAt' | 'updatedAt'
> & {
  appliedAt: string;
  updatedAt: string;
};

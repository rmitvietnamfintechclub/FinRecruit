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
  /** Mongoose `createdAt` — record creation date (displayed as "Applied on"). */
  createdAt: string;
  updatedAt: string;
  routing: CandidateRoutingInfo;

  // --- Phase 2 / Round 2 Fields ---
  round2Status?: StatusType;
  interviewSlotId?: string | null;

  interviewDate?: string | null;
  interviewStartTime?: string | null;
  interviewEndTime?: string | null;
  interviewRoom?: string;
  
  // Extracted Signal Field from Lookup (trạng thái điểm danh)
  interviewAttendance?: string | null;
  
  // Thông tin chấm điểm (nếu có sử dụng)
  round2Evaluation?: {
    score?: number | null;
  };
};

/**
 * GET /api/head-dashboard/candidates/:id — `candidate` object (wire format uses ISO strings for dates).
 */
export type HeadDashboardCandidateDetailApi = Omit<
  DepartmentHeadCandidateDetail,
  'appliedAt' | 'updatedAt' | 'createdAt'
> & {
  appliedAt: string;
  updatedAt: string;
  createdAt: string;
};
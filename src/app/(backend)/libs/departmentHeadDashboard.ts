import { Types } from 'mongoose';
import {
  departmentHeadCandidateVisibilityFilter,
  isHeadDepartment,
  type HeadDepartment,
} from '@/app/(backend)/libs/departments';
import {
  rerouteConfirmMessage,
  rerouteSuccessMessage,
} from '@/lib/candidateRoutingCopy';
import type {
  DepartmentType,
  ICustomAnswer,
  StatusType,
} from '@/app/(backend)/types';
import {
  normalizeCustomAnswers,
  normalizeGeneralAnswers,
} from '@/lib/candidate-answers';

export const DASHBOARD_STATUS_OPTIONS = ['Pending', 'Pass', 'Fail'] as const;

export type DashboardStatus = (typeof DASHBOARD_STATUS_OPTIONS)[number];

export type CandidateRoutingStage = 'choice1' | 'choice2' | 'unknown';

export type CandidateRoutingInfo = {
  currentStage: CandidateRoutingStage;
  isChoice2Valid: boolean;
  canRerouteOnFail: boolean;
  rerouteTargetDepartment: DepartmentType | null;
};

export type DepartmentHeadCandidateListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  /** Application form date of birth (string as stored). */
  dob: string;
  department: DepartmentType;
  choice1: DepartmentType;
  choice2: DepartmentType | null;
  status: StatusType;
  generation: string;
  semester: string;
  appliedAt: Date;
  /** Mongoose `timestamps` — record creation (use for “applied on” in UI). */
  createdAt: Date;
  updatedAt: Date;
  routing: CandidateRoutingInfo;
};

export type DepartmentHeadCandidateDetail = DepartmentHeadCandidateListItem & {
  cvLink: string;
  personalInformation: {
    dob: string;
    majorAndYear: string;
    facebookLink: string;
  };
  generalAnswers: ICustomAnswer[];
  customAnswers: ICustomAnswer[];
};

export type CandidateStatusChangeDecision =
  | {
      kind: 'update-status';
      nextStatus: DashboardStatus;
      message: string;
      code: 'STATUS_UPDATED' | 'FINAL_FAIL_NO_REROUTE' | 'FINAL_FAIL_SECOND_REVIEW';
    }
  | {
      kind: 'reroute-confirmation-required';
      targetDepartment: DepartmentType;
      message: string;
      code: 'REROUTE_CONFIRMATION_REQUIRED';
    }
  | {
      kind: 'reroute';
      targetDepartment: DepartmentType;
      nextStatus: 'Pending';
      message: string;
      code: 'CANDIDATE_REROUTED';
    };

type CandidateSummaryLike = {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  choice1: DepartmentType;
  choice2?: DepartmentType | null;
  department: DepartmentType;
  status: StatusType;
  generation: string;
  semester: string;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type CandidateDetailLike = CandidateSummaryLike & {
  cvLink: string;
  generalAnswers?: ICustomAnswer[] | null;
  customAnswers?: ICustomAnswer[] | null;
  dob?: string;
  majorAndYear?: string;
  facebookLink?: string;
  // legacy fields (read fallback only)
  futurePlans?: string;
  fintechAspect?: string;
  achievementExpectation?: string;
  timeCommitment?: string;
  explanation?: string;
  questionsForUs?: string;
};

type CandidateRoutingLike = {
  choice1: DepartmentType;
  choice2?: DepartmentType | null;
  department: DepartmentType;
};

type DashboardQueryOptions = {
  department: DepartmentType;
  search?: string;
  status?: DashboardStatus | null;
  /**
   * Optional active-cohort filter. When provided, only candidates matching the
   * given generation/semester are returned. Pass `null`/omit to skip cohort
   * scoping entirely.
   */
  cohort?: { generation: string; semester: string } | null;
};

export function parseDashboardStatus(
  value: string | null | undefined
): DashboardStatus | null {
  if (!value) {
    return null;
  }

  if (value === 'All') {
    return null;
  }

  return DASHBOARD_STATUS_OPTIONS.includes(value as DashboardStatus)
    ? (value as DashboardStatus)
    : null;
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const pageValue = Number(searchParams.get('page') ?? '1');
  const limitValue = Number(searchParams.get('limit') ?? '20');

  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  const rawLimit =
    Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : 20;
  const limit = Math.min(rawLimit, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function sanitizeSearchQuery(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.trim().slice(0, 100);
}

export function buildDepartmentHeadCandidateMatch({
  department,
  search,
  status,
  cohort,
}: DashboardQueryOptions) {
  const match: Record<string, unknown> = {
    ...departmentHeadCandidateVisibilityFilter(department as HeadDepartment),
    status: status ? status : { $in: [...DASHBOARD_STATUS_OPTIONS] },
  };

  if (cohort) {
    match.generation = cohort.generation;
    match.semester = cohort.semester;
  }

  if (search) {
    match.fullName = { $regex: escapeRegex(search), $options: 'i' };
  }

  return match;
}

export function getCandidateRoutingInfo(
  candidate: CandidateRoutingLike
): CandidateRoutingInfo {
  const isChoice2Valid =
    Boolean(candidate.choice2) &&
    candidate.choice2 !== candidate.choice1 &&
    isHeadDepartment(candidate.choice2 ?? undefined);

  const currentStage: CandidateRoutingStage =
    candidate.department === candidate.choice1
      ? 'choice1'
      : isChoice2Valid && candidate.department === candidate.choice2
        ? 'choice2'
        : 'unknown';

  return {
    currentStage,
    isChoice2Valid,
    canRerouteOnFail: isChoice2Valid && currentStage === 'choice1',
    rerouteTargetDepartment: isChoice2Valid ? (candidate.choice2 ?? null) : null,
  };
}

export function resolveCandidateStatusChange(
  candidate: CandidateRoutingLike,
  nextStatus: DashboardStatus,
  confirmReroute: boolean
): CandidateStatusChangeDecision {
  if (nextStatus === 'Pending' || nextStatus === 'Pass') {
    return {
      kind: 'update-status',
      nextStatus,
      message: 'Status updated successfully.',
      code: 'STATUS_UPDATED',
    };
  }

  const routing = getCandidateRoutingInfo(candidate);

  if (!routing.isChoice2Valid) {
    return {
      kind: 'update-status',
      nextStatus: 'Fail',
      message:
        'Candidate marked as Fail. No valid second-choice department is available for rerouting.',
      code: 'FINAL_FAIL_NO_REROUTE',
    };
  }

  if (routing.currentStage === 'choice2') {
    return {
      kind: 'update-status',
      nextStatus: 'Fail',
      message: 'Candidate marked as Fail. Second-choice evaluation is final.',
      code: 'FINAL_FAIL_SECOND_REVIEW',
    };
  }

  if (routing.canRerouteOnFail && routing.rerouteTargetDepartment) {
    if (!confirmReroute) {
      return {
        kind: 'reroute-confirmation-required',
        targetDepartment: routing.rerouteTargetDepartment,
        message: rerouteConfirmMessage(routing.rerouteTargetDepartment),
        code: 'REROUTE_CONFIRMATION_REQUIRED',
      };
    }

    return {
      kind: 'reroute',
      targetDepartment: routing.rerouteTargetDepartment,
      nextStatus: 'Pending',
      message: rerouteSuccessMessage(routing.rerouteTargetDepartment),
      code: 'CANDIDATE_REROUTED',
    };
  }

  return {
    kind: 'update-status',
    nextStatus: 'Fail',
    message:
      'Candidate marked as Fail. Automatic rerouting was skipped because the current routing state is not eligible.',
    code: 'FINAL_FAIL_NO_REROUTE',
  };
}

export function serializeCandidateListItem(
  candidate: CandidateSummaryLike
): DepartmentHeadCandidateListItem {
  return {
    id: candidate._id.toString(),
    fullName: candidate.fullName,
    email: candidate.email,
    phone: candidate.phone,
    dob: candidate.dob ?? '',
    department: candidate.department,
    choice1: candidate.choice1,
    choice2: candidate.choice2 ?? null,
    status: candidate.status,
    generation: candidate.generation,
    semester: candidate.semester,
    appliedAt: candidate.appliedAt,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    routing: getCandidateRoutingInfo(candidate),
  };
}

export function serializeCandidateDetail(
  candidate: CandidateDetailLike
): DepartmentHeadCandidateDetail {
  const doc = candidate as Record<string, unknown>;

  return {
    ...serializeCandidateListItem(candidate),
    cvLink: candidate.cvLink,
    personalInformation: {
      dob: candidate.dob ?? '',
      majorAndYear: candidate.majorAndYear ?? '',
      facebookLink: candidate.facebookLink ?? '',
    },
    generalAnswers: normalizeGeneralAnswers(doc),
    customAnswers: normalizeCustomAnswers(candidate),
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

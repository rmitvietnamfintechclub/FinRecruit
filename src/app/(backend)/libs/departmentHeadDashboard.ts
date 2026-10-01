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
import {
    STATUSES,
    type DepartmentType,
    type ICustomAnswer,
    type StatusType,
    type IRound2Evaluation,
} from '@/app/(backend)/types';
import {
    normalizeCustomAnswers,
    normalizeGeneralAnswers,
} from '@/lib/candidate-answers';

export const DASHBOARD_STATUS_OPTIONS = STATUSES;

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

    // Phase 2 fields
    round2Status?: StatusType;
    interviewSlotId?: string | null;
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

    // Phase 2 fields
    round2Evaluation: IRound2Evaluation;
};

export type CandidateStatusChangeDecision =
    | {
        kind: 'update-status';
        nextStatus: StatusType;
        message: string;
        code:
            | 'STATUS_UPDATED'
            | 'FINAL_FAIL_NO_REROUTE'
            | 'FINAL_FAIL_SECOND_REVIEW';
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

    // Phase 2 fields
    round2Status?: StatusType;
    interviewSlotId?: Types.ObjectId | null;
};

type CandidateDetailLike = CandidateSummaryLike & {
    cvLink: string;
    generalAnswers?: ICustomAnswer[] | null;
    customAnswers?: ICustomAnswer[] | null;
    dob?: string;
    majorAndYear?: string;
    facebookLink?: string;
    // legacy fields (read fallback only)
    // futurePlans?: string;
    // fintechAspect?: string;
    // achievementExpectation?: string;
    // timeCommitment?: string;
    // explanation?: string;
    // questionsForUs?: string;

    // Phase 2 fields
    round2Evaluation: IRound2Evaluation;
};

type CandidateRoutingLike = {
    choice1: DepartmentType;
    choice2?: DepartmentType | null;
    department: DepartmentType;
};

type DashboardQueryOptions = {
    department: DepartmentType;
    search?: string;
    status?: StatusType | null;
    /**
     * Optional active-cohort filter. When provided, only candidates matching the
     * given generation/semester are returned. Pass `null`/omit to skip cohort
     * scoping entirely.
     */
    cohort?: { generation: string; semester: string } | null;
};

export function parseDashboardStatus(
    value: string | null | undefined
): StatusType | null {
    if (!value || value === 'Any') {
        return null;
    }

    return STATUSES.includes(value as StatusType) ? (value as StatusType) : null;
}

export function parsePaginationParams(searchParams: URLSearchParams) {
    const pageValue = Number(searchParams.get('page') ?? '1');
    const limitValue = Number(searchParams.get('limit') ?? '20');

    const page =
        Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
    const rawLimit =
        Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : 20;

    return {
        page,
        limit: Math.min(rawLimit, 100),
        skip: (page - 1) * Math.min(rawLimit, 100),
    };
}

export function sanitizeSearchQuery(value: string | null | undefined) {
    return value ? value.trim().slice(0, 100) : '';
}

export function buildDepartmentHeadCandidateMatch({
    department,
    search,
    status,
    cohort,
}: DashboardQueryOptions) {
    const match: Record<string, unknown> = {
        ...departmentHeadCandidateVisibilityFilter(department as HeadDepartment),
        status: status ? status : { $in: [...STATUSES] },
    };

    if (cohort) {
        match.generation = cohort.generation;
        match.semester = cohort.semester;
    }

    if (search) {
        match.fullName = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
        };
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
        rerouteTargetDepartment: isChoice2Valid
        ? (candidate.choice2 ?? null)
        : null,
    };
}

export function resolveCandidateStatusChange(
    candidate: CandidateRoutingLike,
    nextStatus: StatusType,
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

        // Phase 2 fields
        round2Status: candidate.round2Status,
        interviewSlotId: candidate.interviewSlotId ? candidate.interviewSlotId.toString() : null
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

        // Phase 2 fields
        round2Evaluation: candidate.round2Evaluation,
    };
}

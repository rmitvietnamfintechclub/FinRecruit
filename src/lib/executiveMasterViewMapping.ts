import type { ICustomAnswer } from '@/app/(backend)/types';
import type {
  CandidateRoutingInfo,
  CandidateRoutingStage,
} from '@/app/(backend)/libs/departmentHeadDashboard';
import { isHeadDepartment } from '@/app/(backend)/libs/departments';
import type {
  CandidateChoiceType,
  DepartmentType,
  StatusType,
} from '@/app/(backend)/types';
import type {
  HeadDashboardCandidateDetailApi,
  HeadDashboardListCandidate,
} from '@/types/headDashboard';

/** UI dropdown labels in MasterView → API `department` query / statistics keys */
export const MASTER_VIEW_DEPT_OPTIONS = [
  'All',
  'Technology',
  'Business',
  'Human Resources',
  'Marketing',
] as const;

export type MasterViewDeptFilter = (typeof MASTER_VIEW_DEPT_OPTIONS)[number];

const UI_TO_API_DEPARTMENT: Record<
  Exclude<MasterViewDeptFilter, 'All'>,
  DepartmentType
> = {
  Technology: 'Technology Department',
  Business: 'Business Department',
  'Human Resources': 'HR Department',
  Marketing: 'Marketing Department',
};

export function masterViewDeptToApiDepartment(
  ui: MasterViewDeptFilter
): DepartmentType | null {
  if (ui === 'All') return null;
  return UI_TO_API_DEPARTMENT[ui];
}

export function statisticsDeptKey(
  ui: MasterViewDeptFilter
): 'overall' | DepartmentType {
  if (ui === 'All') return 'overall';
  return UI_TO_API_DEPARTMENT[ui];
}

function toIsoString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function routingFromChoices(args: {
  department: DepartmentType;
  choice1: CandidateChoiceType;
  choice2: CandidateChoiceType | '' | null | undefined;
}): CandidateRoutingInfo {
  const c2 =
    args.choice2 && String(args.choice2).trim() !== ''
      ? (args.choice2 as CandidateChoiceType)
      : null;

  const isChoice2Valid =
    Boolean(c2) &&
    c2 !== args.choice1 &&
    isHeadDepartment(c2 ?? undefined);

  const currentStage: CandidateRoutingStage =
    args.department === args.choice1
      ? 'choice1'
      : isChoice2Valid && args.department === c2
        ? 'choice2'
        : 'unknown';

  return {
    currentStage,
    isChoice2Valid,
    canRerouteOnFail: isChoice2Valid && currentStage === 'choice1',
    rerouteTargetDepartment: isChoice2Valid ? c2 : null,
  };
}

/** Row shape from GET /api/executive/candidates (JSON). */
export type ExecutiveListRow = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  department: DepartmentType;
  status: StatusType;
  choice1: CandidateChoiceType;
  choice2?: string;
  generation: string;
  semester: string;
  appliedAt: string;
  createdAt?: string;
  updatedAt: string;
};

export function mapExecutiveListItemToHeadRow(
  raw: ExecutiveListRow
): HeadDashboardListCandidate {
  const choice2 =
    raw.choice2 && raw.choice2.trim() !== ''
      ? (raw.choice2 as CandidateChoiceType)
      : null;

  const department = raw.department as DepartmentType;
  const choice1 = raw.choice1 as CandidateChoiceType;

  return {
    id: String(raw._id),
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    dob: raw.dob ?? '',
    department,
    choice1,
    choice2,
    status: raw.status,
    generation: raw.generation,
    semester: raw.semester,
    appliedAt: toIsoString(raw.appliedAt),
    createdAt: toIsoString(raw.createdAt ?? raw.appliedAt),
    updatedAt: toIsoString(raw.updatedAt),
    routing: routingFromChoices({ department, choice1, choice2 }),
  };
}

export function mapExecutiveDetailToHeadDetail(
  raw: Record<string, unknown>
): HeadDashboardCandidateDetailApi {
  const department = raw.department as DepartmentType;
  const choice1 = raw.choice1 as CandidateChoiceType;
  const choice2Raw = raw.choice2;
  const choice2 =
    typeof choice2Raw === 'string' && choice2Raw.trim() !== ''
      ? (choice2Raw as CandidateChoiceType)
      : null;

  const listBase = mapExecutiveListItemToHeadRow({
    _id: String(raw._id ?? ''),
    fullName: String(raw.fullName ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    dob: String(raw.dob ?? ''),
    department,
    status: raw.status as StatusType,
    choice1,
    choice2: choice2 ?? undefined,
    generation: String(raw.generation ?? ''),
    semester: String(raw.semester ?? ''),
    appliedAt: toIsoString(raw.appliedAt),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt),
  });

  const customAnswers: ICustomAnswer[] = Array.isArray(raw.customAnswers)
    ? (raw.customAnswers as ICustomAnswer[])
    : [];

  return {
    ...listBase,
    cvLink: String(raw.cvLink ?? ''),
    customAnswers,
    personalInformation: {
      dob: String(raw.dob ?? ''),
      majorAndYear: String(raw.majorAndYear ?? ''),
      facebookLink: String(raw.facebookLink ?? ''),
      futurePlans: String(raw.futurePlans ?? ''),
    },
    generalQuestions: {
      fintechAspect: String(raw.fintechAspect ?? ''),
      achievementExpectation: String(raw.achievementExpectation ?? ''),
      timeCommitment: String(raw.timeCommitment ?? ''),
      explanation: String(raw.explanation ?? ''),
      questionsForUs: String(raw.questionsForUs ?? ''),
    },
  };
}

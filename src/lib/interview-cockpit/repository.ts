import type {
  BackendRound2Status,
  CollaborativeNote,
  InterviewAnswer,
  InterviewCandidate,
  InterviewCockpitRepository,
  InterviewSettings,
  Round2CandidateSummary,
  Round2Decision,
} from './types';

const PAGE_SIZE = 100;

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
};

type RawFormAnswer = {
  question?: unknown;
  answer?: unknown;
  addedBy?: unknown;
  score?: unknown;
};

type RawCollaborativeNote = {
  authorId?: unknown;
  authorEmail?: unknown;
  authorName?: unknown;
  role?: unknown;
  content?: unknown;
  updatedAt?: unknown;
};

type RawInterviewSlot = {
  id?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  room?: unknown;
};

type RawCandidateSummary = {
  id?: unknown;
  fullName?: unknown;
  email?: unknown;
  department?: unknown;
  round2Status?: unknown;
  round2Decision?: unknown;
  generation?: unknown;
  semester?: unknown;
  interviewSlot?: RawInterviewSlot | null;
  evaluationSummary?: {
    score?: unknown;
  };
};

type RawCandidateList = {
  candidates?: RawCandidateSummary[];
  pagination?: {
    totalPages?: unknown;
  };
};

type RawInterviewDetail = {
  id?: unknown;
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  majorAndYear?: unknown;
  facebookLink?: unknown;
  cvLink?: unknown;
  generalAnswers?: RawFormAnswer[];
  customAnswers?: RawFormAnswer[];
  department?: unknown;
  round2Status?: unknown;
  round2Decision?: unknown;
  evaluation?: {
    isScoringEnabled?: unknown;
    templateAnswers?: RawFormAnswer[];
    adHocQuestions?: RawFormAnswer[];
    collaborativeNotes?: RawCollaborativeNote[];
    score?: unknown;
  };
};

type RawEvaluationUpdate = {
  score?: unknown;
  templateAnswers?: RawFormAnswer[];
  adHocQuestions?: RawFormAnswer[];
  collaborativeNotes?: RawCollaborativeNote[];
};

type RawStatusUpdate = {
  round2Status?: unknown;
  round2Decision?: unknown;
};

type RawDepartmentConfig = {
  department?: unknown;
  generation?: unknown;
  semester?: unknown;
  interviewQuestions?: unknown;
  isScoringEnabled?: unknown;
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function backendStatus(value: unknown): BackendRound2Status {
  if (value === 'Pass') return 'Pass';
  if (value === 'Fail' || value === 'No Show') return 'Fail';
  return 'Pending';
}

function backendDecision(
  value: unknown,
  status: BackendRound2Status,
  legacyStatus?: unknown
): Round2Decision | null {
  if (value === 'Pass' || value === 'Fail' || value === 'No Show') {
    return value;
  }
  if (legacyStatus === 'No Show') return 'No Show';
  if (status === 'Pass') return 'Pass';
  if (status === 'Fail') return 'Fail';
  return null;
}

export function decisionToBackendStatus(
  decision: Round2Decision
): Exclude<BackendRound2Status, 'Pending'> {
  return decision === 'Pass' ? 'Pass' : 'Fail';
}

function questionScore(value: unknown) {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

function studentIdFromEmail(email: string) {
  return email.split('@')[0] || email;
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatInterviewSlot(slot?: RawInterviewSlot | null) {
  if (!slot) return 'Not scheduled';
  const date = formatDate(slot.date);
  const time = [stringValue(slot.startTime), stringValue(slot.endTime)]
    .filter(Boolean)
    .join('–');
  const room = stringValue(slot.room);
  return [date, time, room].filter(Boolean).join(' · ') || 'Not scheduled';
}

function mapAnswer(
  answer: RawFormAnswer,
  index: number,
  prefix: string,
  isCustom = false
): InterviewAnswer {
  return {
    id: `${prefix}-${index + 1}`,
    question: stringValue(answer.question),
    answer: stringValue(answer.answer),
    score: questionScore(answer.score),
    ...(isCustom ? { isCustom: true } : {}),
    ...(typeof answer.addedBy === 'string' ? { addedBy: answer.addedBy } : {}),
  };
}

function mapAnswers(
  answers: RawFormAnswer[] | undefined,
  prefix: string,
  isCustom = false
) {
  return (Array.isArray(answers) ? answers : []).map((answer, index) =>
    mapAnswer(answer, index, prefix, isCustom)
  );
}

function mapCollaborativeNotes(
  notes: RawCollaborativeNote[] | undefined
): CollaborativeNote[] {
  return (Array.isArray(notes) ? notes : [])
    .map((note) => ({
      authorId: stringValue(note.authorId),
      authorEmail: stringValue(note.authorEmail),
      authorName:
        stringValue(note.authorName) ||
        stringValue(note.authorEmail).split('@')[0],
      role:
        note.role === 'Department Head'
          ? ('Department Head' as const)
          : ('Member' as const),
      content: stringValue(note.content),
      updatedAt: stringValue(note.updatedAt),
    }))
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
}

function mapSummary(candidate: RawCandidateSummary): Round2CandidateSummary {
  const email = stringValue(candidate.email);
  const status = backendStatus(candidate.round2Status);
  return {
    id: stringValue(candidate.id),
    fullName: stringValue(candidate.fullName),
    email,
    studentId: studentIdFromEmail(email),
    department: stringValue(candidate.department),
    generation: stringValue(candidate.generation),
    semester: stringValue(candidate.semester),
    interviewSlot: formatInterviewSlot(candidate.interviewSlot),
    status,
    selectedDecision: backendDecision(
      candidate.round2Decision,
      status,
      candidate.round2Status
    ),
    score:
      typeof candidate.evaluationSummary?.score === 'number'
        ? candidate.evaluationSummary.score
        : null,
  };
}

function mapCandidate(
  candidate: RawInterviewDetail,
  summary?: Round2CandidateSummary
): InterviewCandidate {
  const email = stringValue(candidate.email);
  const evaluation = candidate.evaluation;
  const status = backendStatus(candidate.round2Status);

  return {
    id: stringValue(candidate.id),
    fullName: stringValue(candidate.fullName),
    email,
    studentId: studentIdFromEmail(email),
    department: stringValue(candidate.department),
    generation: summary?.generation ?? '',
    semester: summary?.semester ?? '',
    interviewSlot: summary?.interviewSlot ?? 'Not scheduled',
    status,
    selectedDecision: backendDecision(
      candidate.round2Decision ?? summary?.selectedDecision,
      status,
      candidate.round2Status
    ),
    score: typeof evaluation?.score === 'number' ? evaluation.score : null,
    majorAndYear: stringValue(candidate.majorAndYear),
    phone: stringValue(candidate.phone),
    facebookLink: stringValue(candidate.facebookLink) || undefined,
    cvLink: stringValue(candidate.cvLink) || undefined,
    generalAnswers: mapAnswers(candidate.generalAnswers, 'general'),
    departmentAnswers: mapAnswers(candidate.customAnswers, 'department'),
    evaluationAnswers: mapAnswers(evaluation?.templateAnswers, 'template'),
    adHocQuestions: mapAnswers(evaluation?.adHocQuestions, 'ad-hoc', true),
    collaborativeNotes: mapCollaborativeNotes(evaluation?.collaborativeNotes),
    isScoringEnabled: evaluation?.isScoringEnabled === true,
  };
}

function toRawAnswers(answers: InterviewAnswer[]): RawFormAnswer[] {
  return answers.map(({ question, answer, addedBy, score }) => ({
    question,
    answer,
    score,
    ...(addedBy ? { addedBy } : {}),
  }));
}

export class HttpInterviewCockpitRepository implements InterviewCockpitRepository {
  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    const payload = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<T> | null;
    if (!response.ok || !payload?.success || payload.data === undefined) {
      throw new Error(
        payload?.message ?? `Request failed with status ${response.status}.`
      );
    }
    return payload.data;
  }

  private async listCandidatePage(page: number) {
    return this.request<RawCandidateList>(
      `/api/interviews?page=${page}&limit=${PAGE_SIZE}`
    );
  }

  async listCandidates(): Promise<Round2CandidateSummary[]> {
    const firstPage = await this.listCandidatePage(1);
    const totalPages =
      typeof firstPage.pagination?.totalPages === 'number'
        ? firstPage.pagination.totalPages
        : 1;
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
        this.listCandidatePage(index + 2)
      )
    );

    return [firstPage, ...remainingPages].flatMap((page) =>
      (Array.isArray(page.candidates) ? page.candidates : []).map(mapSummary)
    );
  }

  async getCandidate(candidateId: string): Promise<InterviewCandidate> {
    const detail = await this.request<RawInterviewDetail>(
      `/api/interviews/${candidateId}`
    );
    const email = stringValue(detail.email);
    let summary: Round2CandidateSummary | undefined;

    if (email) {
      const result = await this.request<RawCandidateList>(
        `/api/interviews?page=1&limit=${PAGE_SIZE}&search=${encodeURIComponent(email)}`
      );
      summary = (result.candidates ?? [])
        .map(mapSummary)
        .find((candidate) => candidate.id === candidateId);
    }

    return mapCandidate(detail, summary);
  }

  async saveTemplateAnswers(candidateId: string, answers: InterviewAnswer[]) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ templateAnswers: toRawAnswers(answers) }),
      }
    );
    return {
      answers: mapAnswers(result.templateAnswers, 'template'),
      overallScore: typeof result.score === 'number' ? result.score : null,
    };
  }

  async getCollaborativeNotes(candidateId: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`
    );
    return mapCollaborativeNotes(result.collaborativeNotes);
  }

  async saveCollaborativeNote(candidateId: string, content: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ collaborativeNote: content }),
      }
    );
    return mapCollaborativeNotes(result.collaborativeNotes);
  }

  async addCustomQuestion(candidateId: string, question: string) {
    const result = await this.request<RawFormAnswer[]>(
      `/api/interviews/${candidateId}/ad-hoc-questions`,
      {
        method: 'POST',
        body: JSON.stringify({ question }),
      }
    );
    return mapAnswers(result, 'ad-hoc', true);
  }

  async saveCustomAnswers(candidateId: string, answers: InterviewAnswer[]) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ adHocQuestions: toRawAnswers(answers) }),
      }
    );
    return {
      answers: mapAnswers(result.adHocQuestions, 'ad-hoc', true),
      overallScore: typeof result.score === 'number' ? result.score : null,
    };
  }

  async setStatus(candidateId: string, decision: Round2Decision) {
    const round2Status = decisionToBackendStatus(decision);
    const result = await this.request<RawStatusUpdate>(
      `/api/interviews/${candidateId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          round2Status,
          round2Decision: decision,
        }),
      }
    );
    const status = backendStatus(result.round2Status);
    return {
      status,
      decision: backendDecision(
        result.round2Decision,
        status,
        result.round2Status
      ),
    };
  }

  async getSettings(): Promise<InterviewSettings> {
    const result = await this.request<RawDepartmentConfig>(
      '/api/head-dashboard/config'
    );
    return {
      department: stringValue(result.department),
      generation: stringValue(result.generation),
      semester: stringValue(result.semester),
      questions: Array.isArray(result.interviewQuestions)
        ? result.interviewQuestions.filter(
            (question): question is string => typeof question === 'string'
          )
        : [],
      isScoringEnabled: result.isScoringEnabled === true,
      loadSource: 'backend-config',
    };
  }

  async saveSettings(settings: InterviewSettings) {
    const result = await this.request<RawDepartmentConfig>(
      '/api/head-dashboard/config',
      {
        method: 'PATCH',
        body: JSON.stringify({
          interviewQuestions: settings.questions,
          isScoringEnabled: settings.isScoringEnabled,
        }),
      }
    );
    const questions = Array.isArray(result.interviewQuestions)
      ? result.interviewQuestions.filter(
          (question): question is string => typeof question === 'string'
        )
      : settings.questions;
    return {
      department: stringValue(result.department) || settings.department,
      generation: stringValue(result.generation) || settings.generation,
      semester: stringValue(result.semester) || settings.semester,
      questions,
      isScoringEnabled: result.isScoringEnabled === true,
      loadSource: 'backend-config' as const,
    };
  }
}

export const interviewCockpitRepository: InterviewCockpitRepository =
  new HttpInterviewCockpitRepository();

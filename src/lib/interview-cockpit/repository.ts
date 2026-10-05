import type {
  BackendRound2Status,
  EvaluationNoteKey,
  EvaluationNotes,
  InterviewAnswer,
  InterviewCandidate,
  InterviewCockpitRepository,
  InterviewSettings,
  Round2CandidateSummary,
} from './types';

const SETTINGS_CACHE_KEY = 'finrecruit.round2.settings-cache.v1';
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
  generation?: unknown;
  semester?: unknown;
  interviewSlot?: RawInterviewSlot | null;
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
  evaluation?: {
    isScoringEnabled?: unknown;
    templateAnswers?: RawFormAnswer[];
    adHocQuestions?: RawFormAnswer[];
    notes?: Partial<Record<EvaluationNoteKey, unknown>>;
    score?: unknown;
  };
};

type RawEvaluationUpdate = {
  notes?: Partial<Record<EvaluationNoteKey, unknown>>;
  score?: unknown;
  templateAnswers?: RawFormAnswer[];
};

type RawStatusUpdate = {
  round2Status?: unknown;
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
  if (value === 'Pass' || value === 'Fail') return value;
  return 'Pending';
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

function mapNotes(
  notes?: Partial<Record<EvaluationNoteKey, unknown>>
): EvaluationNotes {
  return {
    note1: stringValue(notes?.note1),
    note2: stringValue(notes?.note2),
    note3: stringValue(notes?.note3),
  };
}

function mapSummary(candidate: RawCandidateSummary): Round2CandidateSummary {
  const email = stringValue(candidate.email);
  return {
    id: stringValue(candidate.id),
    fullName: stringValue(candidate.fullName),
    email,
    studentId: studentIdFromEmail(email),
    department: stringValue(candidate.department),
    generation: stringValue(candidate.generation),
    semester: stringValue(candidate.semester),
    interviewSlot: formatInterviewSlot(candidate.interviewSlot),
    status: backendStatus(candidate.round2Status),
  };
}

function mapCandidate(
  candidate: RawInterviewDetail,
  summary?: Round2CandidateSummary
): InterviewCandidate {
  const email = stringValue(candidate.email);
  const evaluation = candidate.evaluation;
  const rawScore = evaluation?.score;
  const score = typeof rawScore === 'number' ? rawScore : null;

  return {
    id: stringValue(candidate.id),
    fullName: stringValue(candidate.fullName),
    email,
    studentId: studentIdFromEmail(email),
    department: stringValue(candidate.department),
    generation: summary?.generation ?? '',
    semester: summary?.semester ?? '',
    interviewSlot: summary?.interviewSlot ?? 'Not scheduled',
    status: backendStatus(candidate.round2Status),
    majorAndYear: stringValue(candidate.majorAndYear),
    phone: stringValue(candidate.phone),
    facebookLink: stringValue(candidate.facebookLink) || undefined,
    cvLink: stringValue(candidate.cvLink) || undefined,
    generalAnswers: mapAnswers(candidate.generalAnswers, 'general'),
    departmentAnswers: mapAnswers(candidate.customAnswers, 'department'),
    evaluationAnswers: mapAnswers(evaluation?.templateAnswers, 'template'),
    adHocQuestions: mapAnswers(evaluation?.adHocQuestions, 'ad-hoc', true),
    notes: mapNotes(evaluation?.notes),
    score,
    isScoringEnabled: evaluation?.isScoringEnabled === true,
  };
}

function toRawAnswers(answers: InterviewAnswer[]): RawFormAnswer[] {
  return answers.map(({ question, answer }) => ({ question, answer }));
}

function readSettingsCache(): InterviewSettings | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(SETTINGS_CACHE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<InterviewSettings>;
    if (!Array.isArray(parsed.questions)) return null;
    return {
      department: stringValue(parsed.department),
      generation: stringValue(parsed.generation),
      semester: stringValue(parsed.semester),
      questions: parsed.questions.filter(
        (question): question is string => typeof question === 'string'
      ),
      isScoringEnabled: parsed.isScoringEnabled === true,
      loadSource: 'saved-browser-cache',
    };
  } catch {
    return null;
  }
}

function writeSettingsCache(settings: InterviewSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    SETTINGS_CACHE_KEY,
    JSON.stringify({
      department: settings.department,
      generation: settings.generation,
      semester: settings.semester,
      questions: settings.questions,
      isScoringEnabled: settings.isScoringEnabled,
    })
  );
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
    return mapAnswers(result.templateAnswers, 'template');
  }

  async saveNote(candidateId: string, key: EvaluationNoteKey, note: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ [key]: note }),
      }
    );
    return mapNotes(result.notes);
  }

  async addCustomQuestion(
    candidateId: string,
    question: string,
    answer: string
  ) {
    const result = await this.request<RawFormAnswer[]>(
      `/api/interviews/${candidateId}/ad-hoc-questions`,
      {
        method: 'POST',
        body: JSON.stringify({ question, answer }),
      }
    );
    return mapAnswers(result, 'ad-hoc', true);
  }

  async setStatus(candidateId: string, status: BackendRound2Status) {
    const result = await this.request<RawStatusUpdate>(
      `/api/interviews/${candidateId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ round2Status: status }),
      }
    );
    return backendStatus(result.round2Status);
  }

  async getSettings(): Promise<InterviewSettings> {
    try {
      const [summary] = await this.listCandidates();
      if (summary) {
        const detail = await this.request<RawInterviewDetail>(
          `/api/interviews/${summary.id}`
        );
        const candidate = mapCandidate(detail, summary);
        return {
          department: candidate.department,
          generation: candidate.generation,
          semester: candidate.semester,
          questions: candidate.evaluationAnswers.map(
            (answer) => answer.question
          ),
          isScoringEnabled: candidate.isScoringEnabled,
          loadSource: 'backend-candidate-snapshot',
        };
      }
    } catch (error) {
      const cached = readSettingsCache();
      if (cached) return cached;
      throw error;
    }

    return (
      readSettingsCache() ?? {
        department: '',
        generation: '',
        semester: '',
        questions: [],
        isScoringEnabled: false,
        loadSource: 'empty',
      }
    );
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
    const saved: InterviewSettings = {
      department: stringValue(result.department) || settings.department,
      generation: stringValue(result.generation) || settings.generation,
      semester: stringValue(result.semester) || settings.semester,
      questions,
      isScoringEnabled: result.isScoringEnabled === true,
      loadSource: 'saved-browser-cache',
    };
    writeSettingsCache(saved);
    return saved;
  }

  async saveScore(candidateId: string, score: number | null) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ score }),
      }
    );
    return typeof result.score === 'number' ? result.score : null;
  }
}

export const interviewCockpitRepository: InterviewCockpitRepository =
  new HttpInterviewCockpitRepository();

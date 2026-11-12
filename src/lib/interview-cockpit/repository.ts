import type {
  BackendRound2Status,
  CandidateSubmission,
  CollaborativeNote,
  InterviewAnswer,
  InterviewCandidate,
  InterviewCockpitRepository,
  InterviewSettings,
  QuestionAuthor,
  Round2CandidateSummary,
} from './types';

const PAGE_SIZE = 100;

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
};

// Kiểu dữ liệu nhận từ server
type RawFormAnswer = {
  question?: unknown;
  answer?: unknown; // Dành riêng cho Vòng 1
  addedBy?: unknown;
  isEdited?: unknown;
  collaborativeNotes?: RawCollaborativeNote[];
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
  interviewSlotId?: unknown;
  interviewSlotStatus?: unknown;
  generalAnswers?: RawFormAnswer[];
  customAnswers?: RawFormAnswer[];
  department?: unknown;
  round2Status?: unknown;
  evaluation?: {
    templateAnswers?: RawFormAnswer[];
    adHocQuestions?: RawFormAnswer[];
    generalNotes?: RawCollaborativeNote[];
  };
};

type RawEvaluationUpdate = {
  templateAnswers?: Partial<RawFormAnswer>[];
  adHocQuestions?: Partial<RawFormAnswer>[];
  generalNotes?: RawCollaborativeNote[];
};

type RawStatusUpdate = {
  round2Status?: unknown;
};

type RawDepartmentConfig = {
  department?: unknown;
  generation?: unknown;
  semester?: unknown;
  interviewQuestions?: unknown;
};

// Utils xử lý chuỗi
function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function backendStatus(value: unknown): BackendRound2Status {
  if (value === 'Pass') return 'Pass';
  if (value === 'Fail') return 'Fail';
  return 'Pending';
}

function studentIdFromEmail(email: string) {
  return email.split('@')[0] || email;
}

// Map Notes
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
      role: (['Department Head', 'Member', 'Executive Board'].includes(
        note.role as string
      )
        ? note.role
        : 'Member') as 'Department Head' | 'Member' | 'Executive Board',
      content: stringValue(note.content),
      updatedAt: stringValue(note.updatedAt),
    }))
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
}

// ----------------------------------------------------
// MAP DỮ LIỆU VÒNG 1 (CÓ ANSWER)
// ----------------------------------------------------
function mapSubmission(
  answer: RawFormAnswer,
  index: number,
  prefix: string
): CandidateSubmission {
  return {
    id: `${prefix}-${index + 1}`,
    question: stringValue(answer.question),
    answer: stringValue(answer.answer),
  };
}

function mapSubmissions(answers: RawFormAnswer[] | undefined, prefix: string) {
  return (Array.isArray(answers) ? answers : []).map((answer, index) =>
    mapSubmission(answer, index, prefix)
  );
}

function mapQuestionAuthor(raw: unknown): QuestionAuthor | undefined {
  if (!raw) return undefined;

  // Trường hợp 1: Dữ liệu mới dạng object { name, email, role }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const email = stringValue(obj.email);
    const name = stringValue(obj.name) || email.split('@')[0];
    const role = (
      ['Department Head', 'Member', 'Executive Board'].includes(
        obj.role as string
      )
        ? obj.role
        : 'Department Head'
    ) as 'Department Head' | 'Member' | 'Executive Board';

    if (!name && !email) return undefined;
    return { name, email, role };
  }

  // Trường hợp 2: Tương thích ngược dữ liệu cũ trong DB (chỉ lưu string email)
  if (typeof raw === 'string' && raw.trim()) {
    return {
      name: raw.split('@')[0],
      email: raw.trim(),
      role: 'Department Head',
    };
  }

  return undefined;
}

function mapAnswer(
  answer: RawFormAnswer,
  index: number,
  prefix: string,
  isCustom = false
): InterviewAnswer {
  const author = mapQuestionAuthor(answer.addedBy);
  return {
    id: `${prefix}-${index + 1}`,
    question: stringValue(answer.question),
    ...(isCustom ? { isCustom: true } : {}),
    ...(answer.isEdited ? { isEdited: true } : {}),
    ...(author ? { addedBy: author } : {}),
    collaborativeNotes: mapCollaborativeNotes(answer.collaborativeNotes),
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

// ----------------------------------------------------
// MAP ỨNG VIÊN
// ----------------------------------------------------
function mapSummary(candidate: RawCandidateSummary): Round2CandidateSummary {
  const email = stringValue(candidate.email);
  return {
    id: stringValue(candidate.id),
    fullName: stringValue(candidate.fullName),
    email,
    studentId: studentIdFromEmail(email),
    department: stringValue(candidate.department),
    status: backendStatus(candidate.round2Status),
  };
}

function mapCandidate(candidate: RawInterviewDetail): InterviewCandidate {
  const email = stringValue(candidate.email);
  const evaluation = candidate.evaluation;

  return {
    id: stringValue(candidate.id),
    fullName: stringValue(candidate.fullName),
    email,
    studentId: studentIdFromEmail(email),
    department: stringValue(candidate.department),
    status: backendStatus(candidate.round2Status),
    majorAndYear: stringValue(candidate.majorAndYear),
    phone: stringValue(candidate.phone),
    facebookLink: stringValue(candidate.facebookLink) || undefined,
    cvLink: stringValue(candidate.cvLink) || undefined,
    interviewSlotId: stringValue(candidate.interviewSlotId) || undefined,
    interviewSlotStatus: stringValue(candidate.interviewSlotStatus) as
      | 'AVAILABLE'
      | 'BOOKED'
      | 'COMPLETED'
      | 'NO_SHOW'
      | undefined,

    // Vòng 1
    generalAnswers: mapSubmissions(candidate.generalAnswers, 'general'),
    departmentAnswers: mapSubmissions(candidate.customAnswers, 'department'),

    // Vòng 2
    evaluationAnswers: mapAnswers(evaluation?.templateAnswers, 'template'),
    adHocQuestions: mapAnswers(evaluation?.adHocQuestions, 'ad-hoc', true),
    generalNotes: mapCollaborativeNotes(evaluation?.generalNotes),
  };
}

function toRawAnswers(answers: InterviewAnswer[]): Partial<RawFormAnswer>[] {
  return answers.map(({ question, addedBy, isEdited, collaborativeNotes }) => ({
    question,
    ...(addedBy ? { addedBy } : {}),
    ...(isEdited ? { isEdited } : {}),
    ...(collaborativeNotes ? { collaborativeNotes } : {}),
  }));
}

// ----------------------------------------------------
// API CLIENT REPOSITORY
// ----------------------------------------------------
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

    return mapCandidate(detail);
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
    };
  }

  async getGeneralNotes(candidateId: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`
    );
    return mapCollaborativeNotes(result.generalNotes);
  }

  async saveGeneralNote(candidateId: string, content: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ generalNote: content }),
      }
    );
    return mapCollaborativeNotes(result.generalNotes);
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
    };
  }

  async updateCustomQuestion(
    candidateId: string,
    questionId: string,
    newText: string
  ) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/ad-hoc-questions`,
      {
        method: 'PATCH',
        body: JSON.stringify({ questionId, newText }),
      }
    );
    return {
      answers: mapAnswers(result.adHocQuestions, 'ad-hoc', true),
    };
  }

  // THÊM: Hàm xóa câu hỏi AdHoc
  async deleteCustomQuestion(candidateId: string, questionId: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/ad-hoc-questions`,
      {
        method: 'DELETE',
        body: JSON.stringify({ questionId }),
      }
    );
    return {
      answers: mapAnswers(result.adHocQuestions, 'ad-hoc', true),
    };
  }

  // THÊM: Hàm xóa câu hỏi Template
  async deleteTemplateQuestion(candidateId: string, questionId: string) {
    const result = await this.request<RawEvaluationUpdate>(
      `/api/interviews/${candidateId}/notes`,
      {
        method: 'DELETE', // Gọi DELETE tới route notes để xử lý
        body: JSON.stringify({ questionId, type: 'template' }),
      }
    );
    return {
      answers: mapAnswers(result.templateAnswers, 'template', false),
    };
  }

  async setStatus(candidateId: string, status: BackendRound2Status) {
    const result = await this.request<RawStatusUpdate>(
      `/api/interviews/${candidateId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          round2Status: status,
        }),
      }
    );
    return {
      status: backendStatus(result.round2Status),
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
      loadSource: 'backend-config' as const,
    };
  }
}

export const interviewCockpitRepository: InterviewCockpitRepository =
  new HttpInterviewCockpitRepository();

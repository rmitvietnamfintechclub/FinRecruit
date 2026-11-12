export const BACKEND_ROUND_2_STATUSES = ['Pending', 'Pass', 'Fail'] as const;

export type BackendRound2Status = (typeof BACKEND_ROUND_2_STATUSES)[number];
export type CockpitRole = 'Department Head' | 'Member' | 'Executive Board';
export type SaveState = 'saved' | 'saving' | 'error';

export type CollaborativeNote = {
  authorId: string;
  authorEmail: string;
  authorName: string;
  role: CockpitRole;
  content: string;
  updatedAt: string;
};

// 1. Dành cho câu trả lời của Ứng viên (Vòng 1) - BẮT BUỘC CÓ field answer
export type CandidateSubmission = {
  id: string;
  question: string;
  answer: string;
};

// 2. Dành cho câu hỏi của Hội đồng (Vòng 2) - KHÔNG CÓ answer, chỉ có notes
export type QuestionAuthor = {
  name: string;
  email: string;
  role: CockpitRole;
};

export type InterviewAnswer = {
  id: string;
  question: string;
  isCustom?: boolean;
  addedBy?: QuestionAuthor;
  collaborativeNotes: CollaborativeNote[];
};

export type CockpitUser = {
  id: string;
  email: string;
  name: string;
  role: CockpitRole;
};

export type EvaluationSaveResult = {
  answers: InterviewAnswer[];
};

export type Round2StatusResult = {
  status: BackendRound2Status;
};

export type Round2CandidateSummary = {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  department: string;
  status: BackendRound2Status;
};

export type SlotStatusType = 'AVAILABLE' | 'BOOKED' | 'COMPLETED' | 'NO_SHOW';

export type InterviewCandidate = Round2CandidateSummary & {
  majorAndYear: string;
  phone: string;
  facebookLink?: string;
  cvLink?: string;
  interviewSlotId?: string;
  interviewSlotStatus?: SlotStatusType;

  // ĐÃ CẬP NHẬT: Dùng type CandidateSubmission (có answer) cho Vòng 1
  generalAnswers: CandidateSubmission[];
  departmentAnswers: CandidateSubmission[];

  // Dùng type InterviewAnswer (không có answer) cho Vòng 2
  evaluationAnswers: InterviewAnswer[];
  adHocQuestions: InterviewAnswer[];
  generalNotes: CollaborativeNote[];
};

export type SettingsLoadSource = 'backend-config' | 'empty';

export type InterviewSettings = {
  department: string;
  generation: string;
  semester: string;
  questions: string[];
  loadSource: SettingsLoadSource;
};

export interface InterviewCockpitRepository {
  listCandidates(): Promise<Round2CandidateSummary[]>;
  getCandidate(candidateId: string): Promise<InterviewCandidate>;
  saveTemplateAnswers(
    candidateId: string,
    answers: InterviewAnswer[]
  ): Promise<EvaluationSaveResult>;
  getGeneralNotes(candidateId: string): Promise<CollaborativeNote[]>;
  saveGeneralNote(
    candidateId: string,
    content: string
  ): Promise<CollaborativeNote[]>;
  addCustomQuestion(
    candidateId: string,
    question: string
  ): Promise<InterviewAnswer[]>;
  saveCustomAnswers(
    candidateId: string,
    answers: InterviewAnswer[]
  ): Promise<EvaluationSaveResult>;
  setStatus(
    candidateId: string,
    status: BackendRound2Status
  ): Promise<Round2StatusResult>;
  getSettings(): Promise<InterviewSettings>;
  saveSettings(settings: InterviewSettings): Promise<InterviewSettings>;
}

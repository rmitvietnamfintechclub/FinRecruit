export const BACKEND_ROUND_2_STATUSES = ['Pending', 'Pass', 'Fail'] as const;
export const ROUND_2_DECISIONS = ['Pass', 'Fail', 'No Show'] as const;

export type BackendRound2Status = (typeof BACKEND_ROUND_2_STATUSES)[number];
export type Round2Decision = (typeof ROUND_2_DECISIONS)[number];
export type CockpitRole = 'Department Head' | 'Member';
export type SaveState = 'saved' | 'saving' | 'error';

export type InterviewAnswer = {
  id: string;
  question: string;
  answer: string;
  score: number | null;
  isCustom?: boolean;
  addedBy?: string;
};

export type CollaborativeNote = {
  authorId: string;
  authorEmail: string;
  authorName: string;
  role: CockpitRole;
  content: string;
  updatedAt: string;
};

export type CockpitUser = {
  id: string;
  email: string;
  name: string;
  role: CockpitRole;
};

export type EvaluationSaveResult = {
  answers: InterviewAnswer[];
  overallScore: number | null;
};

export type Round2DecisionResult = {
  status: BackendRound2Status;
  decision: Round2Decision | null;
};

export type Round2CandidateSummary = {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  department: string;
  generation: string;
  semester: string;
  interviewSlot: string;
  status: BackendRound2Status;
  /**
   * The selected decision. `No Show` remains distinct here and in
   * `round2Decision`, while the workflow `round2Status` is stored as `Fail`.
   */
  selectedDecision: Round2Decision | null;
  score: number | null;
};

export type InterviewCandidate = Round2CandidateSummary & {
  majorAndYear: string;
  phone: string;
  facebookLink?: string;
  cvLink?: string;
  generalAnswers: InterviewAnswer[];
  departmentAnswers: InterviewAnswer[];
  evaluationAnswers: InterviewAnswer[];
  adHocQuestions: InterviewAnswer[];
  collaborativeNotes: CollaborativeNote[];
  isScoringEnabled: boolean;
};

export type SettingsLoadSource = 'backend-config' | 'empty';

export type InterviewSettings = {
  department: string;
  generation: string;
  semester: string;
  questions: string[];
  isScoringEnabled: boolean;
  loadSource: SettingsLoadSource;
};

export interface InterviewCockpitRepository {
  listCandidates(): Promise<Round2CandidateSummary[]>;
  getCandidate(candidateId: string): Promise<InterviewCandidate>;
  saveTemplateAnswers(
    candidateId: string,
    answers: InterviewAnswer[]
  ): Promise<EvaluationSaveResult>;
  getCollaborativeNotes(candidateId: string): Promise<CollaborativeNote[]>;
  saveCollaborativeNote(
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
    status: Round2Decision
  ): Promise<Round2DecisionResult>;
  getSettings(): Promise<InterviewSettings>;
  saveSettings(settings: InterviewSettings): Promise<InterviewSettings>;
}

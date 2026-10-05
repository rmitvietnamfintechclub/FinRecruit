export const BACKEND_ROUND_2_STATUSES = ['Pending', 'Pass', 'Fail'] as const;
export const ROUND_2_STATUSES = [
  ...BACKEND_ROUND_2_STATUSES,
  'No Show',
] as const;

export type BackendRound2Status = (typeof BACKEND_ROUND_2_STATUSES)[number];
export type Round2Status = (typeof ROUND_2_STATUSES)[number];
export type CockpitRole = 'Department Head' | 'Member';
export type SaveState = 'saved' | 'saving' | 'error';
export type EvaluationNoteKey = 'note1' | 'note2' | 'note3';

export type InterviewAnswer = {
  id: string;
  question: string;
  answer: string;
  isCustom?: boolean;
  addedBy?: string;
};

export type EvaluationNotes = Record<EvaluationNoteKey, string>;

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
  notes: EvaluationNotes;
  score: number | null;
  isScoringEnabled: boolean;
};

export type SettingsLoadSource =
  | 'backend-candidate-snapshot'
  | 'saved-browser-cache'
  | 'empty';

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
  ): Promise<InterviewAnswer[]>;
  saveNote(
    candidateId: string,
    key: EvaluationNoteKey,
    note: string
  ): Promise<EvaluationNotes>;
  addCustomQuestion(
    candidateId: string,
    question: string,
    answer: string
  ): Promise<InterviewAnswer[]>;
  setStatus(
    candidateId: string,
    status: BackendRound2Status
  ): Promise<BackendRound2Status>;
  getSettings(): Promise<InterviewSettings>;
  saveSettings(settings: InterviewSettings): Promise<InterviewSettings>;
  saveScore(candidateId: string, score: number | null): Promise<number | null>;
}

export const ROUND_2_STATUSES = ['Pending', 'Pass', 'Fail', 'No Show'] as const;

export type Round2Status = (typeof ROUND_2_STATUSES)[number];
export type CockpitRole = 'Department Head' | 'Member';
export type SaveState = 'saved' | 'saving' | 'error';

export type InterviewAnswer = {
  id: string;
  question: string;
  answer: string;
  isCustom?: boolean;
};

export type TeamInsight = {
  id: string;
  questionId: string;
  author: string;
  role: CockpitRole;
  note: string;
};

export type Round2CandidateSummary = {
  id: string;
  fullName: string;
  studentId: string;
  department: string;
  generation: string;
  interviewSlot: string;
  status: Round2Status;
};

export type InterviewCandidate = Round2CandidateSummary & {
  dob: string;
  majorAndYear: string;
  phone: string;
  facebookLink: string;
  cvLink: string;
  choice1: string;
  choice2: string;
  generalAnswers: InterviewAnswer[];
  departmentAnswers: InterviewAnswer[];
  evaluationAnswers: InterviewAnswer[];
  insights: TeamInsight[];
  generalNote: string;
  score: number | null;
};

export type InterviewSettings = {
  department: string;
  generation: string;
  semester: string;
  questions: string[];
  isScoringEnabled: boolean;
};

export interface InterviewCockpitRepository {
  listCandidates(): Promise<Round2CandidateSummary[]>;
  getCandidate(candidateId: string): Promise<InterviewCandidate>;
  saveAnswer(candidateId: string, answer: InterviewAnswer): Promise<void>;
  saveGeneralNote(candidateId: string, note: string): Promise<void>;
  addCustomQuestion(
    candidateId: string,
    question: string
  ): Promise<InterviewAnswer>;
  setStatus(candidateId: string, status: Round2Status): Promise<void>;
  getSettings(): Promise<InterviewSettings>;
  saveSettings(settings: InterviewSettings): Promise<void>;
  saveScore(candidateId: string, score: number | null): Promise<void>;
}

import {
  MOCK_INTERVIEW_CANDIDATES,
  MOCK_INTERVIEW_SETTINGS,
} from './mock-data';
import type {
  InterviewAnswer,
  InterviewCandidate,
  InterviewCockpitRepository,
  InterviewSettings,
  Round2CandidateSummary,
  Round2Status,
} from './types';

const STORAGE_KEY = 'finrecruit.round2.mock.v1';
const SETTINGS_KEY = 'finrecruit.round2.settings.v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function readCandidates(): InterviewCandidate[] {
  if (typeof window === 'undefined') return clone(MOCK_INTERVIEW_CANDIDATES);
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored
    ? (JSON.parse(stored) as InterviewCandidate[])
    : clone(MOCK_INTERVIEW_CANDIDATES);
}

function writeCandidates(candidates: InterviewCandidate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
}

class MockInterviewCockpitRepository implements InterviewCockpitRepository {
  async listCandidates(): Promise<Round2CandidateSummary[]> {
    return readCandidates();
  }
  async getCandidate(candidateId: string): Promise<InterviewCandidate> {
    const candidate = readCandidates().find((item) => item.id === candidateId);
    if (!candidate) throw new Error('Candidate not found.');
    return clone(candidate);
  }
  async saveAnswer(candidateId: string, answer: InterviewAnswer) {
    const candidates = readCandidates();
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error('Candidate not found.');
    const index = candidate.evaluationAnswers.findIndex(
      (item) => item.id === answer.id
    );
    if (index >= 0) candidate.evaluationAnswers[index] = answer;
    else candidate.evaluationAnswers.push(answer);
    writeCandidates(candidates);
  }
  async saveGeneralNote(candidateId: string, note: string) {
    const candidates = readCandidates();
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error('Candidate not found.');
    candidate.generalNote = note;
    writeCandidates(candidates);
  }
  async addCustomQuestion(candidateId: string, question: string) {
    const answer: InterviewAnswer = {
      id: `custom-${Date.now()}`,
      question,
      answer: '',
      isCustom: true,
    };
    await this.saveAnswer(candidateId, answer);
    return answer;
  }
  async setStatus(candidateId: string, status: Round2Status) {
    const candidates = readCandidates();
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error('Candidate not found.');
    candidate.status = status;
    writeCandidates(candidates);
  }
  async getSettings() {
    if (typeof window === 'undefined') return clone(MOCK_INTERVIEW_SETTINGS);
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    return stored
      ? (JSON.parse(stored) as InterviewSettings)
      : clone(MOCK_INTERVIEW_SETTINGS);
  }
  async saveSettings(settings: InterviewSettings) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
  async saveScore(candidateId: string, score: number | null) {
    const candidates = readCandidates();
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error('Candidate not found.');
    candidate.score = score;
    writeCandidates(candidates);
  }
}

/** Backend-ready adapter. Keep contracts here so UI files do not change when Epic 3/5 APIs land. */
export class HttpInterviewCockpitRepository implements InterviewCockpitRepository {
  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    const payload = (await response.json()) as {
      success: boolean;
      data?: T;
      message?: string;
    };
    if (!response.ok || !payload.success || payload.data === undefined)
      throw new Error(payload.message ?? `Request failed (${response.status})`);
    return payload.data;
  }
  listCandidates() {
    return this.request<Round2CandidateSummary[]>('/api/interviews');
  }
  getCandidate(id: string) {
    return this.request<InterviewCandidate>(`/api/interviews/${id}`);
  }
  saveAnswer(id: string, answer: InterviewAnswer) {
    return this.request<void>(`/api/interviews/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ answer }),
    });
  }
  saveGeneralNote(id: string, note: string) {
    return this.request<void>(`/api/interviews/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ generalNote: note }),
    });
  }
  addCustomQuestion(id: string, question: string) {
    return this.request<InterviewAnswer>(
      `/api/interviews/${id}/ad-hoc-questions`,
      { method: 'POST', body: JSON.stringify({ question }) }
    );
  }
  setStatus(id: string, status: Round2Status) {
    return this.request<void>(`/api/interviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
  getSettings() {
    return this.request<InterviewSettings>('/api/head-dashboard/config');
  }
  saveSettings(settings: InterviewSettings) {
    return this.request<void>('/api/head-dashboard/config', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }
  saveScore(id: string, score: number | null) {
    return this.request<void>(`/api/interviews/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ score }),
    });
  }
}

export const interviewCockpitRepository: InterviewCockpitRepository =
  new MockInterviewCockpitRepository();

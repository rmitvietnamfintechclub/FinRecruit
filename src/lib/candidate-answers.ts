import type { ICustomAnswer } from '@/app/(backend)/types';

/** Exact top-level key Power Automate sends for department choice explanation. */
export const DEPARTMENT_EXPLANATION_PA_KEY =
  'Provide an explanation for your choice of department';

/** Legacy flat DB fields → canonical question labels (read fallback). */
export const LEGACY_GENERAL_FIELD_LABELS: Record<string, string> = {
  futurePlans: 'What are your plans for the year of 2026 and 2027?',
  fintechAspect:
    'What aspect of the FinTech industry are you most excited about and explain why?',
  achievementExpectation:
    'What do you want to achieve MOST after joining FinTech Club? (Be specific about your expectations)',
  timeCommitment:
    'What is the maximum amount of time (hours) can you dedicate to club work per week?',
  questionsForUs: 'Do you have any question for us?',
};

const KNOWN_CANDIDATE_KEYS = new Set([
  'msFormResponseId',
  'fullName',
  'email',
  'dob',
  'phone',
  'majorAndYear',
  'facebookLink',
  'cvLink',
  'choice1',
  'choice2',
  'department',
  'status',
  'isRerouted',
  'reviewerEmail',
  'generalAnswers',
  'departmentExplanation',
  'customAnswers',
  'generation',
  'semester',
  'appliedAt',
  '_id',
  'createdAt',
  'updatedAt',
  '__v',
  'futurePlans',
  'fintechAspect',
  'achievementExpectation',
  'timeCommitment',
  'explanation',
  'questionsForUs',
]);

function isCustomAnswer(value: unknown): value is ICustomAnswer {
  return (
    typeof value === 'object' &&
    value !== null &&
    'question' in value &&
    typeof (value as ICustomAnswer).question === 'string'
  );
}

function filterAnswerPairs(items: unknown): ICustomAnswer[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(isCustomAnswer)
    .map((item) => ({
      question: item.question.trim(),
      answer: String(item.answer ?? '').trim(),
    }))
    .filter((item) => item.question && item.answer);
}

export function normalizeCustomAnswers(doc: {
  customAnswers?: ICustomAnswer[] | null;
}): ICustomAnswer[] {
  return filterAnswerPairs(doc.customAnswers);
}

export function normalizeGeneralAnswers(
  doc: Record<string, unknown>
): ICustomAnswer[] {
  const fromArray = filterAnswerPairs(doc.generalAnswers);
  if (fromArray.length > 0) return fromArray;

  const legacy: ICustomAnswer[] = [];
  for (const [field, label] of Object.entries(LEGACY_GENERAL_FIELD_LABELS)) {
    const answer = String(doc[field] ?? '').trim();
    if (answer) legacy.push({ question: label, answer });
  }
  return legacy;
}

export function normalizeDepartmentExplanation(
  doc: Record<string, unknown>
): ICustomAnswer | null {
  const embedded = doc.departmentExplanation;
  if (isCustomAnswer(embedded)) {
    const question = embedded.question.trim();
    const answer = String(embedded.answer ?? '').trim();
    if (question && answer) return { question, answer };
  }

  const legacy = String(doc.explanation ?? '').trim();
  if (legacy) {
    return {
      question: DEPARTMENT_EXPLANATION_PA_KEY,
      answer: legacy,
    };
  }

  return null;
}

function extractDepartmentExplanationFromPayload(
  raw: Record<string, unknown>
): ICustomAnswer | undefined {
  if (isCustomAnswer(raw.departmentExplanation)) {
    const question = raw.departmentExplanation.question.trim();
    const answer = String(raw.departmentExplanation.answer ?? '').trim();
    if (question && answer) return { question, answer };
  }

  const fromPaKey = raw[DEPARTMENT_EXPLANATION_PA_KEY];
  if (fromPaKey != null && String(fromPaKey).trim() !== '') {
    return {
      question: DEPARTMENT_EXPLANATION_PA_KEY,
      answer: String(fromPaKey).trim(),
    };
  }

  const legacy = String(raw.explanation ?? '').trim();
  if (legacy) {
    return {
      question: DEPARTMENT_EXPLANATION_PA_KEY,
      answer: legacy,
    };
  }

  return undefined;
}

export function normalizePowerAutomatePayload(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of KNOWN_CANDIDATE_KEYS) {
    if (key in raw && raw[key] !== undefined) {
      out[key] = raw[key];
    }
  }

  const departmentExplanation = extractDepartmentExplanationFromPayload(raw);
  if (departmentExplanation) {
    out.departmentExplanation = departmentExplanation;
  }

  const generalFromArray = filterAnswerPairs(raw.generalAnswers);
  if (generalFromArray.length > 0) {
    out.generalAnswers = generalFromArray;
  } else {
    const built = normalizeGeneralAnswers(raw);
    if (built.length > 0) out.generalAnswers = built;
  }

  out.customAnswers = filterAnswerPairs(raw.customAnswers);

  delete out.futurePlans;
  delete out.fintechAspect;
  delete out.achievementExpectation;
  delete out.timeCommitment;
  delete out.questionsForUs;
  delete out.explanation;
  delete out[DEPARTMENT_EXPLANATION_PA_KEY];

  return out;
}

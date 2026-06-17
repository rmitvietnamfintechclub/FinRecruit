import type { ICustomAnswer } from '@/app/(backend)/types';

/** Exact question label for department choice explanation (also used as PA top-level key). */
export const DEPARTMENT_EXPLANATION_PA_KEY =
  'Provide an explanation for your choice of department';

const DEPARTMENT_EXPLANATION_KEY_PATTERN =
  /provide\s+an\s+explanation\s+for\s+your\s+choice\s+of\s+department/i;

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
  'customAnswers',
  'generation',
  'semester',
  'appliedAt',
  '_id',
  'createdAt',
  'updatedAt',
  '__v',
  // legacy (read fallback only; stripped before save)
  'futurePlans',
  'fintechAspect',
  'achievementExpectation',
  'timeCommitment',
  'explanation',
  'questionsForUs',
  'departmentExplanation',
]);

function isCustomAnswer(value: unknown): value is ICustomAnswer {
  return (
    typeof value === 'object' &&
    value !== null &&
    'question' in value &&
    typeof (value as ICustomAnswer).question === 'string'
  );
}

function isDepartmentExplanationQuestion(question: string): boolean {
  const trimmed = question.trim();
  return (
    trimmed === DEPARTMENT_EXPLANATION_PA_KEY ||
    trimmed === `${DEPARTMENT_EXPLANATION_PA_KEY}?` ||
    DEPARTMENT_EXPLANATION_KEY_PATTERN.test(trimmed)
  );
}

function findDepartmentExplanationSourceKey(
  record: Record<string, unknown>
): string | null {
  if (DEPARTMENT_EXPLANATION_PA_KEY in record) {
    return DEPARTMENT_EXPLANATION_PA_KEY;
  }

  for (const key of Object.keys(record)) {
    const trimmed = key.trim();
    if (
      trimmed === DEPARTMENT_EXPLANATION_PA_KEY ||
      trimmed === `${DEPARTMENT_EXPLANATION_PA_KEY}?` ||
      DEPARTMENT_EXPLANATION_KEY_PATTERN.test(trimmed)
    ) {
      return key;
    }
  }

  return null;
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

function extractDepartmentExplanationFromRecord(
  doc: Record<string, unknown>
): ICustomAnswer | null {
  const embedded = doc.departmentExplanation;
  if (isCustomAnswer(embedded)) {
    const question = embedded.question.trim() || DEPARTMENT_EXPLANATION_PA_KEY;
    const answer = String(embedded.answer ?? '').trim();
    if (answer) return { question, answer };
  }

  const sourceKey = findDepartmentExplanationSourceKey(doc);
  if (sourceKey) {
    const answer = String(doc[sourceKey] ?? '').trim();
    if (answer) {
      return { question: DEPARTMENT_EXPLANATION_PA_KEY, answer };
    }
  }

  const legacy = String(doc.explanation ?? '').trim();
  if (legacy) {
    return { question: DEPARTMENT_EXPLANATION_PA_KEY, answer: legacy };
  }

  return null;
}

function appendDepartmentExplanationIfMissing(
  answers: ICustomAnswer[],
  doc: Record<string, unknown>
): ICustomAnswer[] {
  const dept = extractDepartmentExplanationFromRecord(doc);
  if (!dept) return answers;

  const exists = answers.some((item) =>
    isDepartmentExplanationQuestion(item.question)
  );
  if (exists) return answers;

  return [...answers, dept];
}

export function normalizeCustomAnswers(doc: {
  customAnswers?: ICustomAnswer[] | null;
}): ICustomAnswer[] {
  return filterAnswerPairs(doc.customAnswers);
}

/** General form Q&A including department choice explanation (6th item from PA). */
export function normalizeGeneralAnswers(
  doc: Record<string, unknown>
): ICustomAnswer[] {
  const fromArray = filterAnswerPairs(doc.generalAnswers);
  if (fromArray.length > 0) {
    return appendDepartmentExplanationIfMissing(fromArray, doc);
  }

  const legacy: ICustomAnswer[] = [];
  for (const [field, label] of Object.entries(LEGACY_GENERAL_FIELD_LABELS)) {
    const answer = String(doc[field] ?? '').trim();
    if (answer) legacy.push({ question: label, answer });
  }
  return appendDepartmentExplanationIfMissing(legacy, doc);
}

export function normalizePowerAutomatePayload(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of KNOWN_CANDIDATE_KEYS) {
    if (key === 'generalAnswers' || key === 'departmentExplanation') continue;
    if (key in raw && raw[key] !== undefined) {
      out[key] = raw[key];
    }
  }

  out.generalAnswers = normalizeGeneralAnswers(raw);
  out.customAnswers = filterAnswerPairs(raw.customAnswers);

  delete out.futurePlans;
  delete out.fintechAspect;
  delete out.achievementExpectation;
  delete out.timeCommitment;
  delete out.questionsForUs;
  delete out.explanation;
  delete out.departmentExplanation;

  return out;
}

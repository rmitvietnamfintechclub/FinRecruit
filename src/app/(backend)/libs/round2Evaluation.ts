import type { ICustomAnswer } from '@/app/(backend)/types';

export function isValidQuestionScore(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 100)
  );
}

export function questionScore(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

export function calculateOverallScore(
  templateAnswers: ICustomAnswer[],
  adHocQuestions: ICustomAnswer[]
): number | null {
  const scoredQuestions = [...templateAnswers, ...adHocQuestions]
    .map((item) => questionScore(item.score))
    .filter((score): score is number => score !== null);

  if (scoredQuestions.length === 0) return null;

  const average =
    scoredQuestions.reduce((total, score) => total + score, 0) /
    scoredQuestions.length;

  return Math.round(average * 100) / 100;
}

export function reconcileTemplateAnswers(
  questions: string[],
  storedAnswers: ICustomAnswer[]
): ICustomAnswer[] {
  const savedByQuestion = new Map(
    storedAnswers.map((item) => [String(item.question), item])
  );

  return questions.map((question) => {
    const saved = savedByQuestion.get(question);
    return {
      question,
      answer: String(saved?.answer ?? ''),
      score: questionScore(saved?.score),
    };
  });
}

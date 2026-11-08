import type { ICustomAnswer } from '@/app/(backend)/types';

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
    };
  });
}
import type { InterviewCandidate, InterviewSettings } from './types';

export const MOCK_INTERVIEW_SETTINGS: InterviewSettings = {
  department: 'Technology Department',
  generation: 'Gen 7',
  semester: '2026B',
  questions: [
    'Tell us about a technical problem you solved and how you approached it.',
    'How would you contribute to the Technology Department?',
  ],
  isScoringEnabled: false,
};

export const MOCK_INTERVIEW_CANDIDATES: InterviewCandidate[] = [
  {
    id: 'candidate-1',
    fullName: 'Nguyen Van A',
    studentId: 's412222',
    department: 'Technology Department',
    generation: 'Gen 7',
    interviewSlot: 'Nov 27, 2026 · 09:00–09:40',
    status: 'Pending',
    dob: '2006-12-20',
    majorAndYear: 'Finance · 2nd year',
    phone: '09•• ••• •••',
    facebookLink: '#',
    cvLink: '#',
    choice1: 'Technology Department',
    choice2: 'Business Department',
    generalAnswers: [
      {
        id: 'general-1',
        question: 'What are your plans for 2026 and 2027?',
        answer: 'Candidate response from the Round 1 application.',
      },
      {
        id: 'general-2',
        question: 'What do you want to achieve after joining FinTech Club?',
        answer: 'Candidate response from the Round 1 application.',
      },
    ],
    departmentAnswers: [
      {
        id: 'department-1',
        question: 'Why did you select this department?',
        answer: 'Candidate response from the Round 1 application.',
      },
    ],
    evaluationAnswers: MOCK_INTERVIEW_SETTINGS.questions.map(
      (question, index) => ({
        id: `template-${index + 1}`,
        question,
        answer: '',
      })
    ),
    insights: [
      {
        id: 'insight-1',
        questionId: 'template-1',
        author: 'Department Head',
        role: 'Department Head',
        note: 'Candidate shows a structured problem-solving approach.',
      },
      {
        id: 'insight-2',
        questionId: 'template-1',
        author: 'Member A',
        role: 'Member',
        note: 'Good attitude and communication.',
      },
    ],
    generalNote: '',
    score: null,
  },
  ...['candidate-2', 'candidate-3', 'candidate-4'].map((id, index) => ({
    id,
    fullName: ['Do Anh Khoa', 'Thinh Nguyen', 'Tran Minh B'][index],
    studentId: ['s4133333', 's413333', 's4432432'][index],
    department: 'Technology Department',
    generation: 'Gen 7',
    interviewSlot: [
      'Nov 27, 2026 · 09:40–10:20',
      'Nov 28, 2026 · 09:00–09:40',
      'Nov 29, 2026 · 09:00–09:40',
    ][index],
    status: 'Pending' as const,
    dob: '—',
    majorAndYear: '—',
    phone: '—',
    facebookLink: '#',
    cvLink: '#',
    choice1: 'Technology Department',
    choice2: 'Business Department',
    generalAnswers: [],
    departmentAnswers: [],
    evaluationAnswers: MOCK_INTERVIEW_SETTINGS.questions.map(
      (question, questionIndex) => ({
        id: `template-${questionIndex + 1}`,
        question,
        answer: '',
      })
    ),
    insights: [],
    generalNote: '',
    score: null,
  })),
];

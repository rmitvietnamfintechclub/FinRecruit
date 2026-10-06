# Epic 3 & 5 Integration Handoff

This implementation follows the Figma `Final` flow first and fills uncovered
states from Stories 3.1, 3.3, 3.4, 3.5, and 5.1. The frontend uses the existing
Next.js, TypeScript, Tailwind, shadcn-style components, standard `fetch`, and
cookie session conventions in this repository.

## Routes

- `/HeadDashboard/interviews`: Department Head Round 2 list and quick decision.
- `/InterviewCockpit/[candidateId]`: Head/Member split-view interview cockpit.
- `/HeadDashboard/interview-settings`: Head-only question and scoring config.

## API mapping

The typed frontend adapter is `src/lib/interview-cockpit/repository.ts`. Every
authenticated request uses `credentials: 'include'`.

| Frontend action                    | API                                         | Payload / response                                                                                                           |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Load Round 2 list                  | `GET /api/interviews`                       | Returns only active-cohort, Round 1-passed candidates assigned to the caller's department, including `round2Decision`        |
| Load cockpit                       | `GET /api/interviews/:id`                   | Returns the department template, answers, question scores, collaborative notes, computed overall score, status, and decision |
| Save template response/score       | `PATCH /api/interviews/:id/notes`           | `templateAnswers`; each score is an integer `0–100` or `null`                                                                |
| Read live note snapshot            | `GET /api/interviews/:id/notes`             | `collaborativeNotes`                                                                                                         |
| Save own collaborative note        | `PATCH /api/interviews/:id/notes`           | `collaborativeNote`; author identity, role, and timestamp come from the server session                                       |
| Create candidate-only question     | `POST /api/interviews/:id/ad-hoc-questions` | `question`; answer and score start empty                                                                                     |
| Save candidate-only response/score | `PATCH /api/interviews/:id/notes`           | `adHocQuestions`                                                                                                             |
| Save/change final decision         | `PATCH /api/interviews/:id/status`          | `round2Status` plus `round2Decision`                                                                                         |
| Load department config             | `GET /api/head-dashboard/config`            | Active department/cohort template and scoring switch                                                                         |
| Save department config             | `PATCH /api/head-dashboard/config`          | `interviewQuestions`, `isScoringEnabled`                                                                                     |

## Cockpit layout

- The cockpit uses the same `HeadDashboardShell` navbar as existing pages.
- Desktop starts at 40/60. The separator supports pointer drag from 30/70 to
  70/30, keyboard arrows in 5% steps, and double-click reset to 40/60.
- Mobile uses the Figma Profile/Evaluation tabs.
- Collaborative Notes and Final Decision stay docked at the bottom of the
  Evaluation panel while the question area scrolls.
- After a decision, answers and notes are read-only. The Department Head can
  still change the decision, with confirmation for every change.

## Status and decision contract

`round2Status` remains the existing workflow state:

```text
Pending | Pass | Fail
```

`round2Decision` records the control selected by the Head:

```text
null | Pass | Fail | No Show
```

Allowed pairs are:

| `round2Status` | `round2Decision` |
| -------------- | ---------------- |
| `Pending`      | `null`           |
| `Pass`         | `Pass`           |
| `Fail`         | `Fail`           |
| `Fail`         | `No Show`        |

This keeps No Show in the existing Fail statistics while preserving its meaning
across accounts, browsers, and devices. Existing documents without
`round2Decision` remain readable; the frontend falls back to their status.

## Collaborative notes

- Each authenticated Head/Member owns one note per candidate.
- The backend derives `authorId`, `authorEmail`, `authorName`, `role`, and
  `updatedAt` from the active session. Clients cannot impersonate another
  author.
- The current user's editor auto-saves after typing stops.
- Other interviewers' saved notes refresh through a notes-only background poll
  every 2 seconds. It does not reload/remount the page and never replaces the
  current user's local draft.
- Polling is used intentionally so local standalone MongoDB works without
  MongoDB Change Streams, WebSocket infrastructure, or Redis.
- Legacy `note1`, `note2`, and `note3` remain in the model/API for compatibility,
  but the current cockpit writes the author-aware collaborative note array.

## Per-question scoring

- Scoring fields are shown only while the department scoring switch is ON.
- Every Round 2 template question and candidate-only additional question has an
  optional whole-number score from `0` through `100`.
- Blank scores are stored as `null`. Text, decimals, fractions, negatives, and
  values greater than 100 are rejected.
- Overall Score is server-computed from scored questions only:

  `overall = sum(valid question scores) / number of scored questions`

- A score of `0` counts. An unscored question is excluded even when it has an
  answer. The result is rounded to two decimal places and is `null` when no
  question has a score.
- Direct writes to Overall Score are rejected. Removing template questions via
  Save & Apply also removes their stored answer/score and recomputes Overall.
- Turning scoring OFF hides question score inputs and the list score column;
  stored scores are retained if scoring is enabled again.

## Authentication and authorization

- Pages require a NextAuth session; APIs require the active application session
  cookie and `withRBAC`.
- Round 2 list/detail/notes/additional-question routes allow Head/Member, then
  require `candidate.department` to equal the session department and require a
  Round 1 `status` of `Pass`.
- Final decision and department configuration routes are Head-only.
- Templates are keyed by department + active generation + active semester.
- Round 1 rerouting already moves `candidate.department` to valid choice 2. The
  Round 1 Pass path now also assigns an `Unassigned` first-choice candidate to
  the authenticated Head's department, so Round 2 ownership has one source of
  truth.

Because the database has not been put into production, no data migration is
required. The schema additions are backward-compatible; restart the dev server
once after updating so Mongoose recompiles the Candidate model.

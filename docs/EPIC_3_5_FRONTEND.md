# Epic 3 & 5 Backend Integration Handoff

This implementation follows the Figma `Final` flow first and fills uncovered
states from Stories 3.1, 3.3, 3.4, 3.5, and 5.1. The Epic 3–5 frontend now uses
the Team02 API routes directly. No file under `src/app/(backend)` was edited.

## Routes

- `/HeadDashboard/interviews`: Round 2 candidate dashboard and quick decisions.
- `/InterviewCockpit/[candidateId]`: responsive interview cockpit inside the
  shared dashboard shell and navigation.
- `/HeadDashboard/interview-settings`: question template and optional scoring
  configuration.

## API mapping

The typed frontend adapter lives in
`src/lib/interview-cockpit/repository.ts`. It follows the existing application
convention: TypeScript, standard `fetch`, JSON payloads, and
`credentials: 'include'` for the Team02 application session cookie.

| Frontend action | Team02 route | Payload used |
| --- | --- | --- |
| Load Round 2 dashboard | `GET /api/interviews` | `page`, `limit` |
| Load cockpit | `GET /api/interviews/:id` | none |
| Save template responses | `PATCH /api/interviews/:id/notes` | `templateAnswers` |
| Save collaborative notes | `PATCH /api/interviews/:id/notes` | one of `note1`, `note2`, `note3` |
| Save Overall Score | `PATCH /api/interviews/:id/notes` | `score` |
| Create candidate-only Q&A | `POST /api/interviews/:id/ad-hoc-questions` | `question`, `answer` |
| Final Pass/Fail | `PATCH /api/interviews/:id/status` | `round2Status` |
| Save question/scoring config | `PATCH /api/head-dashboard/config` | `interviewQuestions`, `isScoringEnabled` |

The old mock repository and mock candidate data were removed. Candidate names,
answers, schedules, notes, scores, and decisions displayed by these routes now
come from the backend response.

## Cockpit layout and permissions

- The cockpit reuses `DashboardAppShell` through `HeadDashboardShell`; it does
  not maintain a second navbar implementation.
- Desktop starts at a 40/60 Profile/Evaluation split. Drag the separator to
  resize between 30/70 and 70/30, use the arrow keys in 5% steps, or
  double-click the separator to reset to 40/60.
- Mobile keeps the Figma Profile/Evaluation tab flow.
- Three independent note fields and all four Final Decision controls remain
  docked at the bottom of the Evaluation panel while questions scroll.
- Both Head and Member can save answers and notes through the backend. Final
  Pass/Fail is enabled only for an authenticated Department Head.
- Pass/Fail makes the cockpit read-only in the UI.
- Standard responses and the three independent notes auto-save after typing
  stops. Custom Q&A uses an explicit create action because the supplied backend
  exposes POST creation but no update route.
- Optional scoring is read from each cockpit response and adds exactly one
  Overall Score field.

## Supplied backend limitations kept intact

The frontend does not work around these limitations by modifying or faking
backend data:

1. The Figma Final flow contains `No Show`, but Team02 accepts only `Pending`,
   `Pass`, and `Fail`. `No Show` stays visible and disabled with an explanation;
   it is never mapped silently to another result.
2. Saved ad-hoc questions cannot be edited because Team02 exposes POST only.
   The composer submits a complete question and response, then renders the
   server-returned item read-only.
3. `/api/head-dashboard/config` exposes PATCH but no GET. The settings editor
   initializes from a real candidate cockpit snapshot when available and keeps
   the last successful save as a browser cache. Cockpit scoring itself always
   comes from `GET /api/interviews/:id`.
4. The cockpit detail response does not include date of birth or Round 1 choice
   fields, so the UI does not invent them. Schedule/cohort data is matched from
   `GET /api/interviews` by candidate ID.

## Review notes

1. `Pending`, `Pass`, `Fail`, and `No Show` remain represented visually.
2. Supported evaluation fields auto-save after typing stops.
3. The No Show design state is retained without sending an invalid API value.
4. Four decision controls stay together in a fixed responsive grid.
5. The dashboard changes to `ROUND 2 COMPLETED` when no candidate remains
   Pending.
6. Dashboard rows include quick decisions and `Access Cockpit`.

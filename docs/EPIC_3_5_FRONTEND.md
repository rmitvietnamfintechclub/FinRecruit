# Epic 3 & 5 Backend Integration Handoff

This implementation follows the Figma `Final` flow first and fills uncovered
states from Stories 3.1, 3.3, 3.4, 3.5, and 5.1. The Epic 3–5 frontend now uses
the Team02 API routes directly. Small backend contract additions are limited to
the fields required by these screens; unrelated backend flows are unchanged.

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

| Frontend action                | Team02 route                                | Payload used                                   |
| ------------------------------ | ------------------------------------------- | ---------------------------------------------- |
| Load Round 2 dashboard         | `GET /api/interviews`                       | `page`, `limit`                                |
| Load cockpit                   | `GET /api/interviews/:id`                   | none                                           |
| Save template responses        | `PATCH /api/interviews/:id/notes`           | `templateAnswers`                              |
| Save collaborative notes       | `PATCH /api/interviews/:id/notes`           | one of `note1`, `note2`, `note3`               |
| Save Overall Score             | `PATCH /api/interviews/:id/notes`           | integer `score` from 0 to 100, or `null`       |
| Create candidate-only question | `POST /api/interviews/:id/ad-hoc-questions` | `question`                                     |
| Save candidate-only response   | `PATCH /api/interviews/:id/notes`           | `adHocQuestions`                               |
| Save or change final decision  | `PATCH /api/interviews/:id/status`          | `Pass`, or `Fail`; UI `No Show` maps to `Fail` |
| Load question/scoring config   | `GET /api/head-dashboard/config`            | none                                           |
| Save question/scoring config   | `PATCH /api/head-dashboard/config`          | `interviewQuestions`, `isScoringEnabled`       |

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
- Three independent note fields and all three Final Decision controls remain
  docked at the bottom of the Evaluation panel while questions scroll.
- Both Head and Member can save answers and notes through the backend. Final
  decisions are enabled only for an authenticated Department Head.
- After a decision, answers and notes become read-only. A Department Head can
  still change the decision, with confirmation on every change. The No Show
  action is explicitly recorded as backend status `Fail`, while the selected
  Quick/Final Decision control remains highlighted as `No Show`.
- Standard responses and the three independent notes auto-save after typing
  stops. A custom question is created first without an answer; its response then
  uses the same auto-save behavior as a template question.
- Optional scoring is read from each cockpit response and adds exactly one
  Overall Score field. It accepts integers from 0 through 100 only.

## Minimal backend additions

Only the following additions were made for the requested Epic 3–5 flow:

1. `GET /api/head-dashboard/config` reads the authenticated Head's active
   department/cohort config so Save & Apply survives reloads.
2. Candidate detail reconciles saved responses against the current template,
   preserving unchanged answers and omitting deleted questions.
3. The notes endpoint accepts `adHocQuestions` so a custom response can
   auto-save and be read by other authorized interviewers.
4. The notes endpoint validates Overall Score as `null` or an integer 0–100.

Round 2 keeps the original backend status contract: `Pending`, `Pass`, and
`Fail`. `No Show` is a frontend decision shortcut that submits `Fail`; no new
MongoDB status or schema field is introduced. If an earlier test build already
stored the legacy value `No Show`, the frontend normalizes it to `Fail` when
reading and the next decision save writes the valid `Fail` value.

Because the backend does not store a separate decision reason, the frontend
keeps the last selected control (`Fail` versus `No Show`) in browser storage,
keyed by candidate ID. This preserves the correct highlight after reload in the
same browser while the Status badge remains `Fail`. A different browser or
account only receives `round2Status: "Fail"` and therefore falls back to the
`Fail` control. Persisting the distinction for every user would require a new
backend field/API contract and is intentionally outside this minimal patch.

The cockpit detail response still does not include date of birth or Round 1
choice fields, so the UI does not invent them. Schedule/cohort data is matched
from `GET /api/interviews` by candidate ID.

## Review notes

1. `Pending` appears as a status. Quick/Final Decision contains only `Pass`,
   `Fail`, and `No Show`; the No Show confirmation states that it becomes
   `Fail`.
2. Supported evaluation fields auto-save after typing stops.
3. Saved decisions remain highlighted and can be changed after confirmation.
   Choosing `No Show` highlights `No Show`, while the separate Status badge
   correctly displays `Fail`.
4. Three decision controls stay together in a fixed responsive grid.
5. The dashboard changes to `ROUND 2 COMPLETED` when no candidate remains
   Pending.
6. Dashboard rows include quick decisions, `Access Cockpit`, and an Overall
   Score column only when scoring is enabled.

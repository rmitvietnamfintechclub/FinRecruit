# Epic 3 & 5 Frontend Handoff

This implementation is frontend-only and follows the Figma `Final` section first. Missing responsive, terminal-decision, collaboration, and scoring states are completed from the Story 3.1, 3.3, 3.4, 3.5, and 5.1 frames.

## Routes

- `/HeadDashboard/interviews`: Round 2 candidate dashboard and quick decisions.
- `/InterviewCockpit/[candidateId]`: responsive interview cockpit inside the
  shared dashboard shell and navigation.
- `/HeadDashboard/interview-settings`: question template and optional scoring configuration.

## Integration boundary

UI components depend on `InterviewCockpitRepository` in `src/lib/interview-cockpit/types.ts`.

- `MockInterviewCockpitRepository` is active now and persists demo state to `localStorage`.
- `HttpInterviewCockpitRepository` contains the typed `fetch` integration skeleton. It follows the existing project convention by using TypeScript, standard `fetch`, and `credentials: 'include'`.
- When Epic 3/5 backend routes are ready, switch the exported repository instance in `src/lib/interview-cockpit/repository.ts` after aligning the response envelope.

The mock repository currently persists standard answers, candidate-specific
custom Q&A blocks, General Notes, Overall Score, and the final Round 2 status.
This is browser-local demo persistence only; it is intentionally isolated
behind the repository interface for the later backend integration.

## Cockpit layout and permissions

- The cockpit reuses `DashboardAppShell` through `HeadDashboardShell`; it does
  not maintain a second navbar implementation.
- Desktop starts at a 40/60 Profile/Evaluation split. Drag the separator to
  resize between 30/70 and 70/30, use the arrow keys in 5% steps, or
  double-click the separator to reset to 40/60.
- Mobile keeps the Figma Profile/Evaluation tab flow.
- General Notes and the four Final Decision controls remain docked at the
  bottom of the Evaluation panel while the question area scrolls independently.
- Final-decision access comes from the authenticated NextAuth session. The
  client no longer has a role-preview selector: Department Heads can decide;
  Members receive a read-only decision bar.
- Adding a custom question immediately creates a visible candidate-only Q&A
  block. Its question and answer auto-save after typing stops and reappear
  after refresh through the mock repository.

## Six review notes covered

1. `Pending`, `Pass`, `Fail`, and `No Show` are represented as four Round 2 statuses.
2. Evaluation fields auto-save after typing stops.
3. `No Show` replaces the normal saved badge with a warning-style status badge.
4. Four decision controls stay together in a fixed four-column bar; they do not become a horizontal scroller.
5. The dashboard changes to `ROUND 2 COMPLETED` and the probation-ready subtext when no candidates remain Pending.
6. Dashboard rows include quick decision controls as well as `Access Cockpit`.

`Pass`, `Fail`, and `No Show` are terminal in the mock flow. Members can view and edit evaluation content but cannot submit a terminal decision. Optional scoring adds one `Overall Score` only; it does not invent per-question scores or a numeric range.

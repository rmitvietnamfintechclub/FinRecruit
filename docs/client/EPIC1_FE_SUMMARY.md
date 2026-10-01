# Epic 1 — Frontend Summary (for backend)

Frontend is done and Phase-2 state runs on a mock store. Switch to real: set `NEXT_PUBLIC_USE_MOCK_DATA=false`.
Phase-2 fetch calls are in `src/lib/round-transition/http-api.ts` and `src/lib/member-directory/http-api.ts`; interfaces are the matching `api.ts`. Types: `src/types/roundTransition.ts`, `src/types/memberDirectory.ts`.
Phase-1 calls (candidate list, stats, status PATCH, EB dashboard, `/api/users`) are **unchanged** — do not alter them.
Not built (out of scope): the Member Round 2 interview cockpit (scoring, questions, slots). `/MemberDashboard` is a placeholder only.

## Test it (mock mode)
`npm run dev`. Story 1.1 + 1.3 need a **Department Head** login; 1.2 needs an **Executive Board** login; the Member screen needs DB `role: 'Member'`.
Lock state and the member directory are per-browser. Reset mock data (console): `localStorage.clear()` then reload. Keys: `finrecruit.mock.v1` (lock), `finrecruit.mock.v1.members` (directory).

| # | Screen | Path / action |
|---|---|---|
| 1 | Head — Round 1 + lock bar | `/HeadDashboard` (Department Head) |
| 2 | Lock confirm modal | Screen 1 → **Confirm & Lock Round 1** (disabled while any candidate is `Pending`) |
| 3 | Round 2 mode (read-only pool) | Screen 1 after locking → **Round 2** tab (Pass list) |
| 4 | EB — transition status strip | `/MasterViewDashboard` (Executive Board) |
| 5 | Head — user management / Waiting room | `/HeadDashboard/user-management` (Department Head) |
| 6 | Grant Member confirm modal | Screen 5 → **Grant Member Role** |
| 7 | Member — Round 2 dashboard placeholder | `/MemberDashboard` (Member) |

Note: `NEXT_PUBLIC_USE_MOCK_DATA` is unset in `.env`, so mock is **on** for Phase 2. Setting it to `false` today would make the Phase-2 reads fall back to the mock (hook gap below) — wire the hooks first.

## Endpoints to implement
Head routes: `withRBAC`/`withActiveRBAC('Department Head')`, derive the department from the session (never trust the client), `logSystemEvent`. EB routes: `'Executive Board'`.

| Method + path | Request | Response |
|---|---|---|
| GET `/api/head-dashboard/round-states` | – | `{ success, departmentStates: DepartmentState[] }` (`DepartmentState = { department, isRound1Locked, isRound2Locked }`); access Head + EB |
| POST `/api/head-dashboard/lock-round-1` | `{ department }` (server derives it from the session) | `{ success: true, message, locked, department, activeCohort }`; pending candidates → **400** `{ success: false, message, pendingCount }` |
| GET `/api/head-dashboard/members` | – | `{ success, department, waitingGuests: DirectoryAccount[], members: DirectoryAccount[] }`, scoped to the Head's department |
| POST `/api/head-dashboard/members` | `{ userId }` (department comes from the session) | `{ success: true, message, user: DirectoryAccount, department }` |
| (EB read) `GET /api/executive/round1-lock` | – | `{ success, departments: [{ department, isRound1Locked }] }` |

Do **not** extend `PATCH /api/users` for this — it is the Phase-1 EB user-management contract. Use the dedicated `/api/head-dashboard/members` endpoints above.

`DirectoryAccount = { id, name, email, avatar, role, department, isActive }`.

Note: the frontend read hooks (`useDepartmentStates`, `useMemberDirectory`) now fetch these endpoints when `NEXT_PUBLIC_USE_MOCK_DATA=false` (see gotchas); the writes (`lockRound1`, `grantMember`) already go through the HTTP stubs.

## Logic rules
- **Lock is server-authoritative**: recompute the pending count; reject if `> 0` (the UI disables the button, but never trust it).
- On lock, set `isRound1Locked` for that department in `SystemConfig.departmentStates` (field already exists) and write an audit log. The Round 2 pool is the `Pass` list from the existing `GET /api/head-dashboard/candidates?status=Pass`, so no new pool endpoint is required unless you choose to materialise an Interviewees collection — the FE only needs `?status=Pass` to keep working.
- **Round 2 pool = `status: 'Pass'`** candidates in the Head's department and active cohort. Keep the existing filtering semantics (`generation`/`semester` from `SystemConfig`, department match).
- **Grant Member**: only an active Department Head; target must be an active Guest in the waiting room; set `role: 'Member'` and `department` to the Head's department; audit log (category `role`).
- **Member role re-issue on login**: `JWT` role is stamped at sign-in (see Frontend gotchas), so a user just promoted to `Member` cannot reach `/MemberDashboard` until re-login.
- Departments use full names: `'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department'`; waiting guests use `department: 'Unassigned'`.

## Model gaps
- `SystemConfig.departmentStates: { department, isRound1Locked, isRound2Locked }[]` exists. `getOrCreateGlobalConfig()` now **backfills** any missing department (all four) for configs created before the feature, so the lock routes can rely on it.
- `RoleType` already includes `'Member'`; `User.role` enum and `User` model already accept it.
- `Candidate.round2Status` / `round2Evaluation` / `interviewSlotId` already exist (for the future cockpit).
- `getUserManagementPayloadFromDb` (Phase-1 EB user list) filters only `Department Head`/`Executive Board`, and `displayRoleLabel` maps any other role to `Guest`. If the EB UI should show Members, that logic needs extending — the FE intentionally left it untouched.
- Role changes are not reflected in middleware until re-login (JWT strategy). Consider rotating/invalidating the session (or forcing re-auth) when granting `Member` so access works immediately.

## Frontend gotchas
- **Read hooks now sync from the API in real mode.** `useDepartmentStates()` (`src/hooks/use-round-transition.ts`) and `useMemberDirectory()` (`src/hooks/use-member-directory.ts`) subscribe to a local store, but when `NEXT_PUBLIC_USE_MOCK_DATA=false` they fetch `GET /api/head-dashboard/round-states` / `GET /api/head-dashboard/members` on mount and write the result into that store. The `lockRound1` / `grantMember` actions also update it locally, so the UI reflects changes without a refetch. On fetch failure they keep the last local snapshot (the mock seed), so a 403/500 shows stale data rather than an error.
- **Round 2 pool uses the existing endpoint**: `GET /api/head-dashboard/candidates?status=Pass&limit=100&page=1`. It is capped at 100 and not paginated; flag if the pool can exceed that.
- **Hydration fix**: `src/app/(frontend)/layout.tsx` is now a passthrough (`Providers` only); the root `src/app/layout.tsx` owns `<html>/<body>` + the Manrope font. Keep it that way — nested `<html>/<body>` caused a hydration mismatch.
- The `/MemberDashboard` route is a placeholder; do not expect interview data there yet.
- Mock persistence is `localStorage`; cross-tab/other-user state is not shared — expected for the demo, not for production.

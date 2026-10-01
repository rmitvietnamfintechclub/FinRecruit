# Epic 2 — Frontend Summary (for backend)

Frontend is done and runs on a mock store. Switch to real: set `NEXT_PUBLIC_USE_MOCK_DATA=false`.
All fetch calls are in `src/lib/interview-scheduling/http-api.ts`; the interface is `api.ts`. Types: `src/types/interviewScheduling.ts`.
Not built (out of scope): frame 19 (Dept Head's own Interview Schedule tab). 18 frames / 11 screens exist.

## Test it (mock mode)
`npm run dev`. Frames 1–7 need an **Executive Board** login; 8–18 need no login.
Reset mock data (console): `localStorage.clear()` then reload.

| # | Frame | Path / action |
|---|---|---|
| 1 | Schedule config | `/MasterViewDashboard/interview-scheduling` |
| 2 | Publish success modal | Frame 1 → Add Slots → **Save & Publish** |
| 3 | Interviewer availability | `/MasterViewDashboard/interview-scheduling/interviewer-availability` |
| 4 | Availability share modal | Frame 3 → **Share Link** |
| 5 | Bookings – All Departments | `/MasterViewDashboard/interview-scheduling/candidate-bookings` |
| 6 | Bookings share modal | Frame 5 → **Share Link** |
| 7 | Bookings – one department | Frame 5 → click a department pill |
| 8 | Interviewer form – EB | `/interview-availability` → role **Executive Board** |
| 9 | Interviewer success – EB | Frame 8 → fill name/email, pick slots, Submit |
| 10 | Interviewer form – Head | `/interview-availability` → role **Department Head** |
| 11 | Interviewer success – Head | Frame 10 → Submit |
| 12 | Interviewer form – Member | `/interview-availability` → role **Member** |
| 13 | Interviewer success – Member | Frame 12 → Submit |
| 14 | Interviewee form | `/interview-booking` |
| 15 | Confirm modal | Frame 14 → name + email, pick slot, **Confirm Booking** |
| 16 | Booking success | Frame 15 → **Confirm & Lock** |
| 17 | Slot Unavailable | Two tabs on frame 14; book slot X in tab A, then book X in stale tab B |
| 18 | Already booked | Frame 14 → email `s9999999@rmit.edu.vn` (tab out of field) |
| 19 | — | Not built |

## Endpoints to implement
Executive routes: `withRBAC` Executive Board + `logSystemEvent` (category `interview-scheduling` already exists). Public routes: **no auth** (`middleware.ts` already passes `/api/*`).

| Method + path | Request | Response |
|---|---|---|
| GET `/api/executive/interview-slots` | – | `{ slots: InterviewSlot[] }` |
| POST `/api/executive/interview-slots` | `{ slots: NewInterviewSlot[] }` | `{ slots }` (created; server sets generation/semester from active SystemConfig, ignore client values) |
| PATCH `/api/executive/interview-slots/:id` | `{ date?, startTime?, endTime?, room? }` | `{ slots }`; **409** `{ message }` if BOOKED, 404 if missing |
| DELETE `/api/executive/interview-slots/:id` | – | `{ slots }`; **409** `{ message }` if BOOKED; also delete its availability |
| GET `/api/executive/interview-links` | – | `{ internalUrl, publicUrl }` (→ `/interview-availability`, `/interview-booking`; tokenise if wanted) |
| GET `/api/executive/interview-availability` | – | `{ slots, availability }` |
| GET `/api/executive/interview-bookings?department=all\|<Dept>` | – | `{ slots, availability }` |
| GET `/api/public/interview-availability` | – | `{ slots }` |
| POST `/api/public/interview-availability` | `SubmitAvailabilityInput` | `{ success: true }` |
| GET `/api/public/interview-booking?department=<Dept>` | – | `{ slots: (InterviewSlot & { bookable })[] }` |
| GET `/api/public/interview-booking?email=<e>` | – | `{ booking: InterviewSlot \| null }` |
| POST `/api/public/interview-booking` | `{ name, email, studentId?, department, slotId }` | 200 `{ booking }`; **409** `{ reason: 'SLOT_NO_LONGER_AVAILABLE' \| 'ALREADY_BOOKED', existingBooking? }`; 404 `{ reason: 'SLOT_NOT_FOUND' }` |

## Logic rules
- **Booking is atomic**: `findOneAndUpdate({_id, status:'AVAILABLE'}, {status:'BOOKED', bookedByCandidateId})`; no match → `SLOT_NO_LONGER_AVAILABLE`. Check `ALREADY_BOOKED` (candidate already has a BOOKED slot) first.
- **Slot is global**: one booking blocks it for every department.
- `bookable` = `status==='AVAILABLE'` AND ≥1 availability record with same slot + department + `isHead:true`.
- **Submit availability = replace**: delete all records from this email, insert new. Payload `selections: [{department, slotIds}]` — Head/Member send one department; Executive Board sends all four (store `isHead:false`).
- Departments use full names: `'Technology Department' | 'Business Department' | 'HR Department' | 'Marketing Department'`.
- Dates as `'YYYY-MM-DD'`, times `'HH:mm'` in JSON.
- Booking success should send the `.ics` email (the UI already says it was sent).

## Model gaps
- `InterviewerAvailability`: add `interviewerEmail`, `interviewerRole` (`Executive Board | Department Head | Member`). Keep the `(slotId, department, interviewerName)` unique index in mind: same name, different email would collide.
- Slot responses must include joined candidate fields: `bookedCandidateName`, `bookedCandidateStudentId`, `bookedCandidateEmail`, `bookedDepartment` (from Candidate).
- Candidate lookup: the form has only name + email. Resolve the `Candidate` by email (derive student ID from it). Decide: reject non-Round-1-passers? (FE has no such state yet.)
- Booking status (Completed / No Show) has no field; UI shows Scheduled/Available only.

## Frontend gotchas
- `useInterviewSlots()` / `useAvailabilityRecords()` in `src/hooks/use-interview-scheduling.ts` read the mock store directly. **In real mode the EB screens (1, 3, 5–7) won't show server data until those two hooks are switched to `getInterviewSchedulingApi()` fetches** (marked `TODO(backend)`).
- Generation/semester in `InterviewSchedulingClient.tsx` is a seed constant; server should override.

## Colors (frontend only, no backend impact)
Single sources: `src/lib/interview-scheduling/departments.ts` (`DEPARTMENT_META`: `strong`, `light`) and `departmentColors.ts` (`DEPARTMENT_COLORS`: `dark`, `medium`, `light`). Don't hardcode department colors elsewhere.

| Dept | Primary (`strong`) | dark | medium | light |
|---|---|---|---|---|
| Technology | `#0070C0` | `#1F6FC0` | `#4F81BD` | `#BDD7EE` |
| Business | `#B70002` | `#C0202A` | `#C0504D` | `#E6B8B7` |
| Marketing | `#351C75` | `#3B2C63` | `#7C67A8` | `#CCC1DA` |
| HR | `#38761D` | `#4B7A3C` | `#6AA84F` | `#D9EAD3` |

- **Department pills** (Interviewer Availability, Candidate Bookings, booking form's department picker): active = primary, white text. "All Departments" pill stays gold `#E6B656` / navy `#010A63`.
- **Interviewer Availability table**: date band = dark, header row = medium, data rows = light, name chips = light bg + dark text/border. LUNCH BREAK stays indigo `#363E8E`.
- **Candidate Bookings, one department**: same dark/medium/light reskin. **All Departments view stays gold** (`#9A6F19` date band, `#E6B656` header, `#BB8822` lunch, `#EAD6AF` rows). Status badges keep status colors (Scheduled `#FEF9C2`, Available `#DBF5FF`), not department colors.
- **Slot picker (public forms)**: band toggle header = primary; content area = `light` tint; all text black. Chips keep spec colors: idle white, selected `#DCFCE7`/`#16A34A`, disabled `rgba(0,34,0,.13)`.

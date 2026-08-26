# Fin-Recruit Backend API Endpoints
This document defines the complete server contract for the Fin-Recruit internal recruitment platform, encompassing Phase 1 legacy support and Phase 2 epics (Epics 1 through 5). The design is optimized to support Role-Based Access Control (RBAC), multi-stage evaluations, interview scheduling, and collaborative features in the Digital Cockpit.

> **CRITICAL WARNING FOR PHASE II**
>> This document contains the complete API contract for Phase 2. To ensure smooth integration and prevent blocking dependencies, please adhere strictly to the following division of responsibilities:
>> - **Group 1**: You are responsible for implementing all APIs and backend logic for **Epic 1 (Phase 1 Closure & RBAC Expansion)** and **Epic 2 (Two-Step Interview Scheduling)**.
>> - **Group 2**: You are responsible for implementing all APIs and backend logic for Epic **3 (Digital Interview Cockpit)**, **Epic 4 (Final Closure)**, and **Epic 5 (Advanced Evaluation Tools)**. 

>> Both groups must immediately align their API contracts, backend route handlers, and database models. Ensure all middleware permissions, request payloads, and response shapes exactly match the specifications below before merging code.

**Base API URL**: `/api`

## 0. Global API Conventions
**Response Shape** - Endpoints typically return a JSON structure indicating success or failure. Export endpoints return binary streams.  

**Success**
```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

**Failure**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "requiresConfirmation": false 
}
```

### Authentication & Authorization
- Authentication relies on a Cookie-based Session (`__Host-finrecruit_session` in production, `finrecruit_session` in development).  
- Endpoints are strictly protected by RBAC middleware (`withRBAC`, `withActiveRBAC`).

### Pagination
*List endpoints use*:  
- `page` (default 1)  
- `limit` or `pageSize` (default `20`) 

## 1. Department Head APIs
**Base Path**: `/api/head-dashboard`

These APIs manage candidate lists, department configurations, and evaluations.

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `GET` | `/head-dashboard/candidates` | HEAD | Retrieves paginated candidates assigned to the Head's department. Includes aggregated scores for ranking. | 1 & 2 (Story 5.2) | DONE |
| `GET` | `/head-dashboard/candidates/:id` | HEAD | Retrieves full details and form answers for a specific candidate. | 1 | DONE |
| `PATCH` | `/head-dashboard/candidates/:id/status` | HEAD | Updates candidate evaluation status (includes complex Choice 2 reroute logic). | 1 | DONE |
| `POST` | `/head-dashboard/lock-round-1` | HEAD | Locks department Round 1 results, moving passed candidates into the Round 2 interview pool. | 2 (Story 1.1) | TODO |
| `PATCH` | `/head-dashboard/config` | HEAD | Configures dynamic interview questions and toggles numeric scoring. | 2 (Story 3.2, 5.1) | TODO |
| `POST` | `/head-dashboard/close-round-2` | HEAD | Locks the department's final Round 2 results so the dashboard becomes read-only. | 2 (Story 4.1) | TODO |

### `GET` `/head-dashboard/candidates` query params

| Query | Type | Description |
|------|-------|-------------|
| `search` | string | Search by name or student ID (email prefix) |
| `status` | string | Filter by status (`Pending`, `Pass`, `Fail`, `All`) |
| `page` | number | Page number |
| `limit` | number | Page size |
| `sortByScore` | boolean | Ranks candidates dynamically based on total interview score |

## 2. Two-Step Interview Scheduling APIs
**Base Path**: `/api/scheduling`

These APIs handle Executive Board slot generation, interviewer availability declarations, and candidate secure booking.

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `POST` | `/scheduling/master-slots` | EXEC | EB defines a time range and room to auto-chunk and generate consecutive 40-minute master slots. | 2 (Story 2.1) | TODO |
| `DELETE` | `/scheduling/master-slots/:slotId` | EXEC | EB manually deletes or modifies a specific generated slot (e.g., removing a lunch break). | 2 (Story 2.1) | TODO |
| `POST` | `/scheduling/availability` | PUBLIC | Interviewer (Head or Member) declares available time slots from a public link. | 2 (Story 2.2) | TODO |
| `GET` | `/scheduling/slots` | PUBLIC | Interviewees fetch available slots filtered by their assigned department and interviewer availability. | 2 (Story 2.3) | TODO |
| `POST` | `/scheduling/book` | PUBLIC | Interviewee securely books a validated slot using Mongoose atomic updates to prevent race conditions. | 2 (Story 2.3, 2.4) | TODO |

## 3. Digital Cockpit APIs (Round 2)
**Base Path**: `/api/interviews`

These APIs power the dedicated full-screen interview cockpit for Phase 2, supporting collaborative evaluation.  

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `GET` | `/interviews/:id` | HEAD/MEMBER | Fetches candidate CV, R1 application, and R2 evaluation state for the split-view layout. | 2 (Story 3.1) | TODO |
| `PATCH` | `/interviews/:id/notes` | HEAD/MEMBER | Debounced collaborative note-taking (targets specific fields like `notes.note1` to prevent overwriting). | 2 (Story 3.4) | TODO |
| `POST` | `/interviews/:id/ad-hoc-questions` | HEAD/MEMBER | Injects custom, unexpected questions directly into a specific candidate's evaluation. | 2 (Story 3.3) | TODO |
| `PATCH` | `/interviews/:id/status` | HEAD | Submits a final Pass or Fail decision (terminal, no reroutes). | 2 (Story 3.5) | TODO |

### `PATCH` `/interviews/:id/notes` Payload Example
To prevent data loss when evaluating concurrently, updates must target specific note fields using MongoDB $set logic:

```json
{
    "$set": {
        "notes.note1": "Candidate showed excellent communication skills..."
    }
}
```

## 4. Executive Board APIs
**Base Path**: `/api/executive`

Provides master views, aggregate statistics, and system exports.  

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `GET` | `/executive/dashboard` | EXEC | Overview data including active cohorts, department heads, and guest counts. | 1 & 2 (Story 1.2) | TODO |
| `GET` | `/executive/statistics` | EXEC | Global and per-department candidate evaluation statistics. | 1 | DONE |
| `GET` | `/executive/candidates` | EXEC | Read-only master view of all candidates across departments. | 1 | DONE |
| `GET` | `/executive/export/round-1` | EXEC | Downloads an Excel (.xlsx) file containing R1 Pass/Fail lists. | 1 | DONE |
| `GET` | `/executive/export/round-2` | EXEC | Downloads an Excel (.xlsx) file containing finalized R2 Pass/Fail lists. | 2 (Story 4.2) | TODO |

## 5. System Config & Logs APIs
**Base Path**: `/api/executive`

Handles global recruitment cycles, generation intake, and audit logging.

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `GET` | `/executive/system-config` | EXEC | Lists all generations, semesters, and active configurations. | 1 | DONE |
| `POST` | `/executive/system-config` | EXEC | Creates a new Generation or Activates an existing Generation/Semester pair. | 1 | DONE |
| `PATCH` | `/executive/system-config` | EXEC | Toggles the global form intake status (Open/Close). | 1 | DONE |
| `POST` | `/executive/system-config/generations/:id/semesters` | EXEC | Adds a new semester to an existing generation. | 1 | DONE |
| `GET` | `/executive/system-logs` | EXEC | Retrieves paginated audit logs for system events. | 1 | DONE |

## 6. User Management APIs
**Base Path**: `/api/users`

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `GET` | `/users` | EXEC | Retrieves full payload (waiting guests, inactive accounts, active users). | 1 | DONE |
| `PATCH` | `/users` | EXEC/HEAD | Promotes/demotes roles and assigns departments. Department Heads are authorized to promote Waiting Room accounts to the `Member` role for cockpit access. | 1 & 2 (Story 1.3) | TODO |

## 7. Webhook APIs
**Base Path**: `/api/webhooks`

| Method | Endpoint | Access | Description | Phase / Story | Process |
|--------|---------|---------|------------|-------------|----------|
| `POST` | `/webhooks/power-automate` | PUBLIC | Ingests MS Forms JSON payloads, maps to active cohort, and creates Candidates. | 1 | DONE |
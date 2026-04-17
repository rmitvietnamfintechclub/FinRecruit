# Department Head Dashboard API

Backend scope for Smart Dashboard access used by Department Heads only.

## Access Model

- Every endpoint below requires an authenticated user with role `Department Head`.
- The backend uses the logged-in head's assigned department from the session.
- A Department Head can only read or update candidates whose current `department` exactly matches their own department.
- Submitted candidate data remains read-only. The only writable field through this API is the evaluation result flow: `Pass`, `Fail`, `Pending`.
- Candidates with status `Incomplete` are reserved for the Executive Board exception queue and are excluded from all Department Head dashboard endpoints.

Canonical department values in the backend:

- `Technology`
- `Marketing`
- `Business`
- `Human Resources`

## 1. List Dashboard Candidates

`GET /api/head-dashboard/candidates`

### Query Parameters

- `search`: optional string, matched against `fullName`
- `status`: optional `Pending | Pass | Fail | All`
- `page`: optional positive integer, default `1`
- `limit`: optional positive integer, default `20`, max `100`

### Success Response

```json
{
  "success": true,
  "message": "Candidates fetched successfully.",
  "candidates": [
    {
      "id": "candidate_id",
      "fullName": "Alex Tran",
      "email": "alex@example.com",
      "phone": "0400000000",
      "department": "Technology",
      "choice1": "Technology",
      "choice2": "Marketing",
      "status": "Pending",
      "generation": "2026",
      "semester": "A",
      "appliedAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z",
      "routing": {
        "currentStage": "choice1",
        "isChoice2Valid": true,
        "canRerouteOnFail": true,
        "rerouteTargetDepartment": "Marketing"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "filters": {
      "search": "",
      "status": null,
      "department": "Technology"
    },
    "allowedStatusOptions": ["Pending", "Pass", "Fail"],
    "emptyState": null
  }
}
```

### Notes

- The list is ordered with `Pending` first, then `Pass`, then `Fail`, and newest updates first inside each group.
- `emptyState` is populated when the department has no candidates yet, or when search/filter returns zero results.

## 2. View Candidate Details

`GET /api/head-dashboard/candidates/:candidateId`

### Success Response

```json
{
  "success": true,
  "message": "Candidate details fetched successfully.",
  "candidate": {
    "id": "candidate_id",
    "fullName": "Alex Tran",
    "email": "alex@example.com",
    "phone": "0400000000",
    "cvLink": "https://...",
    "department": "Technology",
    "choice1": "Technology",
    "choice2": "Marketing",
    "status": "Pending",
    "generation": "2026",
    "semester": "A",
    "appliedAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-04-15T10:00:00.000Z",
    "customAnswers": [
      { "question": "Why do you want to join?", "answer": "..." }
    ],
    "routing": {
      "currentStage": "choice1",
      "isChoice2Valid": true,
      "canRerouteOnFail": true,
      "rerouteTargetDepartment": "Marketing"
    }
  },
  "meta": {
    "allowedStatusOptions": ["Pending", "Pass", "Fail"],
    "permissions": {
      "canUpdateStatus": true,
      "canEditSubmittedData": false,
      "canDeleteCandidate": false
    }
  }
}
```

## 3. Update Candidate Status

`PATCH /api/head-dashboard/candidates/:candidateId/status`

### Request Body

```json
{
  "status": "Pass",
  "confirmReroute": false
}
```

### Supported Status Values

- `Pending`
- `Pass`
- `Fail`

### Standard Success Response

Returned when the backend directly saves the new status.

```json
{
  "success": true,
  "code": "STATUS_UPDATED",
  "message": "Status updated successfully.",
  "candidate": {
    "id": "candidate_id",
    "status": "Pass",
    "department": "Technology"
  }
}
```

## Fail and Re-routing Flow

When a Department Head chooses `Fail`, the backend applies UC-3 rules.

### Case A: Candidate is in Choice 1 and has a valid Choice 2

First request:

```json
{
  "status": "Fail"
}
```

Response:

```json
{
  "success": false,
  "code": "REROUTE_CONFIRMATION_REQUIRED",
  "message": "Confirmation required to route candidate to Marketing.",
  "requiresConfirmation": true,
  "reroutePreview": {
    "targetDepartment": "Marketing",
    "resultingStatus": "Pending"
  }
}
```

Frontend action:

- show confirmation prompt
- if confirmed, send the same request again with `confirmReroute: true`

Confirmed request:

```json
{
  "status": "Fail",
  "confirmReroute": true
}
```

Confirmed response:

```json
{
  "success": true,
  "code": "CANDIDATE_REROUTED",
  "message": "Candidate successfully routed to Marketing.",
  "candidate": {
    "id": "candidate_id",
    "status": "Pending",
    "department": "Marketing"
  }
}
```

### Case B: No valid Choice 2

- backend saves final `Fail`
- response code: `FINAL_FAIL_NO_REROUTE`

### Case C: Candidate is already in Choice 2

- backend saves final `Fail`
- response code: `FINAL_FAIL_SECOND_REVIEW`

## Error Responses

### `400 Bad Request`

- invalid `candidateId`
- invalid JSON body
- invalid status filter or status update value

### `401 Unauthorized`

- no active authenticated session

### `403 Forbidden`

- user is not a `Department Head`
- user session has no valid head department assignment

### `404 Not Found`

- candidate does not belong to the current Department Head's department

### `409 Conflict`

- reroute confirmation is required before failing a first-choice candidate with a valid second choice
- candidate state changed during update and the frontend should refresh

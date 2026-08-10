# 🚀 Fin-Recruit API Reference (Phase 1)

## 📌 General Information
*   **Base URL:** `/api`
*   **Content-Type:** `application/json` (except for Export APIs)
*   **Authentication:** Cookie-based Session (`__Host-finrecruit_session` in production, `finrecruit_session` in development). 
*   **Authorization:** Endpoints are protected by Role-Based Access Control (RBAC) middleware (`withRBAC`, `withActiveRBAC`). 

---

## 📂 1. Department Head APIs (`/head-dashboard`)
*Requires Role: `Department Head`*

### `GET` /head-dashboard/candidates
Retrieves a paginated list of candidates assigned to the current Department Head's department (or Unassigned with Choice 1 matching the department) within the active cohort.

*   **Query Parameters:**
    *   `search` (string, optional): Search by name or student ID (email prefix).
    *   `status` (string, optional): Filter by status (`Pending` | `Pass` | `Fail` | `All`).
    *   `page` (number, optional): Default `1`.
    *   `limit` (number, optional): Default `20`, max `100`.
*   **Responses:**
    *   **200 OK:**
        ```json
        {
          "success": true,
          "message": "Candidates fetched successfully.",
          "candidates": [
            {
              "id": "64f0a...",
              "fullName": "Nguyen Van A",
              "email": "s1234567@rmit.edu.vn",
              "department": "Technology Department",
              "status": "Pending",
              "routing": {
                "currentStage": "choice1",
                "isChoice2Valid": true,
                "canRerouteOnFail": true,
                "rerouteTargetDepartment": "Business Department"
              }
            }
          ],
          "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
        }
        ```

### `GET` /head-dashboard/candidates/:candidateId
Retrieves full details of a specific candidate, including their application answers.

*   **Path Parameters:**
    *   `candidateId` (string, required): MongoDB ObjectId of the candidate.
*   **Responses:**
    *   **200 OK:** Returns full candidate details (`cvLink`, `generalAnswers`, `customAnswers`, etc.).
    *   **404 Not Found:** Candidate not found or not in Head's department.

### `PATCH` /head-dashboard/candidates/:candidateId/status
Updates the evaluation status of a candidate. Contains complex business logic for 2nd-choice rerouting.

*   **Path Parameters:**
    *   `candidateId` (string, required): MongoDB ObjectId.
*   **Request Body:**
    ```json
    {
      "status": "Fail", 
      "confirmReroute": false 
    }
    ```
    *`status` enum: `Pending`, `Pass`, `Fail`.*
*   **Responses:**
    *   **200 OK:** Status updated successfully or candidate successfully rerouted.
    *   **409 Conflict (Reroute Confirmation Required):** Returned if a `Fail` status triggers a reroute to Choice 2, but `confirmReroute` was not passed as `true`.
        ```json
        {
          "success": false,
          "code": "REROUTE_CONFIRMATION_REQUIRED",
          "message": "Mark as Fail at the first-choice department and send this candidate to Business Department for second-choice review?",
          "requiresConfirmation": true,
          "reroutePreview": {
            "targetDepartment": "Business Department",
            "resultingStatus": "Pending"
          },
          "candidate": { ... }
        }
        ```

---

## 📂 2. Executive Board APIs (`/executive`)
*Requires Role: `Executive Board`*

### `GET` /executive/dashboard
Overview data for the Executive Dashboard landing page.

*   **Responses:**
    *   **200 OK:**
        ```json
        {
          "success": true,
          "active": { "currentGeneration": "Gen 12", "currentSemester": "2026A", "isRecruitmentActive": true },
          "headsByDepartment": {
            "Technology Department": [{ "id": "...", "name": "...", "email": "..." }]
          },
          "waitingGuestCount": 5
        }
        ```

### `GET` /executive/statistics
Gets overall and per-department candidate evaluation statistics for the current active cohort.

*   **Responses:**
    *   **200 OK:** Returns `total`, `pass`, `fail`, `pending` counts globally and by department.

### `GET` /executive/candidates
Retrieves all candidates for the Executive Board (read-only master view), scoped to the active cohort.

*   **Query Parameters:**
    *   `department` (string, optional): Filter by department.
    *   `status` (string, optional): `Pending` | `Pass` | `Fail`.
*   **Responses:**
    *   **200 OK:** Returns `candidates` list and `activeCohort` metadata.

### `GET` /executive/export
Downloads an Excel file containing Name, SID (Email), and Department of candidates.

*   **Query Parameters:**
    *   `status` (string, required): `Pass` | `Fail`.
*   **Responses:**
    *   **200 OK:** Returns binary stream (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

---

## 📂 3. System Config & Logs (`/executive`)
*Requires Role: `Executive Board`*

### `GET` /executive/system-config
List all generations, semesters, and the current active system configuration.

### `POST` /executive/system-config
Handles two actions: Creating a new Generation, or Activating an existing Generation/Semester pair.

*   **Request Body (Create Generation):**
    ```json
    { "action": "create-generation", "name": "Gen 13" }
    ```
*   **Request Body (Activate Cohort):**
    ```json
    { "action": "activate", "generation": "Gen 12", "semester": "2026B" }
    ```
*   **Responses:** **200 OK** on success.

### `PATCH` /executive/system-config
Toggles the global form intake status (Open/Close recruitment).

*   **Request Body:**
    ```json
    { "isRecruitmentActive": true }
    ```

### `POST` /executive/system-config/generations/:generationId/semesters
Adds a new semester to an existing generation.

*   **Request Body:**
    ```json
    { "code": "2026C" }
    ```

### `GET` /executive/system-logs
Retrieves paginated audit logs for system events.

*   **Query Parameters:** `level`, `category`, `q` (search), `from` (ISO), `to` (ISO), `page`, `pageSize`.
*   **Responses:** **200 OK** returning array of `SystemLog` objects.

---

## 📂 4. User Management (`/users`)
*Requires Active Role: `Executive Board`*

### `GET` /users
Retrieves the complete payload required for the user management dashboard.

*   **Responses:**
    *   **200 OK:**
        ```json
        {
          "success": true,
          "waitingGuests": [ ... ],
          "inactiveAccounts": [ ... ],
          "users": [ ... ],
          "soleActiveExecutiveId": "64f0a..."
        }
        ```

### `PATCH` /users
Updates user roles, departments, or active status (promote/demote/deactivate).

*   **Request Body:**
    ```json
    {
      "userId": "64f0a...",
      "role": "Department Head",
      "department": "Technology Department",
      "isActive": true
    }
    ```
*   **Responses:**
    *   **200 OK:** User updated successfully.
    *   **409 Conflict:**
        ```json
        {
          "success": false,
          "message": "Cannot remove or deactivate the last active Executive Board admin..."
        }
        ```

---

## 📂 5. Webhooks (`/webhooks`)
*Open Access (Triggered by Microsoft Power Automate)*

### `POST` /webhooks/power-automate
Receives raw JSON payloads from Microsoft Forms (via Power Automate) and creates a new Candidate document. It automatically maps the candidate to the `currentGeneration` and `currentSemester` based on `SystemConfig`.

*   **Request Body:** 
    A JSON payload structured from MS Forms mapped variables (needs `msFormResponseId`, `fullName`, `email`, `choice1`, `department`, etc.).
*   **Responses:**
    *   **200 OK:** `{ "success": true, "id": "inserted_mongo_id" }`
    *   **403 Forbidden:** `{ "success": false, "error": "Recruitment is not active." }`
    *   **400 Bad Request:** Missing `msFormResponseId` or invalid JSON.
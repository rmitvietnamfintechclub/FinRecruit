# 🚀 Fin-Recruit Phase 1 - Summary & Progress

This document summarizes the features, architecture, and data flows completed in **Phase 1** of the Fin-Recruit Dashboard. Please read this carefully to understand the context before diving into Phase 2 development.

## 🎯 1. System Overview
Fin-Recruit is the internal recruitment platform for the RMIT Vietnam FinTech Club. The system digitizes the application intake, evaluation workflow, and role authorization processes, replacing manual Google Sheets.

The system utilizes 3 primary Roles:
1. **Executive Board (Admin):** Full system access. Manages recruitment periods, system configurations, and authorizes user roles.
2. **Department Head:** Evaluates applications. Can only view and evaluate (Pass/Fail/Reroute) candidates routed to their specific department.
3. **Guest:** Default role for new sign-ins. Stuck in the "Waiting Room" until an Executive grants them access.

## ✅ 2. Current Progress (Completed Features)

### 🔐 Authentication & Authorization (NextAuth + Custom)
- Login via Google Account (`GoogleProvider`).
- Automatically syncs Users to the MongoDB (`User` model).
- Custom Session Management to force-logout users immediately if their access/role is revoked.
- **Middleware `withRBAC`:** Secures all API endpoints based on user roles.

### 👑 Executive Board Dashboard (MasterView)
- **Overview:** Displays candidate statistics, department distribution charts, and a list of active Department Heads.
- **User Management:** Promote/Demote roles (Guest <-> Head <-> Executive Board). Includes a safeguard to prevent accidentally locking out the final active Admin.
- **System Config:** 
  - Create Generation cohorts (e.g., Gen 12, Gen 13).
  - Create Semesters (e.g., 2026A, 2026B).
  - **Recruitment Toggle:** Master switch to Open/Close recruitment form intake (blocks webhooks when closed).
- **Master Candidates:** Read-only global view of all candidates across all departments. Supports filtering and **Excel Export** (Pass/Fail lists).
- **System Logs (Audit):** Tracks all critical system actions (who evaluated whom, who changed roles, IP address, timestamp).

### 👔 Department Head Dashboard
- **Candidate Board:** Supports both List and Grid (Card) views.
- **Candidate Details:** Displays full application answers, CV links, and personal information.
- **Evaluation Workflow:** 
  - Update status from `Pending` -> `Pass` / `Fail`.
  - **Complex Reroute Logic:** If a Head fails a candidate on their 1st Choice (Choice 1) -> The system prompts for confirmation and automatically reroutes the candidate to their 2nd Choice (Choice 2) department with a `Pending` status.

### 🤖 Webhook & Integration
- **Power Automate Webhook:** The API endpoint `/api/executive/webhooks/power-automate` catches dynamic JSON payloads from Microsoft Forms. It normalizes the data, automatically tags it with the live Generation/Semester from `SystemConfig`, and saves it to MongoDB.

## 🗄️ 3. Database Architecture (MongoDB)
- `Candidate`: Stores candidate form submissions (Answers, Choice 1, Choice 2, Status, etc.).
- `User`: Stores staff account information (Role, Department, Active status, etc.).
- `SystemConfig`: Stores the currently "Live" Generation and Semester, and the form Open/Off status.
- `RecruitmentGeneration`: The catalog of all created generations and semesters.
- `AuditLog`: Stores security and system-level action history.
- `Session`: Strictly manages active login sessions.
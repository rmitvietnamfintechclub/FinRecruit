```
C:.
│   .gitignore
│   .prettierrc
│   components.json
│   eslint.config.mjs
│   folder-structure.md
│   global.css
│   global.d.ts
│   next.config.ts
│   package-lock.json
│   package.json
│   postcss.config.mjs
│   README.md
│   tsconfig.json
│
├───docs
│       GIT_BASICS.md
│       GIT_NAMING.md
│
├───public
│       ftc_logo.png
│
├───scripts
│       validate-auth-backend.ts
│       validate-rbac-backend.ts
│
└───src
    │   middleware.ts
    │
    ├───app
    │   │   apple-icon.png
    │   │   icon.png
    │   │   layout.tsx
    │   │   page.tsx
    │   │
    │   ├───(backend)
    │   │   ├───api
    │   │   │   ├───auth
    │   │   │   │   └───[...nextauth]
    │   │   │   │           route.ts
    │   │   │   │
    │   │   │   ├───executive
    │   │   │   │   ├───candidates
    │   │   │   │   │   │   route.ts
    │   │   │   │   │   │
    │   │   │   │   │   └───[id]
    │   │   │   │   │           route.ts
    │   │   │   │   │
    │   │   │   │   ├───dashboard
    │   │   │   │   │       route.ts
    │   │   │   │   │
    │   │   │   │   ├───export
    │   │   │   │   │       route.ts
    │   │   │   │   │
    │   │   │   │   ├───ping
    │   │   │   │   │       route.ts
    │   │   │   │   │
    │   │   │   │   ├───statistics
    │   │   │   │   │       route.ts
    │   │   │   │   │
    │   │   │   │   ├───system-config
    │   │   │   │   │   │   route.ts
    │   │   │   │   │   │
    │   │   │   │   │   └───generations
    │   │   │   │   │       └───[generationId]
    │   │   │   │   │           └───semesters
    │   │   │   │   │                   route.ts
    │   │   │   │   │
    │   │   │   │   └───system-logs
    │   │   │   │           route.ts
    │   │   │   │
    │   │   │   ├───head-dashboard
    │   │   │   │   └───candidates
    │   │   │   │       │   route.ts
    │   │   │   │       │
    │   │   │   │       └───[candidateId]
    │   │   │   │           │   route.ts
    │   │   │   │           │
    │   │   │   │           └───status
    │   │   │   │                   route.ts
    │   │   │   │
    │   │   │   ├───response
    │   │   │   │       route.ts
    │   │   │   │
    │   │   │   ├───test-db
    │   │   │   │       route.ts
    │   │   │   │
    │   │   │   ├───users
    │   │   │   │   │   route.ts
    │   │   │   │   │
    │   │   │   │   └───role
    │   │   │   │           route.ts
    │   │   │   │
    │   │   │   └───webhooks
    │   │   │       └───power-automate
    │   │   │               route.ts
    │   │   │
    │   │   ├───controllers
    │   │   │       pipelineController.ts
    │   │   │
    │   │   ├───libs
    │   │   │   │   auth.ts
    │   │   │   │   dbConnect.ts
    │   │   │   │   departmentHeadDashboard.ts
    │   │   │   │   departments.ts
    │   │   │   │   mongodb.ts
    │   │   │   │   session.ts
    │   │   │   │
    │   │   │   ├───system-config
    │   │   │   │       service.ts
    │   │   │   │
    │   │   │   └───system-log
    │   │   │           service.ts
    │   │   │
    │   │   ├───middleware
    │   │   │       auth&RBAC.ts
    │   │   │
    │   │   ├───models
    │   │   │       AuditLog.ts
    │   │   │       Candidate.ts
    │   │   │       RecruitmentGeneration.ts
    │   │   │       Session.ts
    │   │   │       SystemConfig.ts
    │   │   │       User.ts
    │   │   │
    │   │   └───types
    │   │           index.d.ts
    │   │           next-auth.d.ts
    │   │
    │   └───(frontend)
    │       │   layout.tsx
    │       │   page.tsx
    │       │   providers.tsx
    │       │
    │       └───(router)
    │           ├───HeadDashboard
    │           │       HeadDashboardShell.tsx
    │           │       layout.tsx
    │           │       page.tsx
    │           │       patchCandidateStatus.ts
    │           │
    │           ├───loginPage
    │           │       page.tsx
    │           │
    │           ├───MasterViewDashboard
    │           │   │   ExecutiveDashboardShell.tsx
    │           │   │   ExecutiveHomeClient.tsx
    │           │   │   layout.tsx
    │           │   │   page.tsx
    │           │   │
    │           │   ├───candidates
    │           │   │       page.tsx
    │           │   │
    │           │   ├───system-config
    │           │   │       page.tsx
    │           │   │       SystemConfigClient.tsx
    │           │   │
    │           │   ├───system-logs
    │           │   │       page.tsx
    │           │   │       SystemLogsClient.tsx
    │           │   │
    │           │   └───user-management
    │           │           page.tsx
    │           │           UserManagementClient.tsx
    │           │
    │           └───waiting-room
    │                   layout.tsx
    │                   page.tsx
    │
    ├───components
    │   │   LogoutButton.tsx
    │   │
    │   ├───dashboard
    │   │       DashboardAppShell.tsx
    │   │
    │   ├───feedback
    │   │       AppNotice.tsx
    │   │       CohortBanner.tsx
    │   │       ConfirmDialog.tsx
    │   │       ConfirmModal.tsx
    │   │
    │   ├───ui
    │   │       badge.tsx
    │   │       button.tsx
    │   │       CandidateModal.tsx
    │   │       CandidateTable.tsx
    │   │       card.tsx
    │   │       checkbox.tsx
    │   │       dropdown-menu.tsx
    │   │       select.tsx
    │   │       switch.tsx
    │   │       table.tsx
    │   │
    │   └───user-management
    │           UserManagementDataTable.tsx
    │
    ├───hooks
    │       use-dashboard-theme.ts
    │       useIntervalWhenVisible.ts
    │       useRelativeNowTick.ts
    │
    ├───lib
    │   │   candidate-answers.ts
    │   │   candidateRoutingCopy.ts
    │   │   executiveMasterViewMapping.ts
    │   │   formatRelativeTime.ts
    │   │   role-routes.ts
    │   │   utils.ts
    │   │
    │   └───user-management
    │           cohort.ts
    │           db-user-management.ts
    │           mock-store.ts
    │
    └───types
            headDashboard.ts
```
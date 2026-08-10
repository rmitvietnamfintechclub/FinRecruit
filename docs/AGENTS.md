# AI Agent Instructions for Fin-Recruit Dashboard

You are an expert full-stack developer working on the Fin-Recruit Dashboard. Follow these rules strictly to maintain codebase consistency.

## Tech Stack
- Next.js (App Router)
- React, TypeScript
- Tailwind CSS, Radix UI (shadcn/ui based components)
- MongoDB (Mongoose)
- NextAuth.js (Google Provider)

## Project Architecture & Folder Structure
- `src/app/(backend)`: Contains strictly backend code (API routes, Mongoose models, DB connection, backend libs/middlewares).
  - DO NOT import anything from `(backend)` into client components except types.
- `src/app/(frontend)`: Contains frontend pages, layouts, and providers.
- `src/components`: Reusable UI components. Subfolders for `ui`, `feedback`, `dashboard`, etc.
- `src/lib` & `src/hooks`: Frontend utility functions and React hooks.

## Coding Conventions
1. **TypeScript**: Use strict typing. Avoid `any`. Define `type` or `interface` for all props and payloads.
2. **Components**: Use functional components. Destructure props. Ensure Client Components have `'use client'` at the very top.
3. **Styling**: Use Tailwind CSS. For dynamic classes, always use the `cn()` utility (`clsx` + `tailwind-merge`) from `src/lib/utils.ts`.
4. **Data Fetching (Frontend)**: Use standard `fetch` API. Handle loading and error states explicitly. Always send `{ credentials: 'include' }` for authenticated API calls.
5. **Database (Backend)**: 
   - Always call `await dbConnect()` before executing Mongoose queries in API routes.
   - Use `.lean().exec()` for read-only queries to improve performance.
6. **Authentication & RBAC**:
   - Use `withRBAC` or `withActiveRBAC` middleware wrapping `GET/POST/PATCH/DELETE` methods in API routes.
   - Roles include: `'Guest'`, `'Department Head'`, `'Executive Board'`.

## Best Practices
- **Early Returns**: Check for errors or invalid states early and return responses immediately to avoid deep nesting.
- **Audit Logs**: For any write/update operations in backend, utilize `logSystemEvent` from `src/app/(backend)/libs/system-log/service.ts`.
- **UI UX**: Prioritize clean, accessible UI. Use `AppNotice` for inline alerts and `ConfirmDialog` / `ConfirmModal` for destructive actions.
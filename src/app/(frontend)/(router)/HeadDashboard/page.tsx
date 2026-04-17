import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { DepartmentCandidatesTable } from '@/app/(frontend)/(router)/HeadDashboard/DepartmentCandidatesTable';

/**
 * Department Head — danh sách thí sinh thuộc phòng ban (theo session).
 * Route: /HeadDashboard
 */
export default function HeadDashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 font-sans text-zinc-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Department Head
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Thí sinh phòng ban
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Dữ liệu từ{' '}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                GET /api/head-dashboard/candidates
              </code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              Trang chủ
            </Link>
            <LogoutButton />
          </div>
        </header>

        <DepartmentCandidatesTable />
      </div>
    </main>
  );
}

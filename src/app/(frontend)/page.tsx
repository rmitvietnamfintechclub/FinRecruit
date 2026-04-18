import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <h1 className="mb-4 text-4xl font-bold text-gray-900">
        Welcome to Fin-Recruit
      </h1>
      <p className="mb-8 text-lg text-gray-600">
        The Fintech Club Recruitment Platform
      </p>
      
      {/* This link directs you to the dashboard page you created earlier */}
      <Link 
        href="/HeadDashboard" 
        className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        Go to Department Head Dashboard
      </Link>
    </div>
  );
}
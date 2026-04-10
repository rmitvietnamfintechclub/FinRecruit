import Link from 'next/link';

export default function HeadDashboardPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Head Dashboard</h1>
      <p>
        <Link href="/">Về trang chủ</Link>
      </p>
    </main>
  );
}

import Link from 'next/link';

/**
 * Department Head · route /HeadDashboard
 * Frontend team: implement UI in this file.
 */
export default function HeadDashboardPage() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
      }}
    >
      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
        Edit Department Head UI in:
      </p>
      <pre
        style={{
          fontSize: 11,
          margin: '8px 0 16px',
          padding: 8,
          background: '#f4f4f5',
          borderRadius: 6,
          overflow: 'auto',
        }}
      >
        src/app/(frontend)/(router)/HeadDashboard/page.tsx
      </pre>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Head Dashboard</h1>
      <p style={{ marginTop: 12, fontSize: 13 }}>
        <Link href="/">/</Link>
      </p>
    </main>
  );
}

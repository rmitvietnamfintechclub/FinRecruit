import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';

/**
 * Executive Board · route /masterview
 * Team FE chỉnh giao diện tại file này.
 */
export default function MasterviewPage() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        background: '#fafafa',
      }}
    >
      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
        Chỉnh UI Executive Board tại:
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
        src/app/(frontend)/(router)/masterview/page.tsx
      </pre>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Master view</h1>
      <p style={{ marginTop: 12, fontSize: 13 }}>
        <Link href="/">/</Link>
      </p>
      <LogoutButton />
    </main>
  );
}

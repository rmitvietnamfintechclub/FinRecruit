'use client';

import { LogoutButton } from '@/components/LogoutButton';

/**
 * Guest · route /waiting-room
 * Team FE chỉnh giao diện tại file này.
 */
export default function WaitingRoomPage() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
      }}
    >
      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
        Chỉnh UI Guest tại:
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
        src/app/(frontend)/(router)/waiting-room/page.tsx
      </pre>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Waiting room · Guest</h1>
      <LogoutButton />
    </main>
  );
}

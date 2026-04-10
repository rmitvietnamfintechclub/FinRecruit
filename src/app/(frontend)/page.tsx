'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      router.replace('/loginPage');
      return;
    }

    const role = session.user.role;
    if (role === 'Guest') {
      router.replace('/waiting-room');
      return;
    }

    router.replace('/HeadDashboard');
  }, [session, status, router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#71717a',
      }}
    >
      <p style={{ fontSize: 14 }}>Đang tải…</p>
    </main>
  );
}

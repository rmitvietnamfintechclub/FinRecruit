'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HeadDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/loginPage');
      return;
    }
    if (session.user.role === 'Guest') {
      router.replace('/waiting-room');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session?.user || session.user.role === 'Guest') {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#71717a' }}>
        <p>Đang tải…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Head Dashboard</h1>
      <p>
        <Link href="/">Về trang chủ</Link>
      </p>
    </main>
  );
}

'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WaitingRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading' && session?.user?.role && session.user.role !== 'Guest') {
      router.replace('/');
    }
  }, [session, status, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f4f5',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#71717a',
      }}
    >
      {status === 'loading' ? (
        <p style={{ fontSize: 14 }}>…</p>
      ) : (
        <>
          <p style={{ fontSize: 14, letterSpacing: '0.02em', margin: 0 }}>Đang chờ phân quyền</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/loginPage' })}
            style={{
              marginTop: 24,
              padding: '8px 14px',
              fontSize: 13,
              color: '#71717a',
              background: 'transparent',
              border: '1px solid #d4d4d8',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Đăng xuất
          </button>
        </>
      )}
    </div>
  );
}

'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #f4f4f5 0%, #e4e4e7 100%)',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        padding: 24,
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '40px 36px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 22,
            fontWeight: 700,
            color: '#18181b',
            letterSpacing: '-0.02em',
          }}
        >
          FinRecruit
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: '#71717a', lineHeight: 1.5 }}>
          Đăng nhập để tiếp tục
        </p>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          style={{
            width: '100%',
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            background: '#18181b',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          Đăng nhập
        </button>
        <p style={{ margin: '20px 0 0', fontSize: 12, color: '#a1a1aa' }}>Tiếp tục với Google</p>
      </main>
    </div>
  );
}

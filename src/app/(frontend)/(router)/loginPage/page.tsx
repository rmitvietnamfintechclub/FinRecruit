'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Đăng nhập</h1>
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: '/' })}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #ccc',
          cursor: 'pointer',
          background: '#fff',
        }}
      >
        Đăng nhập bằng Google
      </button>
    </main>
  );
}

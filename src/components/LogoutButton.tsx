'use client';

import { signOut } from 'next-auth/react';

type LogoutButtonProps = {
  label?: string;
};

export function LogoutButton({ label = 'Đăng xuất' }: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/loginPage' })}
      style={{
        marginTop: 16,
        padding: '8px 12px',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

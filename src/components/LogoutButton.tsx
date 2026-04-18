'use client';

import { signOut } from 'next-auth/react';

type LogoutButtonProps = {
  label?: string;
  /** When set, inline default styles are omitted (use for Tailwind / custom UI). */
  className?: string;
};

export function LogoutButton({
  label = 'Đăng xuất',
  className,
}: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/loginPage' })}
      className={className}
      style={
        className
          ? undefined
          : {
              marginTop: 16,
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }
      }
    >
      {label}
    </button>
  );
}

'use client';

import type { ComponentProps } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LogoutButtonProps = {
  label?: string;
  /** When set, renders a plain `<button>` with this class (dashboard shell styling). */
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
};

export function LogoutButton({
  label = 'Sign out',
  className,
  variant = 'outline',
  size = 'default',
}: LogoutButtonProps) {
  const handleSignOut = () => signOut({ callbackUrl: '/loginPage' });

  if (className) {
    return (
      <button type="button" onClick={handleSignOut} className={className}>
        {label}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn('w-full sm:w-auto')}
      onClick={handleSignOut}
    >
      {label}
    </Button>
  );
}

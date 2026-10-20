'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type SessionContextType = {
  triggerSessionExpired: () => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

export const useSessionExpired = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error(
      'useSessionExpired must be used within a SessionExpiredProvider'
    );
  }
  return context;
};

export function SessionExpiredProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpired, setIsExpired] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const triggerSessionExpired = useCallback(() => {
    setIsExpired(true);
  }, []);

  const handleRelogin = async () => {
    setIsRedirecting(true);
    // Có thể lưu lại pathname hiện tại để redirect về sau khi đăng nhập thành công
    await signOut({ callbackUrl: '/loginPage' });
  };

  return (
    <SessionContext.Provider value={{ triggerSessionExpired }}>
      {children}

      {/* GLOBAL SESSION EXPIRED MODAL */}
      {isExpired && (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0D1742]/80 backdrop-blur-sm animate-in fade-in duration-300"
        >
          <div className="bg-white max-w-lg w-full mx-4 rounded-3xl border border-gray-200 p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <i
                className="fa-solid fa-clock-rotate-left text-3xl"
                aria-hidden
              />
            </div>
            <div className="text-center mb-8">
              <h3 className="text-xl font-black tracking-tight text-[#0D1742] mb-3">
                Session Expired
              </h3>
              <p className="text-sm font-medium text-[#5E5E92] leading-relaxed">
                Your session has expired. Please sign in again to continue.
              </p>
            </div>

            <Button
              onClick={handleRelogin}
              disabled={isRedirecting}
              className="w-full h-12 rounded-xl bg-[#0D1742] text-[#DCB968] font-bold hover:bg-[#0D1742]/90 transition-all text-base"
            >
              {isRedirecting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" />
                  Redirecting to login...
                </>
              ) : (
                <>
                  Sign in again
                  <i className="fa-solid fa-arrow-right ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </SessionContext.Provider>
  );
}

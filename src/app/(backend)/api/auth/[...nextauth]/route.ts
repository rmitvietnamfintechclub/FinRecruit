import NextAuth from 'next-auth/next';
import type { NextRequest } from 'next/server';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import { APP_SESSION_COOKIE_NAME, clearAppSessionCookie, deleteAppSession } from '@/app/(backend)/libs/session';

type AuthRouteContext = { 
  params: Promise<{ nextauth: string[] }>; 
};

// 1. Tạo handler riêng từ NextAuth
const nextAuthHandler = NextAuth(buildAuthOptions());

async function authHandler(req: NextRequest, context: AuthRouteContext) {
  // 2. Resolve params promise trước (Bắt buộc cho Next.js 15)
  const resolvedParams = await context.params;
  
  const action = resolvedParams?.nextauth?.[0];
  const isSignOutRequest = action === 'signout' && req.method === 'POST';
  const currentSessionId = req.cookies.get(APP_SESSION_COOKIE_NAME)?.value;

  // 3. Truyền params đã resolve vào handler
  const response = await nextAuthHandler(req, { params: resolvedParams });

  if (isSignOutRequest) {
    if (currentSessionId) {
      await deleteAppSession(currentSessionId);
    }
    await clearAppSessionCookie();
  }

  return response;
}

export const GET = authHandler;
export const POST = authHandler;
import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { buildAuthOptions } from '@/app/(backend)/libs/auth';
import {
  APP_SESSION_COOKIE_NAME,
  clearAppSessionCookie,
  deleteAppSession,
} from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

async function authHandler(req: NextRequest, context: AuthRouteContext) {
  const { nextauth } = await context.params;
  const action = nextauth?.[0];
  const isSignOutRequest = action === 'signout' && req.method === 'POST';
  const currentSessionId = req.cookies.get(APP_SESSION_COOKIE_NAME)?.value;

  const response = await NextAuth(req, context, buildAuthOptions());

  if (isSignOutRequest) {
    await deleteAppSession(currentSessionId);
    await clearAppSessionCookie();
  }

  return response;
}

export const GET = authHandler;
export const POST = authHandler;

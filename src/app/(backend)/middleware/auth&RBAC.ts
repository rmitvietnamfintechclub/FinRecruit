import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { APP_SESSION_COOKIE_NAME, getActiveAppSession } from '@/app/(backend)/libs/session';
import type { RoleType } from '@/app/(backend)/types';

export class AuthorizationError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = status;
  }
}

export async function getAuthenticatedSession(req?: NextRequest) {
  const cookieStore = req?.cookies ?? (await cookies());
  const sessionId = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value;

  return getActiveAppSession(sessionId);
}

export async function requireAuthenticatedSession(req?: NextRequest) {
  const session = await getAuthenticatedSession(req);

  if (!session) {
    throw new AuthorizationError('Authentication required.', 401);
  }

  return session;
}

export async function checkRole(
  requiredRoles: RoleType | RoleType[],
  req?: NextRequest
) {
  const session = await requireAuthenticatedSession(req);
  const allowedRoles = Array.isArray(requiredRoles)
    ? requiredRoles
    : [requiredRoles];

  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthorizationError('Insufficient permissions.', 403);
  }

  return session;
}

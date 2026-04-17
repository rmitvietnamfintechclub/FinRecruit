import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import {
  APP_SESSION_COOKIE_NAME,
  type ActiveAppSession,
  getActiveAppSession,
} from '@/app/(backend)/libs/session';
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

export function authorizationErrorToResponse(error: AuthorizationError) {
  return NextResponse.json(
    {
      success: false,
      message: error.message,
    },
    { status: error.status }
  );
}

type ProtectedRouteContext = Record<string, unknown>;

type ProtectedRouteHandlerWithoutContext = (
  req: NextRequest,
  context: { session: ActiveAppSession }
) => Promise<Response>;

type ProtectedRouteHandlerWithContext<TContext extends ProtectedRouteContext> = (
  req: NextRequest,
  context: TContext & { session: ActiveAppSession }
) => Promise<Response>;

export function withRBAC(
  requiredRoles: RoleType | RoleType[],
  handler: ProtectedRouteHandlerWithoutContext
): (req: NextRequest) => Promise<Response>;
export function withRBAC<TContext extends ProtectedRouteContext>(
  requiredRoles: RoleType | RoleType[],
  handler: ProtectedRouteHandlerWithContext<TContext>
): (req: NextRequest, context: TContext) => Promise<Response>;
export function withRBAC<TContext extends ProtectedRouteContext>(
  requiredRoles: RoleType | RoleType[],
  handler:
    | ProtectedRouteHandlerWithoutContext
    | ProtectedRouteHandlerWithContext<TContext>
) {
  return async (req: NextRequest, context?: TContext) => {
    try {
      const session = await checkRole(requiredRoles, req);

      return await (
        handler as ProtectedRouteHandlerWithContext<TContext>
      )(
        req,
        Object.assign({}, context, { session }) as TContext & {
          session: ActiveAppSession;
        }
      );
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return authorizationErrorToResponse(error);
      }

      throw error;
    }
  };
}

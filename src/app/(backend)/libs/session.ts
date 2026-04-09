import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import type { Types } from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Session from '@/app/(backend)/models/Session';
import User from '@/app/(backend)/models/User';
import type { DepartmentType, RoleType } from '@/app/(backend)/types';

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const parsedSessionMaxAge = Number(
  process.env.AUTH_SESSION_MAX_AGE_SECONDS ?? DEFAULT_SESSION_MAX_AGE_SECONDS
);

export const APP_SESSION_MAX_AGE_SECONDS =
  Number.isFinite(parsedSessionMaxAge) && parsedSessionMaxAge > 0
    ? parsedSessionMaxAge
    : DEFAULT_SESSION_MAX_AGE_SECONDS;

export const APP_SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Host-finrecruit_session'
    : 'finrecruit_session';

const isSecureCookie = process.env.NODE_ENV === 'production';

const buildSessionExpiry = () =>
  new Date(Date.now() + APP_SESSION_MAX_AGE_SECONDS * 1000);

export type AuthenticatedAppUser = {
  id: string;
  name?: string | null;
  email: string;
  avatar?: string | null;
  role: RoleType;
  department: DepartmentType;
  isActive: boolean;
};

export type ActiveAppSession = {
  sessionId: string;
  expiresAt: Date;
  user: AuthenticatedAppUser;
};

export function generateSessionId() {
  return randomBytes(32).toString('hex');
}

export async function createSessionRecord(
  userId: string | Types.ObjectId,
  currentSessionId?: string
) {
  await dbConnect();

  if (currentSessionId) {
    await Session.deleteOne({ sessionId: currentSessionId });
  }

  const sessionId = generateSessionId();
  const expiresAt = buildSessionExpiry();

  await Session.create({
    sessionId,
    userId,
    expiresAt,
  });

  return { sessionId, expiresAt };
}

export async function rotateAppSession(userId: string | Types.ObjectId) {
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(APP_SESSION_COOKIE_NAME)?.value;
  const { sessionId, expiresAt } = await createSessionRecord(
    userId,
    currentSessionId
  );

  cookieStore.set({
    name: APP_SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });

  return { sessionId, expiresAt };
}

export async function deleteAppSession(sessionId?: string) {
  if (!sessionId) {
    return;
  }

  await dbConnect();
  await Session.deleteOne({ sessionId });
}

export async function revokeUserSessions(userId: string | Types.ObjectId) {
  await dbConnect();
  await Session.deleteMany({ userId });
}

export async function getActiveAppSession(
  sessionId?: string
): Promise<ActiveAppSession | null> {
  if (!sessionId) {
    return null;
  }

  await dbConnect();

  const session = await Session.findOne({
    sessionId,
    expiresAt: { $gt: new Date() },
  })
    .lean()
    .exec();

  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId)
    .select('name email avatar role department isActive')
    .lean()
    .exec();

  if (!user || !user.isActive) {
    await Session.deleteOne({ sessionId });
    return null;
  }

  return {
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    user: {
      id: user._id.toString(),
      name: user.name ?? null,
      email: user.email,
      avatar: user.avatar ?? null,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    },
  };
}

export async function clearAppSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: APP_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  });
}

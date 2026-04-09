import type { AuthOptions, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  APP_SESSION_MAX_AGE_SECONDS,
  rotateAppSession,
} from '@/app/(backend)/libs/session';
import User from '@/app/(backend)/models/User';

type GoogleProfilePayload = {
  email: string;
  name?: string | null;
  avatar?: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export async function upsertGoogleUser({
  email,
  name,
  avatar,
}: GoogleProfilePayload) {
  await dbConnect();

  const normalizedEmail = normalizeEmail(email);

  const dbUser = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        name: name?.trim() || null,
        avatar: avatar || null,
      },
      $setOnInsert: {
        role: 'Guest',
        department: 'Unassigned',
        isActive: true,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).exec();

  if (!dbUser) {
    throw new Error('Failed to create or load user from Google sign-in.');
  }

  return dbUser;
}

export function buildAuthOptions(): AuthOptions {
  const googleClientId = getRequiredEnv('AUTH_GOOGLE_ID');
  const googleClientSecret = getRequiredEnv('AUTH_GOOGLE_SECRET');

  return {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt',
      maxAge: APP_SESSION_MAX_AGE_SECONDS,
    },
    providers: [
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    ],
    callbacks: {
      async signIn({ user, profile }) {
        if (!user.email) {
          return false;
        }

        const googleProfile = profile as Profile | undefined;

        const dbUser = await upsertGoogleUser({
          email: user.email,
          name: user.name ?? googleProfile?.name ?? null,
          avatar: user.image ?? googleProfile?.image ?? null,
        });

        if (!dbUser.isActive) {
          return false;
        }

        await rotateAppSession(dbUser._id);

        return true;
      },
      async jwt({ token, user, trigger }) {
        if ((trigger === 'signIn' || trigger === 'signUp') && user.email) {
          const dbUser = await upsertGoogleUser({
            email: user.email,
            name: user.name ?? null,
            avatar: user.image ?? null,
          });

          if (dbUser) {
            token.userId = dbUser._id.toString();
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (!session.user || !token.userId) {
          return session;
        }

        await dbConnect();

        const dbUser = await User.findById(token.userId)
          .select('name email avatar role department isActive')
          .lean()
          .exec();

        if (!dbUser) {
          session.user = undefined;
          return session;
        }

        session.user.id = dbUser._id.toString();
        session.user.name = dbUser.name ?? null;
        session.user.email = dbUser.email;
        session.user.image = dbUser.avatar ?? null;
        session.user.role = dbUser.role;
        session.user.department = dbUser.department;
        session.user.isActive = dbUser.isActive;

        return session;
      },
    },
  };
}

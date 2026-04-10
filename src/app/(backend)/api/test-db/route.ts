import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  AuthorizationError,
  authorizationErrorToResponse,
  requireAuthenticatedSession,
} from '@/app/(backend)/middleware/auth&RBAC';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: 'Not found.' },
      { status: 404 }
    );
  }

  try {
    await requireAuthenticatedSession(req);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorToResponse(error);
    }
    throw error;
  }

  try {
    const conn = await dbConnect();
    return NextResponse.json(
      {
        success: true,
        message: 'MongoDB connected successfully! 🎉',
        host: conn.connection.host,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Database connection error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to connect to MongoDB ❌',
        error: message,
      },
      { status: 500 }
    );
  }
}
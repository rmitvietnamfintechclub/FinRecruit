import { NextResponse, type NextRequest } from 'next/server';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

/**
 * Example API: chỉ user có app session + role Executive Board.
 * Xem checklist: docs/API_RBAC_CHECKLIST.md
 */
export const GET = withRBAC(
  'Executive Board', // more role if you want
  async (_req: NextRequest, context: { session: ActiveAppSession }) => {
    const { user } = context.session;

    return NextResponse.json(
      {
        success: true,
        message: 'Executive Board only.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  }
);

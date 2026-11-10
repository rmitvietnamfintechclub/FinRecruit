import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/guards/auth&RBAC';

export const runtime = 'nodejs';

export const GET = withActiveRBAC(
  ['Executive Board', 'Department Head'],
  async (req: NextRequest) => {
    const origin =
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'https://finrecruit.rmitvietnamfintechclub.com';

    return NextResponse.json({
      success: true,
      internalUrl: `${origin}/interview-availability`,
      publicUrl: `${origin}/interview-booking`,
      lookupUrl: `${origin}/interview-lookup`,
    });
  }
);
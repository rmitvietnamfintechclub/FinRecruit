import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';

export const runtime = 'nodejs';

export const GET = withActiveRBAC('Executive Board', async (req: NextRequest) => {
    const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    return NextResponse.json({
        success: true,
        internalUrl: `${origin}/interview-availability`,
        publicUrl: `${origin}/interview-booking`,
    });
});
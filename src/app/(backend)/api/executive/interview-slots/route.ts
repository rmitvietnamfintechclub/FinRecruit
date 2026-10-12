import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import {
    getActiveCohortSlots,
    publishMasterSlots,
} from '@/app/(backend)/libs/interview-scheduling/service';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

export const GET = withActiveRBAC('Executive Board', async () => {
    try {
        const slots = await getActiveCohortSlots();
        return NextResponse.json({ success: true, slots });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to fetch slots.' },
            { status: 500 }
        );
    }
});

export const POST = withActiveRBAC('Executive Board', async (req: NextRequest, { session }: { session: ActiveAppSession }) => {
    try {
        const body = await req.json();
        const slotsInput = Array.isArray(body?.slots) ? body.slots : [];
        if (slotsInput.length === 0) {
            return NextResponse.json({ success: false, message: 'No slots provided.' }, { status: 400 });
        }

        const slots = await publishMasterSlots(slotsInput, {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role,
        });

        return NextResponse.json({ success: true, slots });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to publish slots.' },
            { status: 400 }
        );
    }
});
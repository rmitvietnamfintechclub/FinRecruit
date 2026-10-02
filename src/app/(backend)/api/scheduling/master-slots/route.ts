import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import {
    generateConsecutiveSlots,
    publishMasterSlots,
} from '@/app/(backend)/libs/interview-scheduling/service';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

export const POST = withActiveRBAC('Executive Board', async (req: NextRequest, { session }: { session: ActiveAppSession }) => {
    try {
        const body = await req.json();
        let slotsToPublish = body.slots;

        // Auto-chunk if a start/end time range is passed directly
        if (!slotsToPublish && body.date && body.startTime && body.endTime && body.room) {
            const chunks = generateConsecutiveSlots(body.startTime, body.endTime, body.intervalMinutes ?? 40);
            slotsToPublish = chunks.map((c) => ({
                date: body.date,
                startTime: c.startTime,
                endTime: c.endTime,
                room: body.room,
            }));
        }

        const slots = await publishMasterSlots(slotsToPublish, {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role,
        });

        return NextResponse.json({ success: true, message: 'Master slots created successfully.', data: { slots } });
    } catch (e) {
        return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Failed to create slots.' }, { status: 400 });
    }
});
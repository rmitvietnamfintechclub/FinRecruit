import { NextResponse } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import { getAvailabilityMonitorData } from '@/app/(backend)/libs/interview-scheduling/service';

export const runtime = 'nodejs';

export const GET = withActiveRBAC('Executive Board', async () => {
    try {
        const data = await getAvailabilityMonitorData();
        return NextResponse.json({ success: true, ...data });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to fetch availability.' },
            { status: 500 }
        );
    }
});
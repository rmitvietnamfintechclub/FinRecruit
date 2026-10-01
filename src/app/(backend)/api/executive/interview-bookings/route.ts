import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import { getAvailabilityMonitorData } from '@/app/(backend)/libs/interview-scheduling/service';
import type { DepartmentType } from '@/app/(backend)/types';

export const runtime = 'nodejs';

export const GET = withActiveRBAC('Executive Board', async (req: NextRequest) => {
    try {
        const dept = (req.nextUrl.searchParams.get('department') as DepartmentType | 'all') || 'all';
        const data = await getAvailabilityMonitorData(dept);
        return NextResponse.json({ success: true, ...data });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to fetch bookings.' },
            { status: 500 }
        );
    }
});
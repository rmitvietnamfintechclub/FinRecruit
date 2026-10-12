import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import {
    deleteMasterSlot,
    updateMasterSlot,
} from '@/app/(backend)/libs/interview-scheduling/service';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = withActiveRBAC<RouteContext>(
    'Executive Board',
    async (req: NextRequest, { params, session }: { params: Promise<{ id: string }>; session: ActiveAppSession }) => {
        try {
            const { id } = await params;
            const patch = await req.json();

            const result = await updateMasterSlot(id, patch, {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
            });

            if (!result.ok) {
                const status = result.message?.includes('already booked') ? 409 : 404;
                return NextResponse.json({ success: false, message: result.message }, { status });
            }

            return NextResponse.json({ success: true, slots: result.slots });
        } catch (e) {
            return NextResponse.json(
                { success: false, message: e instanceof Error ? e.message : 'Failed to update slot.' },
                { status: 400 }
            );
        }
    }
);

export const DELETE = withActiveRBAC<RouteContext>(
    'Executive Board',
    async (_req: NextRequest, { params, session }: { params: Promise<{ id: string }>; session: ActiveAppSession }) => {
        try {
            const { id } = await params;

            const result = await deleteMasterSlot(id, {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
            });

            if (!result.ok) {
                const status = result.message?.includes('already booked') ? 409 : 404;
                return NextResponse.json({ success: false, message: result.message }, { status });
            }

            return NextResponse.json({ success: true, slots: result.slots });
        } catch (e) {
            return NextResponse.json(
                { success: false, message: e instanceof Error ? e.message : 'Failed to delete slot.' },
                { status: 400 }
            );
        }
    }
);
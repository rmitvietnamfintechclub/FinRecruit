import { NextResponse, type NextRequest } from 'next/server';
import { withActiveRBAC } from '@/app/(backend)/guards/auth&RBAC';
import {
    deleteMasterSlot,
    updateSlotBookingStatus,
} from '@/app/(backend)/libs/interview-scheduling/service';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import type { DepartmentType } from '@/app/(backend)/types'; // BỔ SUNG IMPORT

export const runtime = 'nodejs';

type RouteContext = {
    params: Promise<{ id: string }>;
};

export const PATCH = withActiveRBAC<RouteContext>(
    'Executive Board',
    async (req: NextRequest, { params, session }: { params: Promise<{ id: string }>; session: ActiveAppSession }) => {
        try {
            const { id } = await params;
            // CẬP NHẬT: Lấy thêm department từ request body
            const { status, department } = await req.json();

            // Ràng buộc phải có đủ status VÀ department mới cho phép xử lý
            if (!status || !department) {
                return NextResponse.json(
                    { success: false, message: 'Status and department are required for this operation.' }, 
                    { status: 400 }
                );
            }

            const actor = {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
            };

            // CẬP NHẬT: Truyền thêm department vào hàm updateSlotBookingStatus
            const result = await updateSlotBookingStatus(id, department as DepartmentType, status, actor);
            
            if (!result.ok) {
                return NextResponse.json({ success: false, message: result.message }, { status: 400 });
            }
            
            return NextResponse.json({ success: true, slots: result.slots });
        } catch (e) {
            return NextResponse.json(
                { success: false, message: e instanceof Error ? e.message : 'Failed to update slot status.' },
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
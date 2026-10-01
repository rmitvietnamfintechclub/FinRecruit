import { NextResponse, type NextRequest } from 'next/server';
import {
    confirmCandidateBooking,
    findExistingCandidateBooking,
    getBookableSchedule,
} from '@/app/(backend)/libs/interview-scheduling/service';
import type { DepartmentType } from '@/app/(backend)/types';

export const runtime = 'nodejs';

function getClientDetails(req: NextRequest) {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]?.trim() : req.headers.get('x-real-ip') ?? undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;
    return { ip, userAgent };
}

export async function GET(req: NextRequest) {
    try {
        const department = req.nextUrl.searchParams.get('department') as DepartmentType | null;
        const email = req.nextUrl.searchParams.get('email');

        if (email) {
            const booking = await findExistingCandidateBooking(email);
            return NextResponse.json({ success: true, booking });
        }

        if (department) {
            const slots = await getBookableSchedule(department);
            return NextResponse.json({ success: true, slots });
        }

        return NextResponse.json({ success: false, message: 'Specify email or department.' }, { status: 400 });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to load booking schedule.' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const clientInfo = getClientDetails(req);

        const result = await confirmCandidateBooking(body, clientInfo);

        if (result.ok) {
            return NextResponse.json({ success: true, booking: result.booking });
        }

        if (result.reason === 'ALREADY_BOOKED') {
            return NextResponse.json(
                { success: false, reason: 'ALREADY_BOOKED', existingBooking: result.existingBooking },
                { status: 409 }
            );
        }

        if (result.reason === 'SLOT_NOT_FOUND') {
            return NextResponse.json({ success: false, reason: 'SLOT_NOT_FOUND' }, { status: 404 });
        }

        return NextResponse.json(
            {
                success: false,
                reason: 'SLOT_NO_LONGER_AVAILABLE',
                message: 'Slot no longer available.',
            },
            { status: 409 }
        );
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to confirm booking.' },
            { status: 500 }
        );
    }
}
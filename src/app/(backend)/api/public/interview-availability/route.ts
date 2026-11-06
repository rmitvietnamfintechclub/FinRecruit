import { NextResponse, type NextRequest } from 'next/server';
import {
    getActiveCohortSlots,
    submitInterviewerAvailability,
    getAvailabilityMonitorData,
} from '@/app/(backend)/libs/interview-scheduling/service';

export const runtime = 'nodejs';

function getClientDetails(req: NextRequest) {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]?.trim() : req.headers.get('x-real-ip') ?? undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;
    return { ip, userAgent };
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const email = url.searchParams.get('email');

        // BỔ SUNG: Nếu URL có query ?email=..., trả về lịch sử Availability của cá nhân đó
        if (email) {
            const records = await getAvailabilityMonitorData('all');
            const userHistory = records.availability.filter(
                (a) => a.interviewerEmail?.toLowerCase() === email.trim().toLowerCase()
            );
            return NextResponse.json({ success: true, availability: userHistory });
        }

        // Mặc định: Trả về danh sách Slots cho Public Page
        const slots = await getActiveCohortSlots();
        return NextResponse.json({ success: true, slots });
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to load data.' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const clientInfo = getClientDetails(req);

        const result = await submitInterviewerAvailability(body, clientInfo);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json(
            { success: false, message: e instanceof Error ? e.message : 'Failed to save availability.' },
            { status: 400 }
        );
    }
}
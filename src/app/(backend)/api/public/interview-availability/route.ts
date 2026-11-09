import { NextResponse, type NextRequest } from 'next/server';
import {
  submitInterviewerAvailability,
  getAvailabilityMonitorData,
} from '@/app/(backend)/libs/interview-scheduling/service';

export const runtime = 'nodejs';

function getClientDetails(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff
    ? xff.split(',')[0]?.trim()
    : (req.headers.get('x-real-ip') ?? undefined);
  const userAgent = req.headers.get('user-agent') ?? undefined;
  return { ip, userAgent };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (email) {
      const records = await getAvailabilityMonitorData();
      const userHistory = records.availability.filter(
        (a) => a.interviewerEmail?.toLowerCase() === email.trim().toLowerCase()
      );
      return NextResponse.json({ success: true, availability: userHistory });
    }

    const data = await getAvailabilityMonitorData();
    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to load data.',
      },
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
      {
        success: false,
        message:
          e instanceof Error ? e.message : 'Failed to save availability.',
      },
      { status: 400 }
    );
  }
}

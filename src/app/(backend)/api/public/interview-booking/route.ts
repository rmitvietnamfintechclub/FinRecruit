import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import {
  confirmCandidateBooking,
  findExistingCandidateBooking,
  getBookableSchedule,
} from '@/app/(backend)/libs/interview-scheduling/service';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import type { DepartmentType, ICandidate } from '@/app/(backend)/types';

export const runtime = 'nodejs';

function getClientDetails(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff
    ? xff.split(',')[0]?.trim()
    : (req.headers.get('x-real-ip') ?? undefined);
  const userAgent = req.headers.get('user-agent') ?? undefined;
  return { ip, userAgent };
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get(
      'department'
    ) as DepartmentType | null;
    const email = req.nextUrl.searchParams.get('email');

    if (email) {
      await dbConnect();
      const active = await getActiveConfig();
      const trimmedEmail = email.trim().toLowerCase();

      // 1. Kiểm tra ứng viên trong đúng Gen & Sem hiện tại
      const candidate = await Candidate.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(trimmedEmail)}$`, 'i') },
        generation: active.currentGeneration,
        semester: active.currentSemester,
      })
        .sort({ appliedAt: -1 })
        .lean<ICandidate | null>()
        .exec();

      if (!candidate) {
        return NextResponse.json({
          success: false,
          reason: 'CANDIDATE_NOT_FOUND',
          message:
            'We could not find this email in our application database. Please ensure you are using the exact student email you registered with.',
        });
      }

      // 2. Kiểm tra điều kiện Round 1
      if (candidate.status !== 'Pass') {
        return NextResponse.json({
          success: false,
          reason: 'NOT_PASSED_ROUND_1',
          message:
            'Sorry, this email is not eligible for Round 2 interview bookings according to our records.',
        });
      }

      // 3. Tìm ca phỏng vấn đã đặt (nếu có)
      const booking = await findExistingCandidateBooking(trimmedEmail);

      return NextResponse.json({
        success: true,
        candidate: {
          fullName: candidate.fullName,
          department: candidate.department,
        },
        booking,
      });
    }

    if (department) {
      const slots = await getBookableSchedule(department);
      return NextResponse.json({ success: true, slots });
    }

    return NextResponse.json(
      { success: false, message: 'Specify email or department.' },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message:
          e instanceof Error ? e.message : 'Failed to load booking schedule.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientInfo = getClientDetails(req);

    const result = await confirmCandidateBooking(body, clientInfo);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: e instanceof Error ? e.message : 'Failed to confirm booking.',
      },
      { status: 500 }
    );
  }
}

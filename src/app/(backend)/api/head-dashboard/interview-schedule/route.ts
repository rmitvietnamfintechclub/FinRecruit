import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  departmentHeadCandidateVisibilityFilter,
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import '@/app/(backend)/models/MasterInterviewSlot';

type ScheduledInterview = {
  _id: { toString(): string };
  fullName: string;
  email: string;
  department: string;
  round2Status: string;
  interviewSlotId?: {
    date: Date;
    startTime: string;
    endTime: string;
    room: string;
  } | null;
};

export const GET = withRBAC(
  ['Department Head', 'Member'],
  async (_req: NextRequest, { session }) => {
    const department = normalizeHeadDepartment(session.user.department);
    if (!department) {
      return NextResponse.json({ success: false, message: 'A valid department is required.' }, { status: 403 });
    }

    await dbConnect();
    const active = await getActiveConfig();
    const candidates = (await Candidate.find({
      ...departmentHeadCandidateVisibilityFilter(department),
      generation: active.currentGeneration,
      semester: active.currentSemester,
      status: 'Pass',
      interviewSlotId: { $ne: null },
    })
      .select('fullName email department round2Status interviewSlotId')
      .populate({
        path: 'interviewSlotId',
        select: 'date startTime endTime room',
      })
      .lean()
      .exec()) as unknown as ScheduledInterview[];

    return NextResponse.json({
      success: true,
      interviews: candidates
        .filter((candidate) => candidate.interviewSlotId)
        .map((candidate) => ({
          id: candidate._id.toString(),
          fullName: candidate.fullName,
          email: candidate.email,
          department: candidate.department,
          round2Status: candidate.round2Status,
          slot: candidate.interviewSlotId,
        }))
        .sort((a, b) => {
          const aDate = new Date(a.slot?.date ?? 0).getTime();
          const bDate = new Date(b.slot?.date ?? 0).getTime();
          return aDate - bDate;
        }),
    });
  }
);

import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  departmentHeadCandidateVisibilityFilter,
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { getActiveConfig, getOrCreateGlobalConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';

export const GET = withRBAC(
  ['Department Head', 'Member'],
  async (_req: NextRequest, { session }) => {
    const department = normalizeHeadDepartment(session.user.department);
    if (!department) {
      return NextResponse.json({ success: false, message: 'A valid department is required.' }, { status: 403 });
    }

    await dbConnect();
    const [active, config] = await Promise.all([
      getActiveConfig(),
      getOrCreateGlobalConfig(),
    ]);
    const state = config.departmentStates.find((item) => item.department === department);
    const match = {
      ...departmentHeadCandidateVisibilityFilter(department),
      generation: active.currentGeneration,
      semester: active.currentSemester,
      status: 'Pass',
    };
    const pendingFilter = {
      $and: [
        match,
        { $or: [{ round2Status: 'Pending' }, { round2Status: { $exists: false } }] },
      ],
    };
    const [total, pending, passed, failed, noShow] = await Promise.all([
      Candidate.countDocuments(match),
      Candidate.countDocuments(pendingFilter),
      Candidate.countDocuments({ ...match, round2Status: 'Pass' }),
      Candidate.countDocuments({ ...match, round2Status: 'Fail' }),
      Candidate.countDocuments({ ...match, round2Status: 'No Show' }),
    ]);

    return NextResponse.json({
      success: true,
      summary: { total, pending, passed, failed, noShow },
      isLocked: Boolean(state?.isRound2Locked),
      cohort: {
        generation: active.currentGeneration,
        semester: active.currentSemester,
      },
    });
  }
);

export const POST = withRBAC(
  'Department Head',
  async (_req: NextRequest, { session }) => {
    const department = normalizeHeadDepartment(session.user.department);
    if (!department) {
      return NextResponse.json({ success: false, message: 'A valid department is required.' }, { status: 403 });
    }

    await dbConnect();
    const active = await getActiveConfig();
    const match = {
      ...departmentHeadCandidateVisibilityFilter(department),
      generation: active.currentGeneration,
      semester: active.currentSemester,
      status: 'Pass',
    };
    const pending = await Candidate.countDocuments({
      $and: [
        match,
        { $or: [{ round2Status: 'Pending' }, { round2Status: { $exists: false } }] },
      ],
    });
    if (pending > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Resolve all pending Round 2 evaluations before locking. ${pending} remain.`,
          pending,
        },
        { status: 409 }
      );
    }

    const config = await getOrCreateGlobalConfig();
    const state = config.departmentStates.find((item) => item.department === department);
    if (!state) {
      config.departmentStates.push({
        department,
        isRound1Locked: false,
        isRound2Locked: true,
      });
    } else {
      state.isRound2Locked = true;
    }
    await config.save();

    return NextResponse.json({ success: true, isLocked: true });
  }
);

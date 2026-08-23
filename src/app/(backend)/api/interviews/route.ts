import { NextRequest, NextResponse } from 'next/server';
import Candidate from '../../models/Candidate';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import SystemConfig from '@/app/(backend)/models/SystemConfig';

export const GET = withRBAC(['Department Head', 'Member'], async (req: NextRequest, sessionUser: any) => {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url);

    // Extract query parameters with defaults
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const round2Status = searchParams.get('round2Status') || '';

    // Fetch active recruitment cycle
    const systemConfig = await SystemConfig.findOne({ configName: 'global_settings' });
    const currentGeneration = systemConfig?.currentGeneration;
    const currentSemester = systemConfig?.currentSemester;

    // Base filter scoped to the user's assigned department
    const query: Record<string, any> = {};

    if (sessionUser.role !== 'EXEC') {
      query.department = sessionUser.department;
    }

    if (currentGeneration && currentSemester) {
      query.generation = currentGeneration;
      query.semester = currentSemester;
    }

    // Filter by Round 1 or Round 2 status
    if (status && status !== 'All') {
      query.status = status;
    }
    if (round2Status && round2Status !== 'All') {
      query.round2Status = round2Status;
    }

    // Search by name or email
    if (search.trim()) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [candidates, total] = await Promise.all([
      Candidate.find(query)
        .populate('interviewSlotId', 'date startTime endTime room')
        .select('fullName email phone majorAndYear department status round2Status round2Evaluation interviewSlotId appliedAt')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Candidate.countDocuments(query),
    ]);

    // Format response array for the interviews table/list view
    const formattedCandidates = candidates.map((c: any) => ({
      id: c._id.toString(),
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      majorAndYear: c.majorAndYear,
      department: c.department,
      status: c.status,
      round2Status: c.round2Status,
      interviewSlot: c.interviewSlotId ? {
        id: c.interviewSlotId._id.toString(),
        date: c.interviewSlotId.date,
        startTime: c.interviewSlotId.startTime,
        endTime: c.interviewSlotId.endTime,
        room: c.interviewSlotId.room,
      } : null,
      evaluationSummary: {
        score: c.round2Evaluation?.score ?? null,
        hasNotes: Boolean(
          c.round2Evaluation?.notes?.note1 ||
          c.round2Evaluation?.notes?.note2 ||
          c.round2Evaluation?.notes?.note3
        ),
        adHocCount: c.round2Evaluation?.adHocQuestions?.length || 0,
      },
      appliedAt: c.appliedAt,
    }));

    return NextResponse.json({
      success: true,
      message: 'Interview candidates retrieved successfully',
      data: {
        candidates: formattedCandidates,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
});
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '../../models/Candidate';
import SystemConfig from '../../models/SystemConfig';
import { withRBAC } from '../../middleware/auth&RBAC';

export const GET = withRBAC(['Department Head', 'Member'], async (req: NextRequest, sessionUser: any) => {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const round2Status = searchParams.get('round2Status') || '';

    const query: Record<string, any> = {};

    // Department Filter 
    if (sessionUser.role !== 'EXEC' && sessionUser.department && sessionUser.department !== 'Unassigned' && sessionUser.department !== 'All') {
      query.department = sessionUser.department;
    }

    // Fetch Active System Config 
    const systemConfig = await SystemConfig.findOne({ configName: 'global_settings' });
    if (systemConfig?.currentGeneration && systemConfig?.currentSemester) {
      // query.generation = systemConfig.currentGeneration;
      // query.semester = systemConfig.currentSemester;
    }

    // Round 2 Pool Filter: Only evaluate candidates who passed Round 1 (or allow override via query param)
    const r1Status = searchParams.get('status');
    if (r1Status && r1Status !== 'All') {
      query.status = r1Status;
    } else if (!r1Status) {
      // Default to candidates eligible for Round 2 interviews
      query.status = 'Pass'; 
    }

    // Round 2 Status Filter
    if (round2Status && round2Status !== 'All') {
      query.round2Status = round2Status;
    }

    // Search
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
        .select('fullName email phone majorAndYear department status round2Status round2Evaluation interviewSlotId appliedAt generation semester')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Candidate.countDocuments(query),
    ]);

    const formattedCandidates = candidates.map((c: any) => ({
      id: c._id.toString(),
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      majorAndYear: c.majorAndYear,
      department: c.department,
      status: c.status,
      round2Status: c.round2Status,
      generation: c.generation,
      semester: c.semester,
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
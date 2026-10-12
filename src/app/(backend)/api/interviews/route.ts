import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import SystemConfig from '@/app/(backend)/models/SystemConfig';
import '@/app/(backend)/models/MasterInterviewSlot';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';

export const GET = withRBAC(
  ['Department Head', 'Member'],
  async (req: NextRequest, { session }) => {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      if (!assignedDepartment) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_DEPARTMENT',
            message:
              'Your account does not have a valid department assignment.',
          },
          { status: 403 }
        );
      }

      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const search = searchParams.get('search') || '';
      const round2Status = searchParams.get('round2Status') || '';

      const query: Record<string, unknown> = {
        department: assignedDepartment,
        status: 'Pass',
      };

      // Fetch Active System Config
      const systemConfig = await SystemConfig.findOne({
        configName: 'global_settings',
      });
      if (systemConfig?.currentGeneration && systemConfig?.currentSemester) {
        query.generation = systemConfig.currentGeneration;
        query.semester = systemConfig.currentSemester;
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
          .select(
            'fullName email phone majorAndYear department status round2Status round2Decision round2Evaluation interviewSlotId appliedAt generation semester'
          )
          .sort({ appliedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Candidate.countDocuments(query),
      ]);

      const formattedCandidates = candidates.map((c) => ({
        id: c._id.toString(),
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        majorAndYear: c.majorAndYear,
        department: c.department,
        status: c.status,
        round2Status: c.round2Status,
        round2Decision: c.round2Decision ?? null,
        generation: c.generation,
        semester: c.semester,
        interviewSlot: c.interviewSlotId
          ? {
              id: c.interviewSlotId._id.toString(),
              date: c.interviewSlotId.date,
              startTime: c.interviewSlotId.startTime,
              endTime: c.interviewSlotId.endTime,
              room: c.interviewSlotId.room,
            }
          : null,
        evaluationSummary: {
          score: c.round2Evaluation?.score ?? null,
          hasNotes: Boolean(
            c.round2Evaluation?.notes?.note1 ||
            c.round2Evaluation?.notes?.note2 ||
            c.round2Evaluation?.notes?.note3 ||
            c.round2Evaluation?.collaborativeNotes?.some(
              (note: { content?: string }) => Boolean(note.content?.trim())
            )
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
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          code: 'SERVER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Could not retrieve interview candidates.',
        },
        { status: 500 }
      );
    }
  }
);

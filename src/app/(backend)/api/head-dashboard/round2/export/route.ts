import { NextResponse, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
  departmentHeadCandidateVisibilityFilter,
  normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import '@/app/(backend)/models/MasterInterviewSlot';

export const runtime = 'nodejs';

type ExportCandidate = {
  fullName: string;
  email: string;
  department: string;
  round2Status: string;
  round2Evaluation?: { score?: number | null };
  interviewSlotId?: {
    date: Date;
    startTime: string;
    endTime: string;
    room: string;
  } | null;
};

export const GET = withRBAC(
  'Department Head',
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
    })
      .select('fullName email department round2Status round2Evaluation.score interviewSlotId')
      .populate({
        path: 'interviewSlotId',
        select: 'date startTime endTime room',
      })
      .sort({ fullName: 1 })
      .lean()
      .exec()) as unknown as ExportCandidate[];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Round 2 Evaluation');
    worksheet.columns = [
      { header: 'Candidate', key: 'candidate', width: 28 },
      { header: 'Email', key: 'email', width: 34 },
      { header: 'Department', key: 'department', width: 28 },
      { header: 'Interview Date', key: 'date', width: 18 },
      { header: 'Time', key: 'time', width: 20 },
      { header: 'Room', key: 'room', width: 18 },
      { header: 'Round 2 Status', key: 'status', width: 18 },
      { header: 'Score', key: 'score', width: 12 },
    ];
    worksheet.getRow(1).font = { bold: true };
    for (const candidate of candidates) {
      const slot = candidate.interviewSlotId;
      worksheet.addRow({
        candidate: candidate.fullName,
        email: candidate.email,
        department: candidate.department,
        date: slot?.date ? new Date(slot.date).toLocaleDateString('en-CA') : '',
        time: slot ? `${slot.startTime} - ${slot.endTime}` : '',
        room: slot?.room ?? '',
        status: candidate.round2Status,
        score: candidate.round2Evaluation?.score ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Round2_${department.replaceAll(' ', '_')}_${active.currentSemester}.xlsx"`,
      },
    });
  }
);

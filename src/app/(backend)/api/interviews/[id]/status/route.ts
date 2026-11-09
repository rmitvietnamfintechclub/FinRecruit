import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import type { StatusType } from '@/app/(backend)/types';

type InterviewStatusRouteContext = {
  params: Promise<{ id: string }>;
};

// CHỈ CÒN ĐÚNG 'Department Head' ĐƯỢC PHÉP CHỐT KẾT QUẢ
export const PATCH = withRBAC<InterviewStatusRouteContext>(
  'Department Head',
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as {
        round2Status?: unknown;
      };

      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      // 1. Kiểm tra quyền hạn phòng ban (Bắt buộc phải có ban hợp lệ)
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

      // 2. Kiểm tra ID ứng viên
      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_CANDIDATE_ID',
            message: 'A valid candidate ID is required.',
          },
          { status: 400 }
        );
      }

      const round2Status = body.round2Status as StatusType | undefined;

      // 3. Chỉ chấp nhận Pass, Fail, Pending
      if (
        !round2Status ||
        !['Pass', 'Pending', 'Fail'].includes(round2Status)
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_STATUS',
            message: 'Invalid status. Must be Pass, Pending, or Fail.',
          },
          { status: 400 }
        );
      }

      // 4. Xây dựng Query bảo mật
      const candidateQuery: Record<string, unknown> = {
        _id: candidateId,
        status: 'Pass', // Bắt buộc phải pass vòng 1
        department: assignedDepartment, // Bắt buộc phải thuộc ban của Head này
      };

      // 5. Cập nhật Status duy nhất
      const updatedCandidate = await Candidate.findOneAndUpdate(
        candidateQuery,
        {
          $set: { round2Status },
        },
        { new: true, runValidators: true }
      );

      if (!updatedCandidate) {
        return NextResponse.json(
          {
            success: false,
            code: 'CANDIDATE_NOT_FOUND',
            message:
              'Candidate not found or does not belong to your department.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Candidate Round 2 status set to ${round2Status}`,
        data: {
          id: updatedCandidate.id,
          round2Status: updatedCandidate.round2Status,
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
              : 'Could not update the Round 2 status.',
        },
        { status: 500 }
      );
    }
  }
);

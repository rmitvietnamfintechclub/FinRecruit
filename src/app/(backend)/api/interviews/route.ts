import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';

export const GET = withRBAC(
  ['Department Head', 'Member', 'Executive Board'],
  async (req: NextRequest, { session }) => {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      // Bypass cho EB, bắt lỗi phòng ban cho các role khác
      if (!isExecutive && !assignedDepartment) {
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

      // Xây dựng điều kiện lọc (Query Match)
      const query: Record<string, unknown> = {
        status: 'Pass', // Ứng viên phải pass R1
      };

      if (!isExecutive) {
        query.department = assignedDepartment;
      }

      if (round2Status && round2Status !== 'All') {
        query.round2Status = round2Status;
      }

      if (search.trim()) {
        query.$or = [
          { fullName: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      // ĐÃ DỌN DẸP: Dùng `.find()` thay vì Aggregation đắt đỏ vì không cần lấy Slot nữa
      const [candidates, total] = await Promise.all([
        Candidate.find(query)
          .select(
            'fullName email phone majorAndYear department status round2Status round2Evaluation appliedAt'
          )
          .sort({ appliedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        Candidate.countDocuments(query),
      ]);

      // Định dạng lại kết quả trả về
      const formattedCandidates = candidates.map((c) => ({
        id: c._id.toString(),
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        majorAndYear: c.majorAndYear,
        department: c.department,
        status: c.status,
        round2Status: c.round2Status,
        evaluationSummary: {
          hasNotes: Boolean(
            c.round2Evaluation?.generalNotes?.some(
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

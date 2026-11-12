import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import { reconcileTemplateAnswers } from '@/app/(backend)/libs/round2Evaluation';
import MasterInterviewSlot from '@/app/(backend)/models/MasterInterviewSlot';
import type { ICollaborativeNote, ICustomAnswer } from '@/app/(backend)/types';

type InterviewRouteContext = {
  params: Promise<{ id: string }>;
};

// Hàm helper để sort notes từ cũ đến mới (chuẩn UI Chat)
const sortNotes = (notes?: ICollaborativeNote[]) =>
  (notes || []).sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );

export const GET = withRBAC<InterviewRouteContext>(
  ['Department Head', 'Member', 'Executive Board'],
  async (_req: NextRequest, { session, params }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

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

      const query: Record<string, unknown> = {
        _id: candidateId,
        status: 'Pass',
      };

      if (!isExecutive) {
        query.department = assignedDepartment;
      }

      const candidate = await Candidate.findOne(query).lean().exec();

      if (!candidate) {
        return NextResponse.json(
          {
            success: false,
            code: 'CANDIDATE_NOT_FOUND',
            message: 'Candidate not found',
          },
          { status: 404 }
        );
      }

      // TRA CỨU TRẠNG THÁI SLOT THỰC TẾ TỪ MASTER INTERVIEW SLOT
      let slotStatus = null;
      if (candidate.interviewSlotId) {
        const masterSlot = await MasterInterviewSlot.findById(
          candidate.interviewSlotId
        )
          .lean()
          .exec();

        if (masterSlot && Array.isArray(masterSlot.bookings)) {
          const booking = masterSlot.bookings.find(
            (b: {
              candidateId?: { toString: () => string } | string;
              department?: string;
              status?: string;
            }) =>
              b.candidateId &&
              b.candidateId.toString() === candidate._id.toString() &&
              b.department === candidate.department
          );
          if (booking) {
            slotStatus = booking.status;
          }
        }
      }

      const deptConfig = await DepartmentConfig.findOne({
        department: candidate.department,
        generation: candidate.generation,
        semester: candidate.semester,
      });

      const storedTemplateAnswers = (candidate.round2Evaluation
        ?.templateAnswers || []) as ICustomAnswer[];

      const deletedTemplates = (candidate.round2Evaluation
        ?.deletedTemplateQuestions || []) as string[];

      let templateAnswers = storedTemplateAnswers;
      if (deptConfig) {
        const reconciled = reconcileTemplateAnswers(
          deptConfig.interviewQuestions || [],
          storedTemplateAnswers
        );

        templateAnswers = reconciled.filter(
          (q) => !deletedTemplates.includes(q.question)
        );
      }

      // Ép kiểu thuần túy (Deep Clone) để ngắt tham chiếu với Mongoose Document
      const formattedTemplateAnswers = templateAnswers.map((q) => {
        const rawNotes = Array.isArray(q.collaborativeNotes)
          ? q.collaborativeNotes
          : [];
        return {
          question: q.question,
          isEdited: Boolean(q.isEdited),
          collaborativeNotes: sortNotes(rawNotes as ICollaborativeNote[]),
        };
      });

      // Xử lý chuẩn hóa và sort notes cho Ad-hoc Questions
      const rawAdHoc = (candidate.round2Evaluation?.adHocQuestions ||
        []) as ICustomAnswer[];
      const formattedAdHocQuestions = rawAdHoc.map((q) => ({
        question: q.question,
        addedBy: q.addedBy,
        isEdited: Boolean(q.isEdited),
        collaborativeNotes: sortNotes(
          q.collaborativeNotes as ICollaborativeNote[]
        ),
      }));

      // Lấy toàn bộ General Notes của TẤT CẢ mọi người và sort
      const allGeneralNotes = sortNotes(
        candidate.round2Evaluation?.generalNotes as ICollaborativeNote[]
      );

      const payload = {
        id: candidate._id.toString(),
        fullName: candidate.fullName,
        email: candidate.email,
        dob: candidate.dob,
        phone: candidate.phone,
        majorAndYear: candidate.majorAndYear,
        facebookLink: candidate.facebookLink,
        cvLink: candidate.cvLink,
        generalAnswers: candidate.generalAnswers,
        customAnswers: candidate.customAnswers,
        department: candidate.department,
        status: candidate.status,
        round2Status: candidate.round2Status,
        interviewSlotId: candidate.interviewSlotId
          ? candidate.interviewSlotId.toString()
          : undefined,
        interviewSlotStatus: slotStatus, // Đã có giá trị trạng thái slot chuẩn xác
        evaluation: {
          templateAnswers: formattedTemplateAnswers,
          adHocQuestions: formattedAdHocQuestions,
          generalNotes: allGeneralNotes,
        },
      };

      return NextResponse.json({
        success: true,
        message: 'Cockpit candidate data retrieved',
        data: payload,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          code: 'SERVER_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Could not retrieve cockpit candidate data.',
        },
        { status: 500 }
      );
    }
  }
);

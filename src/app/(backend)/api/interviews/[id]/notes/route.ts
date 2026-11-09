import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import type { ICollaborativeNote } from '@/app/(backend)/types';

type InterviewNotesRouteContext = {
  params: Promise<{ id: string }>;
};

// Định nghĩa Interface thay cho 'any'
interface IDbQuestion {
  id?: string;
  question: string;
  addedBy?: string;
  collaborativeNotes?: ICollaborativeNote[];
}

interface IPayloadQuestion {
  question?: unknown;
  addedBy?: unknown;
  collaborativeNotes?: unknown;
}

interface ICurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ---------------------------------------------------------
// HELPER: UPSERT NOTE (Tránh ghi đè note của người khác)
// ---------------------------------------------------------
function upsertUserNoteInArray(
  notesArray: ICollaborativeNote[],
  currentUser: ICurrentUser,
  newContent: string
) {
  const existingNote = notesArray.find(
    (n) => String(n.authorId) === currentUser.id
  );

  if (existingNote) {
    existingNote.content = newContent;
    existingNote.updatedAt = new Date();
    existingNote.authorName = currentUser.name;
    existingNote.role = currentUser.role as ICollaborativeNote['role'];
  } else {
    notesArray.push({
      authorId: currentUser.id,
      authorEmail: currentUser.email,
      authorName: currentUser.name,
      role: currentUser.role as ICollaborativeNote['role'],
      content: newContent,
      updatedAt: new Date(),
    });
  }
}

// ---------------------------------------------------------
// GET API - LẤY TOÀN BỘ GHI CHÚ
// ---------------------------------------------------------
export const GET = withRBAC<InterviewNotesRouteContext>(
  ['Department Head', 'Member', 'Executive Board'],
  async (_req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      if (!isExecutive && !assignedDepartment) {
        return NextResponse.json(
          { success: false, message: 'Invalid department' },
          { status: 403 }
        );
      }

      if (!mongoose.Types.ObjectId.isValid(candidateId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid candidate ID' },
          { status: 400 }
        );
      }

      const query: Record<string, unknown> = {
        _id: candidateId,
        status: 'Pass',
      };
      if (!isExecutive) query.department = assignedDepartment;

      const candidate = await Candidate.findOne(query).lean().exec();

      if (!candidate) {
        return NextResponse.json(
          { success: false, message: 'Candidate not found.' },
          { status: 404 }
        );
      }

      const sortNotes = (notes?: ICollaborativeNote[]) =>
        (notes || []).sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );

      const templateAnswers =
        (candidate.round2Evaluation?.templateAnswers as
          | IDbQuestion[]
          | undefined) || [];
      const adHocQuestions =
        (candidate.round2Evaluation?.adHocQuestions as
          | IDbQuestion[]
          | undefined) || [];

      const data = {
        generalNotes: sortNotes(candidate.round2Evaluation?.generalNotes),
        templateAnswers: templateAnswers.map((q) => ({
          id: q.id,
          question: q.question,
          collaborativeNotes: sortNotes(q.collaborativeNotes),
        })),
        adHocQuestions: adHocQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          addedBy: q.addedBy,
          collaborativeNotes: sortNotes(q.collaborativeNotes),
        })),
      };

      return NextResponse.json({ success: true, data });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, message: 'Server error' },
        { status: 500 }
      );
    }
  }
);

// ---------------------------------------------------------
// PATCH API - LƯU DỮ LIỆU BẢO TOÀN (CONCURRENCY SAFE)
// ---------------------------------------------------------
export const PATCH = withRBAC<InterviewNotesRouteContext>(
  ['Department Head', 'Member', 'Executive Board'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );

      if (!isExecutive && !assignedDepartment) {
        return NextResponse.json(
          { success: false, message: 'Invalid department' },
          { status: 403 }
        );
      }

      const body = (await req.json()) as Record<string, unknown>;

      const candidateScope: Record<string, unknown> = {
        _id: candidateId,
        status: 'Pass',
      };
      if (!isExecutive) candidateScope.department = assignedDepartment;

      const candidate = await Candidate.findOne(candidateScope);
      if (!candidate) {
        return NextResponse.json(
          { success: false, message: 'Candidate not found.' },
          { status: 404 }
        );
      }

      if (!candidate.round2Evaluation) {
        candidate.round2Evaluation = {
          templateAnswers: [],
          adHocQuestions: [],
          generalNotes: [],
        };
      }

      const currentUser: ICurrentUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name?.trim() || session.user.email.split('@')[0],
        role: session.user.role,
      };

      let isModified = false;

      // 1. CẬP NHẬT GENERAL NOTE
      if (
        body.generalNote !== undefined &&
        typeof body.generalNote === 'string'
      ) {
        if (!candidate.round2Evaluation.generalNotes) {
          candidate.round2Evaluation.generalNotes = [];
        }
        upsertUserNoteInArray(
          candidate.round2Evaluation.generalNotes,
          currentUser,
          body.generalNote
        );
        isModified = true;
      }

      // 2. CẬP NHẬT TEMPLATE ANSWERS
      if (Array.isArray(body.templateAnswers)) {
        if (!candidate.round2Evaluation.templateAnswers) {
          candidate.round2Evaluation.templateAnswers = [];
        }

        const templateDb = candidate.round2Evaluation
          .templateAnswers as IDbQuestion[];

        for (const rawPayloadItem of body.templateAnswers) {
          const payloadItem = rawPayloadItem as IPayloadQuestion;
          if (typeof payloadItem.question !== 'string') continue;

          let dbItem = templateDb.find(
            (q) => q.question === payloadItem.question
          );

          if (!dbItem) {
            dbItem = {
              question: payloadItem.question,
              collaborativeNotes: [],
            };
            templateDb.push(dbItem);
          }
          if (!dbItem.collaborativeNotes) dbItem.collaborativeNotes = [];

          let currentUserPayloadNote: Partial<ICollaborativeNote> | null = null;

          if (Array.isArray(payloadItem.collaborativeNotes)) {
            currentUserPayloadNote =
              (payloadItem.collaborativeNotes.find(
                (n) =>
                  n &&
                  typeof n === 'object' &&
                  String((n as Record<string, unknown>).authorId) ===
                    currentUser.id
              ) as Partial<ICollaborativeNote> | undefined) || null;
          }

          if (
            currentUserPayloadNote &&
            typeof currentUserPayloadNote.content === 'string'
          ) {
            upsertUserNoteInArray(
              dbItem.collaborativeNotes,
              currentUser,
              currentUserPayloadNote.content
            );
            isModified = true;
          }
        }
      }

      // 3. CẬP NHẬT AD-HOC QUESTIONS
      if (Array.isArray(body.adHocQuestions)) {
        if (!candidate.round2Evaluation.adHocQuestions) {
          candidate.round2Evaluation.adHocQuestions = [];
        }

        const adHocDb = candidate.round2Evaluation
          .adHocQuestions as IDbQuestion[];

        for (const rawPayloadItem of body.adHocQuestions) {
          const payloadItem = rawPayloadItem as IPayloadQuestion;
          if (typeof payloadItem.question !== 'string') continue;

          let dbItem = adHocDb.find((q) => q.question === payloadItem.question);

          if (!dbItem) {
            dbItem = {
              question: payloadItem.question,
              addedBy:
                typeof payloadItem.addedBy === 'string'
                  ? payloadItem.addedBy
                  : undefined,
              collaborativeNotes: [],
            };
            adHocDb.push(dbItem);
          }
          if (!dbItem.collaborativeNotes) dbItem.collaborativeNotes = [];

          let currentUserPayloadNote: Partial<ICollaborativeNote> | null = null;

          if (Array.isArray(payloadItem.collaborativeNotes)) {
            currentUserPayloadNote =
              (payloadItem.collaborativeNotes.find(
                (n) =>
                  n &&
                  typeof n === 'object' &&
                  String((n as Record<string, unknown>).authorId) ===
                    currentUser.id
              ) as Partial<ICollaborativeNote> | undefined) || null;
          }

          if (
            currentUserPayloadNote &&
            typeof currentUserPayloadNote.content === 'string'
          ) {
            upsertUserNoteInArray(
              dbItem.collaborativeNotes,
              currentUser,
              currentUserPayloadNote.content
            );
            isModified = true;
          }
        }
      }

      if (isModified) {
        candidate.markModified('round2Evaluation');
        await candidate.save();
      }

      const sortNotes = (notes?: ICollaborativeNote[]) =>
        (notes || []).sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );

      const updatedTemplateAnswers = (
        candidate.round2Evaluation.templateAnswers as IDbQuestion[]
      ).map((q) => ({
        question: q.question,
        collaborativeNotes: sortNotes(q.collaborativeNotes),
      }));

      const updatedAdHocQuestions = (
        candidate.round2Evaluation.adHocQuestions as IDbQuestion[]
      ).map((q) => ({
        question: q.question,
        addedBy: q.addedBy,
        collaborativeNotes: sortNotes(q.collaborativeNotes),
      }));

      return NextResponse.json({
        success: true,
        data: {
          generalNotes: sortNotes(candidate.round2Evaluation.generalNotes),
          templateAnswers: updatedTemplateAnswers,
          adHocQuestions: updatedAdHocQuestions,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, message: 'Server error' },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withRBAC<InterviewNotesRouteContext>(
  ['Department Head'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const questionId =
        typeof body.questionId === 'string' ? body.questionId : '';
      const type = typeof body.type === 'string' ? body.type : '';

      const assignedDepartment = normalizeHeadDepartment(
        session.user.department
      );
      if (!assignedDepartment)
        return NextResponse.json({ success: false }, { status: 403 });

      const candidate = await Candidate.findOne({
        _id: candidateId,
        department: assignedDepartment,
        status: 'Pass',
      });

      if (!candidate || !candidate.round2Evaluation) {
        return NextResponse.json({ success: false }, { status: 404 });
      }

      if (type === 'template') {
        const idx = parseInt(questionId.split('-').pop() || '1') - 1;
        const templateAnswers = candidate.round2Evaluation
          .templateAnswers as IDbQuestion[];

        if (idx >= 0 && idx < templateAnswers.length) {
          // Lấy nội dung câu hỏi chuẩn bị xóa
          const deletedQuestionText = templateAnswers[idx].question;

          // Xóa câu hỏi khỏi mảng trên RAM
          templateAnswers.splice(idx, 1);

          // DÙNG $push VÀ $set ĐỂ ÉP MONGODB LƯU (Trị được cả document cũ)
          await Candidate.updateOne(
            { _id: candidateId },
            {
              $set: { 'round2Evaluation.templateAnswers': templateAnswers },
              $push: {
                'round2Evaluation.deletedTemplateQuestions':
                  deletedQuestionText,
              },
            }
          );
        }

        const sortNotes = (notes?: ICollaborativeNote[]) =>
          (notes || []).sort(
            (a, b) =>
              new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          );

        const updatedTemplates = templateAnswers.map((q) => ({
          question: q.question,
          collaborativeNotes: sortNotes(q.collaborativeNotes),
        }));

        return NextResponse.json({
          success: true,
          data: { templateAnswers: updatedTemplates },
        });
      }

      return NextResponse.json(
        { success: false, message: 'Invalid type' },
        { status: 400 }
      );
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Server Error',
        },
        { status: 500 }
      );
    }
  }
);

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import type { ICollaborativeNote, IQuestionAuthor } from '@/app/(backend)/types';

type InterviewAdHocRouteContext = {
  params: Promise<{ id: string }>;
};

interface IDbQuestion {
  id?: string;
  question: string;
  addedBy?: IQuestionAuthor | string;
  isEdited?: boolean;
  collaborativeNotes?: ICollaborativeNote[];
}

const sortNotes = (notes?: ICollaborativeNote[]) =>
  (notes || []).sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );

// Helper kiểm tra quyền sửa/xóa câu hỏi
function canModifyQuestion(
  question: IDbQuestion,
  user: { email: string; role: string }
): boolean {
  if (user.role === 'Department Head') return true;
  if (!question.addedBy) return false;

  const authorEmail =
    typeof question.addedBy === 'string'
      ? question.addedBy
      : question.addedBy.email;

  return authorEmail?.toLowerCase() === user.email.toLowerCase();
}

// ==========================================
// POST: THÊM CÂU HỎI AD-HOC (HEAD, MEMBER, EB)
// ==========================================
export const POST = withRBAC<InterviewAdHocRouteContext>(
  ['Department Head', 'Member', 'Executive Board'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const question = body.question;

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(session.user.department);

      if (!isExecutive && !assignedDepartment) {
        return NextResponse.json({ success: false, message: 'Invalid department' }, { status: 403 });
      }

      if (typeof question !== 'string' || !question.trim()) {
        return NextResponse.json({ success: false, message: 'Question content required' }, { status: 400 });
      }

      const adHocItem = {
        question: question.trim(),
        answer: '',
        isEdited: false,
        addedBy: {
          name: session.user.name?.trim() || session.user.email.split('@')[0],
          email: session.user.email,
          role: session.user.role,
        },
        collaborativeNotes: [],
      };

      const filter: Record<string, unknown> = { _id: candidateId, status: 'Pass' };
      if (!isExecutive) filter.department = assignedDepartment;

      const updatedCandidate = await Candidate.findOneAndUpdate(
        filter,
        { $push: { 'round2Evaluation.adHocQuestions': adHocItem } },
        { returnDocument: 'after' }
      );

      if (!updatedCandidate) {
        return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
      }

      const rawAdHoc = (updatedCandidate.round2Evaluation?.adHocQuestions as IDbQuestion[]) || [];
      const updatedAdHoc = rawAdHoc.map((q) => ({
        question: q.question,
        addedBy: q.addedBy,
        isEdited: Boolean(q.isEdited),
        collaborativeNotes: sortNotes(q.collaborativeNotes),
      }));

      return NextResponse.json({ success: true, data: updatedAdHoc });
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : 'Server Error' },
        { status: 500 }
      );
    }
  }
);

// ==========================================
// PATCH: SỬA CÂU HỎI AD-HOC (HEAD HOẶC CHỦ SỞ HỮU)
// ==========================================
export const PATCH = withRBAC<InterviewAdHocRouteContext>(
  ['Department Head', 'Member', 'Executive Board'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const questionId = typeof body.questionId === 'string' ? body.questionId : '';
      const newText = typeof body.newText === 'string' ? body.newText : '';

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(session.user.department);

      if (!isExecutive && !assignedDepartment) {
        return NextResponse.json({ success: false, message: 'Invalid department' }, { status: 403 });
      }

      const filter: Record<string, unknown> = { _id: candidateId, status: 'Pass' };
      if (!isExecutive) filter.department = assignedDepartment;

      const candidate = await Candidate.findOne(filter);
      if (!candidate || !candidate.round2Evaluation) {
        return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
      }

      const adHocQuestions = candidate.round2Evaluation.adHocQuestions as IDbQuestion[];
      let targetIdx = -1;

      if (questionId.startsWith('ad-hoc-')) {
        const idx = parseInt(questionId.split('-').pop() || '0', 10) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < adHocQuestions.length) targetIdx = idx;
      } else {
        targetIdx = adHocQuestions.findIndex((q) => q.question === questionId);
      }

      if (targetIdx === -1) {
        return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 });
      }

      // Kiểm tra quyền sở hữu
      if (!canModifyQuestion(adHocQuestions[targetIdx], session.user)) {
        return NextResponse.json(
          { success: false, message: 'You can only edit questions created by yourself.' },
          { status: 403 }
        );
      }

      const trimmedNewText = newText.trim();
      if (trimmedNewText && adHocQuestions[targetIdx].question !== trimmedNewText) {
        adHocQuestions[targetIdx].question = trimmedNewText;
        adHocQuestions[targetIdx].isEdited = true; // Bật cờ signal đã chỉnh sửa
        candidate.markModified('round2Evaluation');
        await candidate.save();
      }

      const updatedAdHoc = adHocQuestions.map((q) => ({
        question: q.question,
        addedBy: q.addedBy,
        isEdited: Boolean(q.isEdited),
        collaborativeNotes: sortNotes(q.collaborativeNotes),
      }));

      return NextResponse.json({ success: true, data: { adHocQuestions: updatedAdHoc } });
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : 'Server Error' },
        { status: 500 }
      );
    }
  }
);

// ==========================================
// DELETE: XÓA CÂU HỎI AD-HOC (HEAD HOẶC CHỦ SỞ HỮU)
// ==========================================
export const DELETE = withRBAC<InterviewAdHocRouteContext>(
  ['Department Head', 'Member', 'Executive Board'],
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const questionId = typeof body.questionId === 'string' ? body.questionId : '';

      const isExecutive = session.user.role === 'Executive Board';
      const assignedDepartment = normalizeHeadDepartment(session.user.department);

      if (!isExecutive && !assignedDepartment) {
        return NextResponse.json({ success: false, message: 'Invalid department' }, { status: 403 });
      }

      const filter: Record<string, unknown> = { _id: candidateId, status: 'Pass' };
      if (!isExecutive) filter.department = assignedDepartment;

      const candidate = await Candidate.findOne(filter);
      if (!candidate || !candidate.round2Evaluation) {
        return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
      }

      const adHocQuestions = candidate.round2Evaluation.adHocQuestions as IDbQuestion[];
      const idx = parseInt(questionId.split('-').pop() || '0', 10) - 1;

      if (idx < 0 || idx >= adHocQuestions.length) {
        return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 });
      }

      // Kiểm tra quyền sở hữu
      if (!canModifyQuestion(adHocQuestions[idx], session.user)) {
        return NextResponse.json(
          { success: false, message: 'You can only delete questions created by yourself.' },
          { status: 403 }
        );
      }

      adHocQuestions.splice(idx, 1);
      candidate.markModified('round2Evaluation');
      await candidate.save();

      const updatedAdHoc = adHocQuestions.map((q) => ({
        question: q.question,
        addedBy: q.addedBy,
        isEdited: Boolean(q.isEdited),
        collaborativeNotes: sortNotes(q.collaborativeNotes),
      }));

      return NextResponse.json({ success: true, data: { adHocQuestions: updatedAdHoc } });
    } catch (error: unknown) {
      return NextResponse.json(
        { success: false, message: error instanceof Error ? error.message : 'Server Error' },
        { status: 500 }
      );
    }
  }
);
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import type { ICollaborativeNote } from '@/app/(backend)/types';

type InterviewAdHocRouteContext = {
  params: Promise<{ id: string }>;
};

// Định nghĩa Interface chuẩn xác thay cho any
interface IDbQuestion {
  id?: string;
  question: string;
  addedBy?: string;
  collaborativeNotes?: ICollaborativeNote[];
}

// Hàm helper để sort notes (chuẩn UI Chat)
const sortNotes = (notes?: ICollaborativeNote[]) =>
  (notes || []).sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );

// ==========================================
// POST: THÊM CÂU HỎI AD-HOC MỚI
// ==========================================
export const POST = withRBAC<InterviewAdHocRouteContext>(
  'Department Head',
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const question = body.question;
      
      const assignedDepartment = normalizeHeadDepartment(session.user.department);
      if (!assignedDepartment) {
        return NextResponse.json({ success: false, message: 'Invalid department' }, { status: 403 });
      }

      if (typeof question !== 'string' || !question.trim()) {
        return NextResponse.json({ success: false, message: 'Question content required' }, { status: 400 });
      }

      const adHocItem = {
        question: question.trim(),
        answer: '',
        addedBy: session.user.email,
        collaborativeNotes: [],
      };

      const updatedCandidate = await Candidate.findOneAndUpdate(
        { _id: candidateId, department: assignedDepartment, status: 'Pass' },
        { $push: { 'round2Evaluation.adHocQuestions': adHocItem } },
        { new: true }
      );

      if (!updatedCandidate) {
        return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
      }

      const rawAdHoc = (updatedCandidate.round2Evaluation?.adHocQuestions as IDbQuestion[]) || [];
      const updatedAdHoc = rawAdHoc.map((q) => ({
        question: q.question,
        addedBy: q.addedBy,
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
// PATCH: SỬA TEXT CỦA CÂU HỎI AD-HOC
// ==========================================
export const PATCH = withRBAC<InterviewAdHocRouteContext>(
  'Department Head',
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const questionId = typeof body.questionId === 'string' ? body.questionId : '';
      const newText = typeof body.newText === 'string' ? body.newText : '';
      
      const assignedDepartment = normalizeHeadDepartment(session.user.department);
      if (!assignedDepartment) return NextResponse.json({ success: false }, { status: 403 });
      
      const candidate = await Candidate.findOne({ _id: candidateId, department: assignedDepartment, status: 'Pass' });
      if (!candidate || !candidate.round2Evaluation) return NextResponse.json({ success: false }, { status: 404 });

      let isModified = false;
      const adHocQuestions = candidate.round2Evaluation.adHocQuestions as IDbQuestion[];

      // Tìm và sửa chuẩn xác theo dạng ID 'ad-hoc-X' mà client truyền lên
      if (questionId.startsWith('ad-hoc-')) {
        const parts = questionId.split('-');
        if (parts.length > 0) {
          const idx = parseInt(parts[parts.length - 1], 10) - 1;
          if (!isNaN(idx) && idx >= 0 && idx < adHocQuestions.length) {
            adHocQuestions[idx].question = newText.trim();
            isModified = true;
          }
        }
      } else {
        // Fallback: Nếu questionId chính là text của câu hỏi
        const targetQ = adHocQuestions.find((q) => q.question === questionId);
        if (targetQ) {
          targetQ.question = newText.trim();
          isModified = true;
        }
      }

      if (isModified) {
        candidate.markModified('round2Evaluation');
        await candidate.save();
      }

      const updatedAdHoc = adHocQuestions.map((q) => ({
        question: q.question, 
        addedBy: q.addedBy, 
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
// DELETE: XÓA CÂU HỎI AD-HOC
// ==========================================
export const DELETE = withRBAC<InterviewAdHocRouteContext>(
  'Department Head',
  async (req: NextRequest, { params, session }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const questionId = typeof body.questionId === 'string' ? body.questionId : '';
      
      const assignedDepartment = normalizeHeadDepartment(session.user.department);
      if (!assignedDepartment) return NextResponse.json({ success: false }, { status: 403 });

      const candidate = await Candidate.findOne({ _id: candidateId, department: assignedDepartment, status: 'Pass' });
      if (!candidate || !candidate.round2Evaluation) return NextResponse.json({ success: false }, { status: 404 });

      const adHocQuestions = candidate.round2Evaluation.adHocQuestions as IDbQuestion[];
      const idx = parseInt(questionId.split('-').pop() || '1') - 1;
      
      if (idx >= 0 && idx < adHocQuestions.length) {
        adHocQuestions.splice(idx, 1);
        candidate.markModified('round2Evaluation');
        await candidate.save();
      }

      const updatedAdHoc = adHocQuestions.map((q) => ({
        question: q.question, 
        addedBy: q.addedBy, 
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
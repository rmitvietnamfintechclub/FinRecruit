import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';

type InterviewRouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withRBAC<InterviewRouteContext>(
  ['Department Head', 'Member'],
  async (_req: NextRequest, { session, params }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;

      const candidate = await Candidate.findById(candidateId);
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

      // Verify departmental access for non-EXEC users
      if (
        session.user.role !== 'Executive Board' &&
        candidate.department !== session.user.department
      ) {
        return NextResponse.json(
          {
            success: false,
            code: 'FORBIDDEN',
            message: 'Access denied for this department candidate',
          },
          { status: 403 }
        );
      }

      // Fetch department question template & scoring toggle
      const deptConfig = await DepartmentConfig.findOne({
        department: candidate.department,
        generation: candidate.generation,
        semester: candidate.semester,
      });

      const isScoringEnabled = deptConfig?.isScoringEnabled ?? false;
      const templateQuestions = deptConfig?.interviewQuestions || [];

      // Map template answers if empty
      let templateAnswers = candidate.round2Evaluation?.templateAnswers || [];
      if (templateAnswers.length === 0 && templateQuestions.length > 0) {
        templateAnswers = templateQuestions.map((q: string) => ({
          question: q,
          answer: '',
        }));
      }

      const payload = {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        majorAndYear: candidate.majorAndYear,
        facebookLink: candidate.facebookLink,
        cvLink: candidate.cvLink,
        generalAnswers: candidate.generalAnswers,
        customAnswers: candidate.customAnswers,
        department: candidate.department,
        status: candidate.status,
        round2Status: candidate.round2Status,
        evaluation: {
          isScoringEnabled,
          templateAnswers,
          adHocQuestions: candidate.round2Evaluation?.adHocQuestions || [],
          notes: candidate.round2Evaluation?.notes || {
            note1: '',
            note2: '',
            note3: '',
          },
          score: candidate.round2Evaluation?.score ?? null,
        },
      };

      return NextResponse.json({
        success: true,
        message: 'Cockpit candidate data retrieved',
        data: payload,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, code: 'SERVER_ERROR', message: error.message },
        { status: 500 }
      );
    }
  }
);

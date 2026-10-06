import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import '@/app/(backend)/models/MasterInterviewSlot';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import {
  calculateOverallScore,
  reconcileTemplateAnswers,
} from '@/app/(backend)/libs/round2Evaluation';
import type { ICustomAnswer } from '@/app/(backend)/types';

type InterviewRouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withRBAC<InterviewRouteContext>(
  ['Department Head', 'Member'],
  async (_req: NextRequest, { session, params }) => {
    try {
      await dbConnect();
      const { id: candidateId } = await params;
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

      const candidate = await Candidate.findOne({
        _id: candidateId,
        department: assignedDepartment,
        status: 'Pass',
      });
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

      // Fetch department question template & scoring toggle
      const deptConfig = await DepartmentConfig.findOne({
        department: candidate.department,
        generation: candidate.generation,
        semester: candidate.semester,
      });

      const isScoringEnabled = deptConfig?.isScoringEnabled ?? false;
      const storedTemplateAnswers = (candidate.round2Evaluation
        ?.templateAnswers || []) as ICustomAnswer[];
      let templateAnswers = storedTemplateAnswers;

      // A saved DepartmentConfig is the source of truth for the current
      // template. Reuse answers for unchanged questions, add blank answers for
      // new questions, and omit questions removed by Save & Apply.
      if (deptConfig) {
        templateAnswers = reconcileTemplateAnswers(
          deptConfig.interviewQuestions || [],
          storedTemplateAnswers
        );
      }

      const adHocQuestions = (candidate.round2Evaluation?.adHocQuestions ||
        []) as ICustomAnswer[];
      const overallScore = calculateOverallScore(
        templateAnswers,
        adHocQuestions
      );

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
        round2Decision: candidate.round2Decision ?? null,
        evaluation: {
          isScoringEnabled,
          templateAnswers,
          adHocQuestions,
          notes: candidate.round2Evaluation?.notes || {
            note1: '',
            note2: '',
            note3: '',
          },
          collaborativeNotes:
            candidate.round2Evaluation?.collaborativeNotes || [],
          score: overallScore,
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

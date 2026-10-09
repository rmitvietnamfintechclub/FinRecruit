import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import {
  CANDIDATE_CHOICES,
  type DepartmentType,
  type StatusType,
} from '@/app/(backend)/types';

export const runtime = 'nodejs';

type RankingCandidate = {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  department: DepartmentType;
  round2Status: StatusType;
  score: number;
  rank: number;
};

type RankingCandidateDocument = {
  _id: { toString(): string };
  fullName: string;
  email: string;
  department: DepartmentType;
  round2Status: StatusType;
  round2Evaluation?: {
    score?: number | null;
  };
};

function studentIdFromEmail(email: string) {
  return email.split('@')[0] || email;
}

function rankCandidates(
  candidates: RankingCandidateDocument[]
): RankingCandidate[] {
  const scored = candidates
    .flatMap((candidate) => {
      const score = candidate.round2Evaluation?.score;
      if (typeof score !== 'number' || !Number.isFinite(score)) return [];

      return [
        {
          id: candidate._id.toString(),
          fullName: candidate.fullName,
          email: candidate.email,
          studentId: studentIdFromEmail(candidate.email),
          department: candidate.department,
          round2Status: candidate.round2Status,
          score,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.fullName.localeCompare(right.fullName, 'en') ||
        left.id.localeCompare(right.id)
    );

  let lastScore: number | null = null;
  let lastRank = 0;

  return scored.map((candidate, index) => {
    if (candidate.score !== lastScore) {
      lastRank = index + 1;
      lastScore = candidate.score;
    }

    return { ...candidate, rank: lastRank };
  });
}

export const GET = withRBAC(
  'Department Head',
  async (_req: NextRequest, { session }) => {
    const assignedDepartment = normalizeHeadDepartment(session.user.department);

    if (!assignedDepartment) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The authenticated Department Head account does not have a valid department assignment.',
        },
        { status: 403 }
      );
    }

    await dbConnect();
    const active = await getActiveConfig();
    const cohort = {
      generation: active.currentGeneration,
      semester: active.currentSemester,
    };

    const configurations = await DepartmentConfig.find({
      department: { $in: [...CANDIDATE_CHOICES] },
      ...cohort,
    })
      .select('department isScoringEnabled')
      .lean()
      .exec();

    const scoringByDepartment = new Map<DepartmentType, boolean>(
      CANDIDATE_CHOICES.map((department) => [department, false])
    );

    configurations.forEach((configuration) => {
      if (
        CANDIDATE_CHOICES.includes(
          configuration.department as (typeof CANDIDATE_CHOICES)[number]
        )
      ) {
        scoringByDepartment.set(
          configuration.department,
          configuration.isScoringEnabled === true
        );
      }
    });

    const enabledDepartments = CANDIDATE_CHOICES.filter(
      (department) => scoringByDepartment.get(department) === true
    );
    const disabledDepartments = CANDIDATE_CHOICES.filter(
      (department) => scoringByDepartment.get(department) !== true
    );

    const candidateDocuments =
      enabledDepartments.length === 0
        ? []
        : ((await Candidate.find({
            department: { $in: enabledDepartments },
            status: 'Pass',
            ...cohort,
          })
            .select(
              '_id fullName email department round2Status round2Evaluation.score'
            )
            .lean()
            .exec()) as RankingCandidateDocument[]);

    const allCandidates = rankCandidates(candidateDocuments);
    const ownCandidateDocuments = candidateDocuments.filter(
      (candidate) => candidate.department === assignedDepartment
    );
    const ownCandidates = rankCandidates(ownCandidateDocuments);
    const ownScoringEnabled =
      scoringByDepartment.get(assignedDepartment) === true;

    return NextResponse.json({
      success: true,
      message: 'Interview ranking retrieved successfully.',
      data: {
        cohort,
        department: assignedDepartment,
        enabledDepartments,
        disabledDepartments,
        totalDepartments: CANDIDATE_CHOICES.length,
        yourDepartment: {
          isScoringEnabled: ownScoringEnabled,
          candidates: ownScoringEnabled ? ownCandidates : [],
          totalCandidateCount: ownScoringEnabled
            ? ownCandidateDocuments.length
            : 0,
          unscoredCandidateCount: ownScoringEnabled
            ? ownCandidateDocuments.length - ownCandidates.length
            : 0,
        },
        allDepartments: {
          isScoringEnabled: enabledDepartments.length > 0,
          candidates: allCandidates,
          totalCandidateCount: candidateDocuments.length,
          unscoredCandidateCount:
            candidateDocuments.length - allCandidates.length,
        },
      },
    });
  }
);

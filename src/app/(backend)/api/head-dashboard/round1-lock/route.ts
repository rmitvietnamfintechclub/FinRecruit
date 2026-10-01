import { NextResponse, type NextRequest } from 'next/server';

import dbConnect from '@/app/(backend)/libs/dbConnect';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import SystemConfig from '@/app/(backend)/models/SystemConfig';
import type { IDepartmentState } from '@/app/(backend)/types';

export const runtime = 'nodejs';

export const GET = withRBAC(
    ['Department Head'],
    async (_req: NextRequest, { session }) => {
        const department = normalizeHeadDepartment(session.user.department);

        if (!department) {
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

        const config = await SystemConfig.findOne({ key: 'global' })
            .lean()
            .exec();

        const departmentState = config?.departmentStates?.find(
            (state: IDepartmentState) => state.department === department
        );

        return NextResponse.json(
            {
                success: true,
                locked: departmentState?.isRound1Locked ?? false,
                department,
            },
            { status: 200 }
        );
    }
);

export const POST = withRBAC(
    ['Department Head'],
    async (_req: NextRequest, { session }) => {
        const department = normalizeHeadDepartment(session.user.department);

        if (!department) {
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

        const activeConfig = await getActiveConfig();

        const pendingCount = await Candidate.countDocuments({
            department,
            generation: activeConfig.currentGeneration,
            semester: activeConfig.currentSemester,
            status: 'Pending',
        }).exec();

        if (pendingCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        `Round 1 cannot be locked because ${pendingCount} candidate` +
                        `${pendingCount === 1 ? ' is' : 's are'} still pending evaluation.`,
                    pendingCount,
                },
                { status: 400 }
            );
        }

        const config = await SystemConfig.findOne({ key: 'global' }).exec();

        if (!config) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'System configuration could not be found.',
                },
                { status: 500 }
            );
        }

        const departmentState = config.departmentStates.find(
            (state: IDepartmentState) => state.department === department
        );

        if (!departmentState) {
            return NextResponse.json(
                {
                    success: false,
                    message: `No recruitment state exists for ${department}.`,
                },
                { status: 500 }
            );
        }

        if (departmentState.isRound1Locked) {
            return NextResponse.json(
                {
                    success: true,
                    message: 'Round 1 is already locked for your department.',
                    locked: true,
                    department,
                },
                { status: 200 }
            );
        }

        departmentState.isRound1Locked = true;

        await config.save();

        await logSystemEvent({
            level: 'info',
            category: 'system-config',
            action: 'ROUND1_LOCKED',
            message: `Round 1 locked for ${department}.`,
            performedBy: {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
            },
            metadata: {
                department,
                generation: activeConfig.currentGeneration,
                semester: activeConfig.currentSemester,
                pendingCount,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: `Round 1 has been locked for ${department}.`,
                locked: true,
                department,
                activeCohort: {
                    generation: activeConfig.currentGeneration,
                    semester: activeConfig.currentSemester,
                },
            },
            { status: 200 }
        );
    }
);
import { NextResponse } from 'next/server';

import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import SystemConfig from '@/app/(backend)/models/SystemConfig';
import type { IDepartmentState } from '@/app/(backend)/types';

export const runtime = 'nodejs';

export const GET = withActiveRBAC(
    'Executive Board',
    async () => {
        try {
            await dbConnect();

            const config = await SystemConfig.findOne({ key: 'global' })
                .lean()
                .exec();

            if (!config) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'System configuration could not be found.',
                    },
                    { status: 500 }
                );
            }

            const departments = config.departmentStates.map(
                (state: IDepartmentState) => ({
                    department: state.department,
                    isRound1Locked: state.isRound1Locked,
                })
            );

            return NextResponse.json(
                {
                    success: true,
                    departments,
                },
                { status: 200 }
            );
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Failed to load department Round 1 lock statuses.',
                },
                { status: 500 }
            );
        }
    }
);
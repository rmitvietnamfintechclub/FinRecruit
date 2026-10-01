import { NextResponse } from 'next/server';

import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getOrCreateGlobalConfig } from '@/app/(backend)/libs/system-config/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';

export const runtime = 'nodejs';

export const GET = withActiveRBAC(
    'Executive Board',
    async () => {
        try {
            await dbConnect();

            const config = await getOrCreateGlobalConfig();

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
                (state) => ({
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
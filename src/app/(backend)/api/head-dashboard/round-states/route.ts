import { NextResponse } from 'next/server';

import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getOrCreateGlobalConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';

export const runtime = 'nodejs';

/**
 * GET /api/head-dashboard/round-states
 *
 * Returns every department's Round 1 / Round 2 lock state for the active cohort.
 * Used by the Department Head dashboard and the Executive Board overview.
 */
export const GET = withRBAC(
    ['Department Head', 'Executive Board'],
    async () => {
        await dbConnect();

        const config = await getOrCreateGlobalConfig();

        return NextResponse.json(
            {
                success: true,
                departmentStates: config.departmentStates.map((state) => ({
                    department: state.department,
                    isRound1Locked: state.isRound1Locked,
                    isRound2Locked: state.isRound2Locked,
                })),
            },
            { status: 200 }
        );
    }
);

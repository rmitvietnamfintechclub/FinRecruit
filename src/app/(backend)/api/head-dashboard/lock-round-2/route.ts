import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig, getOrCreateGlobalConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import { normalizeHeadDepartment } from '@/app/(backend)/libs/departments';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

export const POST = withRBAC(
    'Department Head',
    async (req: NextRequest, { session }: { session: ActiveAppSession }) => {
        const assignedDepartment = normalizeHeadDepartment(session.user.department);

        if (!assignedDepartment) {
            return NextResponse.json(
                { success: false, message: 'Invalid department assignment.' },
                { status: 403 }
            );
        }

        await dbConnect();
        const active = await getActiveConfig();

        // Prevent locking if any Round 2 candidates are still pending
        const pendingCount = await Candidate.countDocuments({
            department: assignedDepartment,
            generation: active.currentGeneration,
            semester: active.currentSemester,
            status: 'Pass', // Must have passed Round 1 to be in the R2 pool
            round2Status: 'Pending',
        }).exec();

        if (pendingCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    code: 'ROUND_2_INCOMPLETE',
                    message: `Cannot close Round 2. There are still ${pendingCount} candidate(s) pending evaluation.`,
                },
                { status: 400 }
            );
        }

        // Lock the Round 2 state in the global SystemConfig
        const cfg = await getOrCreateGlobalConfig();
        
        const deptState = cfg.departmentStates.find(ds => ds.department === assignedDepartment);
        
        if (!deptState) {
            // Defensive push if state is somehow missing
            cfg.departmentStates.push({ 
                department: assignedDepartment, 
                isRound1Locked: true, 
                isRound2Locked: true 
            });
        } else {
            deptState.isRound2Locked = true;
        }

        await cfg.save();

        return NextResponse.json({
            success: true,
            message: 'Round 2 has been successfully closed and locked for your department.',
        });
    }
);
import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { 
    deleteGeneration, 
    getActiveConfig, 
    listGenerations 
} from '@/app/(backend)/libs/system-config/service';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import { withActiveRBAC } from '@/app/(backend)/guards/auth&RBAC';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string | undefined {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || undefined;
    return req.headers.get('x-real-ip') ?? undefined;
}

function buildActor(req: NextRequest, session: ActiveAppSession) {
    return {
        actor: {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role,
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
    };
}

type RouteContext = {
    params: Promise<{ generationId: string }>;
};

export const DELETE = withActiveRBAC<RouteContext>(
    'Executive Board',
    async (req: NextRequest, { params, session }) => {
        const { generationId } = await params;

        if (!mongoose.Types.ObjectId.isValid(generationId)) {
            return NextResponse.json(
                { success: false, message: 'Invalid generation id.' },
                { status: 400 }
            );
        }

        const { actor, ipAddress, userAgent } = buildActor(req, session);

        try {
            // 1. Lấy danh sách generations và active config để check an toàn
            const generations = await listGenerations();
            const targetGen = generations.find((g) => g.id === generationId);

            if (!targetGen) {
                return NextResponse.json(
                    { success: false, message: 'Generation not found.' },
                    { status: 404 }
                );
            }

            const activeConfig = await getActiveConfig();

            // 2. Chốt chặn bảo mật: Không cho phép xóa Generation đang chứa Semester đang Active/Live
            const hasActiveSemester = targetGen.semesters.some(
                (s) =>
                    activeConfig.currentGeneration === targetGen.name &&
                    activeConfig.currentSemester.toLowerCase() === s.code.toLowerCase()
            );

            if (hasActiveSemester) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Cannot delete "${targetGen.name}" because it contains the currently active live semester.`,
                    },
                    { status: 400 }
                );
            }

            // 3. Tiến hành xóa
            await deleteGeneration(generationId);

            void logSystemEvent({
                level: 'warning',
                category: 'system-config',
                action: 'system-config.generation_deleted',
                message: `Deleted generation "${targetGen.name}".`,
                performedBy: actor,
                target: { label: targetGen.name },
                metadata: { generationId, generationName: targetGen.name },
                ipAddress,
                userAgent,
            });

            return NextResponse.json({ success: true, message: 'Generation deleted.' });
        } catch (e) {
            void logSystemEvent({
                level: 'error',
                category: 'system-config',
                action: 'system-config.generation_delete_failed',
                message: `Failed to delete generation: ${e instanceof Error ? e.message : 'unknown error'}.`,
                performedBy: actor,
                metadata: { generationId, error: e instanceof Error ? e.message : String(e) },
                ipAddress,
                userAgent,
            });

            return NextResponse.json(
                { success: false, message: e instanceof Error ? e.message : 'Delete failed.' },
                { status: 400 }
            );
        }
    }
);
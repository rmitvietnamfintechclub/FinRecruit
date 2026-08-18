import { NextResponse } from "next/server";
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import { normalizePowerAutomatePayload } from '@/lib/candidate-answers';

const SYSTEM_ACTOR = {
    email: 'system:power-automate',
    role: 'Executive Board' as const,
};

function getClientIp(req: Request): string | undefined {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
        return xff.split(',')[0]?.trim() || undefined;
    }
    return req.headers.get('x-real-ip') ?? undefined;
}

export async function POST(req: Request) {
    await dbConnect();
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') ?? undefined;

    let payload: Record<string, unknown>;

    try {
        payload = (await req.json()) as Record<string, unknown>;
    } catch (e) {
        void logSystemEvent({
            level: 'error',
            category: 'candidate',
            action: 'candidate.submission_failed',
            message: 'Webhook rejected: invalid JSON payload.',
            performedBy: SYSTEM_ACTOR,
            metadata: {
                reason: 'invalid_json',
                error: e instanceof Error ? e.message : String(e),
            },
            ipAddress: ip,
            userAgent,
        });
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const msFormResponseId = typeof payload?.msFormResponseId === 'string'
        ? payload.msFormResponseId
        : undefined;
    const candidateEmail = typeof payload?.email === 'string' ? payload.email : undefined;
    const candidateFullName = typeof payload?.fullName === 'string' ? payload.fullName : undefined;

    // 2. Basic guard: ensure the form response ID is present
    if (!msFormResponseId) {
        void logSystemEvent({
            level: 'error',
            category: 'candidate',
            action: 'candidate.submission_failed',
            message: 'Webhook rejected: missing msFormResponseId.',
            performedBy: SYSTEM_ACTOR,
            target: {
                email: candidateEmail,
                label: candidateFullName,
            },
            metadata: { reason: 'missing_msFormResponseId' },
            ipAddress: ip,
            userAgent,
        });
        return NextResponse.json({ error: "Missing msFormResponseId" }, { status: 400 });
    }

    try {
        // Load the active config; reject if recruitment has been turned off
        const active = await getActiveConfig();
        if (!active.isRecruitmentActive) {
            void logSystemEvent({
                level: 'warning',
                category: 'candidate',
                action: 'candidate.submission_rejected',
                message: 'Webhook rejected: recruitment is closed for the current cohort.',
                performedBy: SYSTEM_ACTOR,
                target: {
                msFormResponseId,
                email: candidateEmail,
                label: candidateFullName,
                },
                metadata: {
                    reason: 'recruitment_closed',
                    currentGeneration: active.currentGeneration,
                    currentSemester: active.currentSemester,
                },
                ipAddress: ip,
                userAgent,
            });
            return NextResponse.json(
                { success: false, error: "Recruitment is not active." },
                { status: 403 }
            );
        }

        // Stamp the current cohort from SystemConfig (never trust the external payload)
        payload.generation = active.currentGeneration;
        payload.semester = active.currentSemester;

        const normalized = normalizePowerAutomatePayload(payload);

        console.log("Payload to be inserted:", JSON.stringify(normalized, null, 2));

        const newCandidate = await Candidate.create(normalized);

        return NextResponse.json({ success: true, id: newCandidate._id }, { status: 200 });

    } catch (error) {
        console.error("Webhook Error:", error);
        void logSystemEvent({
            level: 'error',
            category: 'candidate',
            action: 'candidate.submission_failed',
            message:
                error instanceof Error
                ? `Webhook insert failed: ${error.message}`
                : 'Webhook insert failed with unknown error.',
            performedBy: SYSTEM_ACTOR,
            target: {
                msFormResponseId,
                email: candidateEmail,
                label: candidateFullName,
            },
            metadata: {
                reason: 'db_insert_error',
                error: error instanceof Error ? error.message : String(error),
                errorName: error instanceof Error ? error.name : undefined,
            },
            ipAddress: ip,
            userAgent,
        });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

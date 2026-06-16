import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { addSemesterToGeneration } from '@/app/(backend)/libs/system-config/service';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || undefined;
  return req.headers.get('x-real-ip') ?? undefined;
}

type RouteContext = {
  params: Promise<{ generationId: string }>;
};

export const POST = withActiveRBAC<RouteContext>(
  'Executive Board',
  async (req: NextRequest, { params, session }) => {
    const { generationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(generationId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid generation id.' },
        { status: 400 }
      );
    }

    let body: { code?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON payload.' },
        { status: 400 }
      );
    }

    if (!body.code?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Semester code is required.' },
        { status: 400 }
      );
    }

    const actor = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') ?? undefined;

    try {
      const generation = await addSemesterToGeneration(
        generationId,
        body.code
      );
      void logSystemEvent({
        level: 'info',
        category: 'system-config',
        action: 'system-config.semester_added',
        message: `Added semester "${body.code.trim()}" to "${generation.name}".`,
        performedBy: actor,
        target: { label: `${generation.name} / ${body.code.trim()}` },
        metadata: {
          generationId,
          generationName: generation.name,
          semesterCode: body.code.trim(),
        },
        ipAddress,
        userAgent,
      });
      return NextResponse.json({ success: true, generation });
    } catch (e) {
      void logSystemEvent({
        level: 'error',
        category: 'system-config',
        action: 'system-config.semester_add_failed',
        message: `Failed to add semester "${body.code.trim()}": ${e instanceof Error ? e.message : 'unknown error'}.`,
        performedBy: actor,
        metadata: {
          generationId,
          semesterCode: body.code.trim(),
          error: e instanceof Error ? e.message : String(e),
        },
        ipAddress,
        userAgent,
      });
      return NextResponse.json(
        {
          success: false,
          message: e instanceof Error ? e.message : 'Failed to add semester.',
        },
        { status: 400 }
      );
    }
  }
);

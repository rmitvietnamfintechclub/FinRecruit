import { NextResponse, type NextRequest } from 'next/server';
import {
  activateCohort,
  createGeneration,
  getActiveConfig,
  listGenerations,
  setRecruitmentActive,
} from '@/app/(backend)/libs/system-config/service';
import { logSystemEvent } from '@/app/(backend)/libs/system-log/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
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

export const GET = withActiveRBAC('Executive Board', async () => {
  try {
    const active = await getActiveConfig();
    const generations = await listGenerations();
    return NextResponse.json({
      success: true,
      active,
      generations,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Failed to load system config.',
      },
      { status: 500 }
    );
  }
});

type ActivateBody = {
  generation?: string;
  semester?: string;
  isRecruitmentActive?: boolean;
};

export const POST = withActiveRBAC('Executive Board', async (req: NextRequest, { session }) => {
  let body: ActivateBody & { action?: string; name?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const action = body.action ?? 'activate';
  const { actor, ipAddress, userAgent } = buildActor(req, session);

  try {
    if (action === 'create-generation') {
      if (!body.name?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Generation name is required.' },
          { status: 400 }
        );
      }
      const generation = await createGeneration(body.name);
      void logSystemEvent({
        level: 'info',
        category: 'system-config',
        action: 'system-config.generation_created',
        message: `Created generation "${generation.name}".`,
        performedBy: actor,
        target: { label: generation.name },
        metadata: { generationId: generation.id },
        ipAddress,
        userAgent,
      });
      return NextResponse.json({ success: true, generation });
    }

    if (action === 'activate') {
      const prev = await getActiveConfig();
      const active = await activateCohort({
        generation: body.generation ?? '',
        semester: body.semester ?? '',
        isRecruitmentActive: body.isRecruitmentActive,
      });
      void logSystemEvent({
        level: 'info',
        category: 'system-config',
        action: 'system-config.cohort_activated',
        message: `Activated cohort ${active.currentGeneration} / ${active.currentSemester}.`,
        performedBy: actor,
        target: {
          label: `${active.currentGeneration} / ${active.currentSemester}`,
        },
        metadata: {
          prev,
          next: active,
        },
        ipAddress,
        userAgent,
      });
      return NextResponse.json({ success: true, active });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action.' },
      { status: 400 }
    );
  } catch (e) {
    void logSystemEvent({
      level: 'error',
      category: 'system-config',
      action: 'system-config.action_failed',
      message: `System config action "${action}" failed: ${e instanceof Error ? e.message : 'unknown error'}.`,
      performedBy: actor,
      metadata: {
        action,
        body,
        error: e instanceof Error ? e.message : String(e),
      },
      ipAddress,
      userAgent,
    });
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Request failed.',
      },
      { status: 400 }
    );
  }
});

export const PATCH = withActiveRBAC('Executive Board', async (req: NextRequest, { session }) => {
  let body: { isRecruitmentActive?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  if (typeof body.isRecruitmentActive !== 'boolean') {
    return NextResponse.json(
      { success: false, message: 'isRecruitmentActive must be a boolean.' },
      { status: 400 }
    );
  }

  const { actor, ipAddress, userAgent } = buildActor(req, session);

  try {
    const prev = await getActiveConfig();
    const active = await setRecruitmentActive(body.isRecruitmentActive);
    void logSystemEvent({
      level: 'info',
      category: 'system-config',
      action: body.isRecruitmentActive
        ? 'system-config.recruitment_opened'
        : 'system-config.recruitment_closed',
      message: `Recruitment intake turned ${body.isRecruitmentActive ? 'ON' : 'OFF'} for ${active.currentGeneration} / ${active.currentSemester}.`,
      performedBy: actor,
      target: {
        label: `${active.currentGeneration} / ${active.currentSemester}`,
      },
      metadata: {
        prev: { isRecruitmentActive: prev.isRecruitmentActive },
        next: { isRecruitmentActive: active.isRecruitmentActive },
      },
      ipAddress,
      userAgent,
    });
    return NextResponse.json({ success: true, active });
  } catch (e) {
    void logSystemEvent({
      level: 'error',
      category: 'system-config',
      action: 'system-config.toggle_failed',
      message: `Failed to toggle recruitment intake: ${e instanceof Error ? e.message : 'unknown error'}.`,
      performedBy: actor,
      metadata: {
        attempted: body.isRecruitmentActive,
        error: e instanceof Error ? e.message : String(e),
      },
      ipAddress,
      userAgent,
    });
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Update failed.',
      },
      { status: 500 }
    );
  }
});

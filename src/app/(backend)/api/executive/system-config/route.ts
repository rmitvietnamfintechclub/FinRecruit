import { NextResponse, type NextRequest } from 'next/server';
import {
  activateCohort,
  createGeneration,
  getActiveConfig,
  listGenerations,
  setRecruitmentActive,
} from '@/app/(backend)/libs/system-config/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';

export const runtime = 'nodejs';

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

export const POST = withActiveRBAC('Executive Board', async (req: NextRequest) => {
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

  try {
    if (action === 'create-generation') {
      if (!body.name?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Generation name is required.' },
          { status: 400 }
        );
      }
      const generation = await createGeneration(body.name);
      return NextResponse.json({ success: true, generation });
    }

    if (action === 'activate') {
      const active = await activateCohort({
        generation: body.generation ?? '',
        semester: body.semester ?? '',
        isRecruitmentActive: body.isRecruitmentActive,
      });
      return NextResponse.json({ success: true, active });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action.' },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Request failed.',
      },
      { status: 400 }
    );
  }
});

export const PATCH = withActiveRBAC('Executive Board', async (req: NextRequest) => {
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

  try {
    const active = await setRecruitmentActive(body.isRecruitmentActive);
    return NextResponse.json({ success: true, active });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : 'Update failed.',
      },
      { status: 500 }
    );
  }
});

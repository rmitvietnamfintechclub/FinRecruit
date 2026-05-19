import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { addSemesterToGeneration } from '@/app/(backend)/libs/system-config/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ generationId: string }>;
};

export const POST = withActiveRBAC<RouteContext>(
  'Executive Board',
  async (req: NextRequest, { params }) => {
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

    try {
      const generation = await addSemesterToGeneration(
        generationId,
        body.code
      );
      return NextResponse.json({ success: true, generation });
    } catch (e) {
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

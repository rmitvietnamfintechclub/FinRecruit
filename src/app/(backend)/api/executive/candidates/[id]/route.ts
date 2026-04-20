import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';

export const runtime = 'nodejs';

/**
 * GET /api/executive/candidates/:id
 * Executive Board only. Returns full candidate document (all schema fields).
 * Dates in `data` are ISO strings; `_id` is a string. `__v` is omitted.
 */
type RouteParams = { id: string };

type RouteContext = {
  params: Promise<RouteParams> | RouteParams;
};

interface SuccessResponse {
  success: true;
  data: Record<string, unknown>;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

function serializeCandidate(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...doc };
  delete out.__v;
  if (out._id != null) {
    out._id = String(out._id);
  }
  for (const key of ['appliedAt', 'createdAt', 'updatedAt'] as const) {
    const v = out[key];
    if (v instanceof Date) {
      out[key] = v.toISOString();
    }
  }
  return out;
}

export const GET = withRBAC(
  'Executive Board',
  async (
    _req: NextRequest,
    context: RouteContext & { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      const { id } = await Promise.resolve(context.params);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        const body: ErrorResponse = {
          success: false,
          message: 'Invalid candidate id.',
        };
        return NextResponse.json(body, { status: 400 });
      }

      await dbConnect();

      const raw = await Candidate.findById(id).lean().exec();

      if (!raw) {
        const body: ErrorResponse = {
          success: false,
          message: 'Candidate not found.',
        };
        return NextResponse.json(body, { status: 404 });
      }

      const data = serializeCandidate(raw as Record<string, unknown>);

      const response: SuccessResponse = {
        success: true,
        data,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error: unknown) {
      console.error('[candidates/[id]/GET] Error:', error);

      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';

      const errorResponse: ErrorResponse = {
        success: false,
        message: 'Failed to fetch candidate.',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      };

      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);

import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';

import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
    getDepartmentAliases,
    normalizeHeadDepartment,
} from '@/app/(backend)/libs/departments';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import User from '@/app/(backend)/models/User';
import {
    patchUserInDb,
} from '@/lib/user-management/db-user-management';
import type { DepartmentType } from '@/app/(backend)/types';

export const runtime = 'nodejs';

type SerializedHeadMemberUser = {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    role: string;
    department: DepartmentType;
    isActive: boolean;
    generation: string;
    semester: string;
    createdAt: string;
};

function serializeUser(user: {
    _id: mongoose.Types.ObjectId;
    name?: string | null;
    email: string;
    avatar?: string | null;
    role: string;
    department: string;
    isActive: boolean;
    generation?: string;
    semester?: string;
    createdAt: Date;
}): SerializedHeadMemberUser {
    return {
        id: user._id.toString(),
        name: user.name ?? null,
        email: user.email,
        avatar: user.avatar ?? null,
        role: user.role,
        department: user.department as DepartmentType,
        isActive: user.isActive,
        generation: user.generation ?? '',
        semester: user.semester ?? '',
        createdAt: user.createdAt.toISOString(),
    };
}

/**
 * GET
 *
 * Returns:
 * - all active Guests waiting for a role
 * - all active Members belonging to the authenticated Head's department
 *
 * The department is always derived from the authenticated session.
 */
export const GET = withRBAC(
    ['Department Head'],
    async (_req: NextRequest, { session }) => {
        const department = normalizeHeadDepartment(session.user.department);

        if (!department) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        'The authenticated Department Head account does not have a valid department assignment.',
                },
                { status: 403 }
            );
        }

        await dbConnect();

        const departmentAliases = getDepartmentAliases(department);

        const [guestDocs, memberDocs] = await Promise.all([
            User.find({
                role: 'Guest',
                isActive: true,
            })
                .select(
                    '_id name email avatar role department isActive generation semester createdAt'
                )
                .sort({ createdAt: -1, _id: -1 })
                .lean()
                .exec(),

            User.find({
                role: 'Member',
                isActive: true,
                department: { $in: departmentAliases },
            })
                .select(
                    '_id name email avatar role department isActive generation semester createdAt'
                )
                .sort({ createdAt: -1, _id: -1 })
                .lean()
                .exec(),
        ]);

        return NextResponse.json(
            {
                success: true,
                department,
                waitingGuests: guestDocs.map(serializeUser),
                members: memberDocs.map(serializeUser),
            },
            { status: 200 }
        );
    }
);

/**
 * POST
 *
 * Promotes an active Guest to Member and assigns them to the
 * authenticated Department Head's department.
 *
 * Request body:
 * {
 *   "userId": "..."
 * }
 *
 * The client does NOT provide the department.
 * The department always comes from the authenticated Head.
 */
export const POST = withRBAC(
    ['Department Head'],
    async (req: NextRequest, { session }) => {
        const department = normalizeHeadDepartment(session.user.department);

        if (!department) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        'The authenticated Department Head account does not have a valid department assignment.',
                },
                { status: 403 }
            );
        }

        let body: unknown;

        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Request body must be valid JSON.',
                },
                { status: 400 }
            );
        }

        if (
            typeof body !== 'object' ||
            body === null ||
            !('userId' in body) ||
            typeof body.userId !== 'string' ||
            !body.userId.trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'A valid userId is required.',
                },
                { status: 400 }
            );
        }

        const userId = body.userId.trim();

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'The supplied userId is not a valid user ID.',
                },
                { status: 400 }
            );
        }

        await dbConnect();

        const target = await User.findById(userId)
            .select('_id name email role department isActive')
            .lean()
            .exec();

        if (!target) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'User not found.',
                },
                { status: 404 }
            );
        }

        if (!target.isActive) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'This user is inactive and cannot be granted Member access.',
                },
                { status: 400 }
            );
        }

        if (target.role !== 'Guest') {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        `This user cannot be granted Member access because their current role is ${target.role}.`,
                },
                { status: 409 }
            );
        }

        const forwardedFor = req.headers.get('x-forwarded-for');
        const ipAddress =
            forwardedFor?.split(',')[0]?.trim() ||
            req.headers.get('x-real-ip') ||
            undefined;

        const userAgent = req.headers.get('user-agent') || undefined;

        const result = await patchUserInDb({
            userId,
            role: 'Member',
            department,
            isActive: true,
            actor: {
                userId: session.user.id,
                email: session.user.email,
                role: session.user.role,
                ipAddress,
                userAgent,
            },
        });

        if (!result.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: result.message,
                },
                { status: result.status }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: `${target.name || target.email} has been granted Member access to ${department}.`,
                user: result.user,
                department,
            },
            { status: 200 }
        );
    }
);
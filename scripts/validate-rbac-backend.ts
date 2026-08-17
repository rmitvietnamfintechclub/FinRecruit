import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import {
    APP_SESSION_COOKIE_NAME,
    createSessionRecord,
} from '@/app/(backend)/libs/session';
import Session from '@/app/(backend)/models/Session';
import User from '@/app/(backend)/models/User';

const baseUrl = process.env.VALIDATION_BASE_URL ?? 'http://127.0.0.1:3000';

async function cleanupValidationData(emails: string[]) {
    const users = await User.find({ email: { $in: emails } }).select('_id').lean().exec();
    const userIds = users.map((user) => user._id);

    if (userIds.length > 0) {
        await Session.deleteMany({ userId: { $in: userIds } });
    }

    await User.deleteMany({ email: { $in: emails } });
}

async function patchRole(sessionId: string | undefined, body: unknown) {
    return fetch(`${baseUrl}/api/users`, {
        method: 'PATCH',
        headers: {
        'content-type': 'application/json',
        ...(sessionId
            ? {
                cookie: `${APP_SESSION_COOKIE_NAME}=${sessionId}`,
            }
            : {}),
        },
        body: JSON.stringify(body),
    });
}

async function main() {
    const suffix = Date.now().toString();
    const emails = {
        eb: `codex.eb.${suffix}@example.com`,
        guest: `codex.guest.${suffix}@example.com`,
        inactive: `codex.inactive.${suffix}@example.com`,
        target: `codex.target.${suffix}@example.com`,
        activeHead: `codex.activeHead.${suffix}@example.com`,
        targetMember: `codex.targetMember.${suffix}@example.com`,
    };

    await dbConnect();

    try {
        const [ebUser, guestUser, inactiveUser, targetUser, activeHeadUser, targetMemberUser] = await User.create([
            {
                email: emails.eb,
                name: 'EB Validator',
                role: 'Executive Board',
                department: 'EBMB',
                isActive: true,
            },
            {
                email: emails.guest,
                name: 'Guest Validator',
                role: 'Guest',
                department: 'Unassigned',
                isActive: true,
            },
            {
                email: emails.inactive,
                name: 'Inactive Head',
                role: 'Department Head',
                department: 'Technology Department',
                isActive: false,
            },
            {
                email: emails.target,
                name: 'Target Guest',
                role: 'Guest',
                department: 'Unassigned',
                isActive: true,
            },
            {
                email: emails.activeHead,
                name: 'Active Head',
                role: 'Department Head',
                department: 'Technology Department',
                isActive: true,
            },
            {
                email: emails.targetMember,
                name: 'Target Member',
                role: 'Guest',
                department: 'Unassigned',
                isActive: true,
            },
        ]);

        const ebSession = await createSessionRecord(ebUser._id);
        const guestSession = await createSessionRecord(guestUser._id);
        const inactiveSession = await createSessionRecord(inactiveUser._id);
        const headSession = await createSessionRecord(activeHeadUser._id);

        // 1. Unauthenticated checks
        const unauthenticatedResponse = await patchRole(undefined, {
            userId: targetUser._id.toString(),
            role: 'Department Head',
            department: 'Technology Department',
        });
        assert.equal(unauthenticatedResponse.status, 401);
        const unauthenticatedBody = (await unauthenticatedResponse.json()) as Record<string, unknown>;
        assert.equal(unauthenticatedBody.message, 'Authentication required.');

        // 2. Guest Privilege checks
        const forbiddenResponse = await patchRole(guestSession.sessionId, {
            userId: targetUser._id.toString(),
            role: 'Department Head',
            department: 'Technology Department',
        });
        assert.equal(forbiddenResponse.status, 403);
        const forbiddenBody = (await forbiddenResponse.json()) as Record<string, unknown>;
        assert.equal(forbiddenBody.message, 'Insufficient permissions.');

        // 3. Inactive account checks
        const inactiveResponse = await patchRole(inactiveSession.sessionId, {
            userId: targetUser._id.toString(),
            role: 'Department Head',
            department: 'Technology Department',
        });
        assert.equal(inactiveResponse.status, 401);
        const inactiveBody = (await inactiveResponse.json()) as Record<string, unknown>;
        assert.equal(inactiveBody.message, 'Authentication required.');

        const removedInactiveSession = await Session.findOne({
            sessionId: inactiveSession.sessionId,
        }).lean().exec();
        assert.equal(removedInactiveSession, null);

        // 4. Missing payload property checks
        const invalidPayloadResponse = await patchRole(ebSession.sessionId, {
            userId: targetUser._id.toString(),
            role: 'Department Head',
        });
        assert.equal(invalidPayloadResponse.status, 400);
        const invalidPayloadBody = (await invalidPayloadResponse.json()) as Record<string, unknown>;
        assert.equal(
            invalidPayloadBody.message,
            'A valid department must be provided when assigning the Department Head role.'
        );

        // 5. EB success check
        const successResponse = await patchRole(ebSession.sessionId, {
            userId: targetUser._id.toString(),
            role: 'Department Head',
            department: 'Technology Department',
        });
        assert.equal(successResponse.status, 200);
        const successBody = (await successResponse.json()) as {
            success: boolean;
            user: {
                role: string;
                department: string;
            };
        };
        assert.equal(successBody.success, true);
        assert.equal(successBody.user.role, 'Department Head');
        assert.equal(successBody.user.department, 'Technology Department');

        const updatedTargetUser = await User.findById(targetUser._id).lean().exec();
        assert.equal(updatedTargetUser?.role, 'Department Head');
        assert.equal(updatedTargetUser?.department, 'Technology');

        // 6. Department Head promoting Guest to Member
        const memberPromoResponse = await patchRole(headSession.sessionId, {
            userId: targetMemberUser._id.toString(),
            role: 'Member',
            department: 'Technology Department',
        });
        assert.equal(memberPromoResponse.status, 200);

        const memberPromoBody = (await memberPromoResponse.json()) as { success: boolean; user: { role: string } };
        assert.equal(memberPromoBody.user.role, 'Member');

        // 7. Department Head tries to promote someone to Executive Board
        const illegalPromoResponse = await patchRole(headSession.sessionId, {
            userId: targetMemberUser._id.toString(),
            role: 'Executive Board',
            department: 'EBMB',
        });
        
        // Fail with a 403 Forbidden because Heads can only assign the 'Member' role.
        assert.equal(illegalPromoResponse.status, 403);

        console.log(
            JSON.stringify(
                {
                    success: true,
                    baseUrl,
                    checks: [
                        '401 for missing session cookie',
                        '403 for non-EB role',
                        'inactive session rejection and cleanup',
                        '400 validation for missing department',
                        '200 successful EB role approval update',
                        '200 Department Head successfully promotes Guest to Member',
                        '403 Department Head blocked from assigning Executive Board role'
                    ],
                },
                null,
                2
            )
        );
    } finally {
        await cleanupValidationData(Object.values(emails));
        await mongoose.disconnect();
    }
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

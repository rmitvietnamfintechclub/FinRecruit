import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { upsertGoogleUser } from '@/app/(backend)/libs/auth';
import {
  createSessionRecord,
  deleteAppSession,
  getActiveAppSession,
  revokeUserSessions,
} from '@/app/(backend)/libs/session';
import Session from '@/app/(backend)/models/Session';
import User from '@/app/(backend)/models/User';

async function cleanupValidationUser(email: string) {
  const users = await User.find({ email }).select('_id').lean().exec();
  const userIds = users.map((user) => user._id);

  if (userIds.length > 0) {
    await Session.deleteMany({ userId: { $in: userIds } });
  }

  await User.deleteMany({ email });
}

async function main() {
  const uniqueEmail = 'codex.auth.validation.' + Date.now() + '@example.com';

  await dbConnect();

  try {
    const createdUser = await upsertGoogleUser({
      email: uniqueEmail,
      name: 'Codex Validator',
      avatar: 'https://example.com/avatar-1.png',
    });

    assert.equal(createdUser.email, uniqueEmail);
    assert.equal(createdUser.role, 'Guest');
    assert.equal(createdUser.department, 'Unassigned');
    assert.equal(createdUser.isActive, true);

    await User.updateOne(
      { _id: createdUser._id },
      { role: 'Executive Board', department: 'All' }
    );

    const updatedUser = await upsertGoogleUser({
      email: uniqueEmail,
      name: 'Codex Validator Updated',
      avatar: 'https://example.com/avatar-2.png',
    });

    assert.equal(updatedUser.role, 'Executive Board');
    assert.equal(updatedUser.department, 'All');
    assert.equal(updatedUser.name, 'Codex Validator Updated');
    assert.equal(updatedUser.avatar, 'https://example.com/avatar-2.png');

    const firstSession = await createSessionRecord(updatedUser._id);
    assert.ok(firstSession.sessionId);

    const activeSession = await getActiveAppSession(firstSession.sessionId);
    assert.ok(activeSession);
    assert.equal(activeSession?.user.email, uniqueEmail);
    assert.equal(activeSession?.user.role, 'Executive Board');

    await deleteAppSession(firstSession.sessionId);
    const deletedSession = await getActiveAppSession(firstSession.sessionId);
    assert.equal(deletedSession, null);

    const secondSession = await createSessionRecord(updatedUser._id);
    await User.updateOne({ _id: updatedUser._id }, { isActive: false });

    const inactiveLookup = await getActiveAppSession(secondSession.sessionId);
    assert.equal(inactiveLookup, null);

    const removedSession = await Session.findOne({
      sessionId: secondSession.sessionId,
    })
      .lean()
      .exec();

    assert.equal(removedSession, null);

    await User.updateOne({ _id: updatedUser._id }, { isActive: true });
    await createSessionRecord(updatedUser._id);
    await createSessionRecord(updatedUser._id);
    await revokeUserSessions(updatedUser._id);

    const remainingSessions = await Session.countDocuments({
      userId: updatedUser._id,
    });

    assert.equal(remainingSessions, 0);

    console.log(
      JSON.stringify(
        {
          success: true,
          email: uniqueEmail,
          checks: [
            'guest default creation',
            'profile refresh without role overwrite',
            'session create/read/delete',
            'inactive user session invalidation',
            'bulk session revocation',
          ],
        },
        null,
        2
      )
    );
  } finally {
    await cleanupValidationUser(uniqueEmail);
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

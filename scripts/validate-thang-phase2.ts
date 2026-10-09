import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { APP_SESSION_COOKIE_NAME, createSessionRecord } from '@/app/(backend)/libs/session';
import Session from '@/app/(backend)/models/Session';
import User from '@/app/(backend)/models/User';
import DepartmentConfig from '@/app/(backend)/models/DepartmentConfig';
import Candidate from '@/app/(backend)/models/Candidate';
import { getOrCreateGlobalConfig } from '@/app/(backend)/libs/system-config/service';

/**
 * Run this script on second terminal while the main application is running
 * The command to run this script is:
 * ```bash
 * npx tsx --env-file=.env scripts/validate-thang-phase2.ts
 * ```
 */
const baseUrl = process.env.VALIDATION_BASE_URL ?? 'http://127.0.0.1:3000';

async function fetchAPI(endpoint: string, method: string, sessionId: string, body?: unknown) {
    return fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
            'content-type': 'application/json',
            cookie: `${APP_SESSION_COOKIE_NAME}=${sessionId}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

async function main() {
    const suffix = Date.now().toString();
    await dbConnect();
    
    // Ensure we have an active global config
    const globalCfg = await getOrCreateGlobalConfig();
    const generation = globalCfg.currentGeneration;
    const semester = globalCfg.currentSemester;

    // 1. Setup Mock Users
    const [headUser, ebUser] = await User.create([
        { email: `head.${suffix}@example.com`, name: 'Head Test', role: 'Department Head', department: 'Technology Department', isActive: true },
        { email: `eb.${suffix}@example.com`, name: 'EB Test', role: 'Executive Board', department: 'EBMB', isActive: true }
    ]);

    const headSession = await createSessionRecord(headUser._id);
    const ebSession = await createSessionRecord(ebUser._id);

    try {
        console.log('--- Testing PATCH /api/head-dashboard/config ---');
        const configRes = await fetchAPI('/api/head-dashboard/config', 'PATCH', headSession.sessionId, {
            interviewQuestions: ['Question A', 'Question B'],
            isScoringEnabled: true
        });
        assert.equal(configRes.status, 200);
        const configBody = await configRes.json();
        assert.equal(configBody.data.isScoringEnabled, true);
        assert.equal(configBody.data.interviewQuestions.length, 2);
        console.log('Config Update Passed');

        console.log('--- Testing POST /api/head-dashboard/lock-round-2 ---');
        // Create a pending candidate to trigger the lock block
        const mockCandidate = await Candidate.create({
            msFormResponseId: `test-${suffix}`,
            fullName: 'Test Candidate', email: `cand.${suffix}@example.com`, dob: '2000-01-01', phone: '123', majorAndYear: 'CS 1', facebookLink: 'N/A', cvLink: 'N/A',
            choice1: 'Technology Department', department: 'Technology Department', status: 'Pass', round2Status: 'Pending',
            generation, semester
        });

        // Attempt 1: Should fail because candidate is pending
        const lockFailRes = await fetchAPI('/api/head-dashboard/lock-round-2', 'POST', headSession.sessionId);
        assert.equal(lockFailRes.status, 400);
        console.log('Pending Block Passed (400)');

        // Attempt 2: Pass the candidate, then try locking again
        await Candidate.updateOne({ _id: mockCandidate._id }, { round2Status: 'Pass' });
        const lockSuccessRes = await fetchAPI('/api/head-dashboard/lock-round-2', 'POST', headSession.sessionId);
        assert.equal(lockSuccessRes.status, 200);
        console.log('Round 2 Lock Passed (200)');

        console.log('--- Testing GET /api/executive/export/round-2 ---');
        const exportRes = await fetchAPI('/api/executive/export/round-2?status=Pass', 'GET', ebSession.sessionId);
        assert.equal(exportRes.status, 200);
        assert.equal(exportRes.headers.get('Content-Type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        console.log('Export Generated Binary File successfully');

        console.log('\nALL PHASE 2 [3 API TESTS PASSED]!');

    } finally {
        // Cleanup Data
        await Session.deleteMany({ userId: { $in: [headUser._id, ebUser._id] } });
        await User.deleteMany({ _id: { $in: [headUser._id, ebUser._id] } });
        await DepartmentConfig.deleteMany({ department: 'Technology Department', generation, semester });
        await Candidate.deleteMany({ email: `cand.${suffix}@example.com` });
        await mongoose.disconnect();
    }
}

main().catch(console.error);
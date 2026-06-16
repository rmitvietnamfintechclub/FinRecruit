import { NextResponse } from "next/server";
import dbConnect from '@/app/(backend)/libs/dbConnect';
import Candidate from '@/app/(backend)/models/Candidate';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';

export async function POST(req: Request) {
  await dbConnect();

  try {
    // 1. Receive the full flat payload from Power Automate
    const payload = await req.json();

    // 2. Basic guard: ensure the form response ID is present
    if (!payload.msFormResponseId) {
      return NextResponse.json({ error: "Missing msFormResponseId" }, { status: 400 });
    }

    // Load the active config; reject if recruitment has been turned off
    const active = await getActiveConfig();
    if (!active.isRecruitmentActive) {
      return NextResponse.json(
        { success: false, error: "Recruitment is not active." },
        { status: 403 }
      );
    }

    // Stamp the current cohort from SystemConfig (never trust the external payload)
    payload.generation = active.currentGeneration;
    payload.semester = active.currentSemester;

    console.log("Payload to be inserted:", JSON.stringify(payload, null, 2));

    // 3. Insert directly — Power Automate already produces a fully shaped payload
    const newCandidate = await Candidate.create(payload);

    return NextResponse.json({ success: true, id: newCandidate._id }, { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { SwimCallStatus } from "@/lib/swim-calls";
import { getStoredCallRecords, saveStoredCallRecords } from "@/lib/swim-calls-server";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, callbackDate, observation, reinscriptionIntent } = body;

    const records = await getStoredCallRecords();
    const record = records[id];

    if (!record) {
      return NextResponse.json({ error: "Call record not found" }, { status: 404 });
    }

    if (status) {
      record.status = status as SwimCallStatus;
    }
    if (callbackDate !== undefined) {
      record.callbackDate = callbackDate || null;
    }
    if (observation) {
      record.lastObservation = observation;
    }
    if (reinscriptionIntent) {
      record.reinscriptionIntent = reinscriptionIntent;
    }
    record.updatedAt = new Date().toISOString();

    records[id] = record;
    await saveStoredCallRecords(records);

    await logAdminAction(
      session.user?.id || null,
      "SWIM_CALL_UPDATED",
      `SwimCall:${record.fullName}`,
      JSON.stringify({ status, callbackDate, reinscriptionIntent })
    );

    return NextResponse.json({ success: true, record });
  } catch (err: unknown) {
    logger.error("PATCH admin swim call error:", err);
    return NextResponse.json({ error: "Failed to update call record" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const records = await getStoredCallRecords();
    if (records[id]) {
      const name = records[id].fullName;
      delete records[id];
      await saveStoredCallRecords(records);

      await logAdminAction(
        session.user?.id || null,
        "SWIM_CALL_REMOVED",
        `SwimCall:${name}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error("DELETE admin swim call error:", err);
    return NextResponse.json({ error: "Failed to delete call record" }, { status: 500 });
  }
}

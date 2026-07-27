import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { detectBusinessAnomalies } from "@/lib/anomaly-detector";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const anomalies = await detectBusinessAnomalies();

    return NextResponse.json({
      success: true,
      count: anomalies.length,
      anomalies,
    });
  } catch (err: unknown) {
    console.error("GET business anomalies report error:", err);
    return NextResponse.json(
      { error: "Failed to run anomaly detection" },
      { status: 500 }
    );
  }
}

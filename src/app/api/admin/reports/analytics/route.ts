import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ReportingService } from "@/modules/reports/service";
import { logger } from "@/lib/logger";

const reportingService = new ReportingService();

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const analytics = await reportingService.getAnalytics();
    return NextResponse.json(analytics);
  } catch (err: unknown) {
    logger.error("GET reports analytics API error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

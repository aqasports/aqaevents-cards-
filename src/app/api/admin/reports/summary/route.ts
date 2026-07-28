import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ReportingService } from "@/modules/reports/service";
import { logger } from "@/lib/logger";

const reportingService = new ReportingService();

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const summary = await reportingService.getSummaryReport();
    return NextResponse.json(summary);
  } catch (err: unknown) {
    logger.error("GET reports summary API error:", err);
    return NextResponse.json({ error: "Failed to fetch summary report" }, { status: 500 });
  }
}

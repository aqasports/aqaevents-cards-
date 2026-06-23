import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ReportingService } from "@/domains/reporting/reporting.service";

const reportingService = new ReportingService();

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const analytics = await reportingService.getAnalytics();
    return NextResponse.json(analytics);
  } catch (err: unknown) {
    console.error("GET reports analytics API error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

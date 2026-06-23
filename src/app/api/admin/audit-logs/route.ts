import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { ReportingService } from "@/domains/reporting/reporting.service";

const reportingService = new ReportingService();

export async function GET() {
  const { error } = await requireSuperAdminSession();
  if (error) return error;

  try {
    const logs = await reportingService.getAuditLogs();
    return NextResponse.json(logs);
  } catch (err: unknown) {
    console.error("GET audit logs API error:", err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}

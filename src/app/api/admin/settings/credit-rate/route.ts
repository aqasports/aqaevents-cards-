/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { getCreditRate, setCreditRate } from "@/lib/settings";
import { ReportingRepository } from "@/modules/reports/repository";

const reportingRepo = new ReportingRepository();

export async function GET() {
  try {
    const rate = await getCreditRate();
    return NextResponse.json({ creditRate: rate });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch credit rate" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requireSuperAdminSession();
    if (error || !session) return error;
    const body = await request.json();
    const newRate = parseFloat(body.creditRate);

    if (isNaN(newRate) || newRate <= 0) {
      return NextResponse.json(
        { error: "Invalid credit rate. Must be a positive number." },
        { status: 400 }
      );
    }

    const oldRate = await getCreditRate();
    await setCreditRate(newRate);

    await reportingRepo.createAudit({
      data: {
        userId: session.user.id,
        action: "UPDATE_CREDIT_RATE",
        target: "PlatformSetting:credit_rate_da",
        details: `Changed platform credit rate from ${oldRate} DA to ${newRate} DA.`,
      },
    });

    return NextResponse.json({ success: true, creditRate: newRate });
  } catch (error: any) {
    const status = error.message === "Forbidden" ? 403 : error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update credit rate" },
      { status }
    );
  }
}

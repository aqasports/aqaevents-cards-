import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { poolAdjustmentSchema } from "@/modules/organizations/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await params;

  try {
    const body = await req.json();
    const validated = poolAdjustmentSchema.parse(body);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const newPoolBalance = Math.max(0, org.sharedCreditPool + validated.delta);

    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        sharedCreditPool: newPoolBalance,
      },
    });

    await logAdminAction(
      session.user.id,
      "ADJUST_ORGANIZATION_CREDIT_POOL",
      org.name,
      `Adjusted credit pool for ${org.name} by ${validated.delta > 0 ? "+" : ""}${validated.delta} credits. New pool: ${newPoolBalance}. Reason: ${validated.reason}`
    );

    return NextResponse.json({
      success: true,
      sharedCreditPool: updatedOrg.sharedCreditPool,
      delta: validated.delta,
      reason: validated.reason,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to adjust credit pool" }, { status: 500 });
  }
}

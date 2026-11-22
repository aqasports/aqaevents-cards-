import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma, isSqlite } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { poolAdjustmentSchema } from "@/modules/organizations/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: orgId } = await params;

  try {
    const body = await req.json();
    const validated = poolAdjustmentSchema.parse(body);

    const txResult = await prisma.$transaction(async (tx) => {
      if (!isSqlite && typeof (tx as any).$executeRaw === "function") {
        await (tx as any).$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orgId}))`;
      }

      const org = await tx.organization.findUnique({
        where: { id: orgId },
      });

      if (!org) {
        return null;
      }

      const newPoolBalance = Math.max(0, org.sharedCreditPool + validated.delta);

      const updatedOrg = await tx.organization.update({
        where: { id: orgId },
        data: {
          sharedCreditPool: newPoolBalance,
        },
      });

      return { org, updatedOrg, newPoolBalance };
    });

    if (!txResult) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    await logAdminAction(
      session.user.id,
      "ADJUST_ORGANIZATION_CREDIT_POOL",
      txResult.org.name,
      `Adjusted credit pool for ${txResult.org.name} by ${validated.delta > 0 ? "+" : ""}${validated.delta} credits. New pool: ${txResult.newPoolBalance}. Reason: ${validated.reason}`
    );

    return NextResponse.json({
      success: true,
      sharedCreditPool: txResult.updatedOrg.sharedCreditPool,
      delta: validated.delta,
      reason: validated.reason,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to adjust credit pool" }, { status: 500 });
  }
}

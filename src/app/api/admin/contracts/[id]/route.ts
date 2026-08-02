import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ContractsService } from "@/modules/contracts/service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (err: any) {
    logger.error("GET contract detail error:", err);
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const service = new ContractsService();

    const updated = await service.updateContract(id, body, session.user.id);
    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error("PATCH contract detail error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update contract" }, { status: 400 });
  }
}

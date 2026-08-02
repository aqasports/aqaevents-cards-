import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { ContractsService } from "@/modules/contracts/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const { id } = await params;
    const service = new ContractsService();
    const contracts = await service.getContracts(id);
    return NextResponse.json(contracts);
  } catch (err: any) {
    logger.error("GET organization contracts error:", err);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const service = new ContractsService();

    const contract = await service.createContract(
      {
        ...body,
        organizationId: id,
      },
      session.user.id
    );

    return NextResponse.json(contract, { status: 201 });
  } catch (err: any) {
    logger.error("POST contract error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create contract" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const { contractId, ...updates } = body;

    if (!contractId) {
      return NextResponse.json({ error: "contractId is required" }, { status: 400 });
    }

    const service = new ContractsService();
    const updated = await service.updateContract(contractId, updates, session.user.id);

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error("PATCH contract error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update contract" }, { status: 400 });
  }
}

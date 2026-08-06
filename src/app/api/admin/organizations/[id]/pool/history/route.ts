import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id: orgId } = await params;

  try {
    // Get all clients in this org
    const orgClients = await prisma.client.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    const clientIds = orgClients.map((c) => c.id);

    if (clientIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get ledger entries that are pool allocations for these clients
    const allocations = await prisma.ledgerEntry.findMany({
      where: {
        clientId: { in: clientIds },
        reason: { startsWith: "Pool allocation" },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        delta: true,
        reason: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: { select: { name: true } },
          },
        },
        card: {
          select: {
            id: true,
            cardCode: true,
          },
        },
      },
    });

    return NextResponse.json(allocations);
  } catch (err: unknown) {
    logger.error("GET pool history error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch allocation history" },
      { status: 500 }
    );
  }
}

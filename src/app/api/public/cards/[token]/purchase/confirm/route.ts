/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { PurchaseRequestsService } from "@/modules/purchase-requests/service";
import { checkAndIncrement } from "@/lib/rate-limit";

const purchaseRequestsService = new PurchaseRequestsService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { limited } = await checkAndIncrement(`purchase-confirm:${ip}`, { windowMs: 60_000, max: 15 });
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;

  const card = await prisma.card.findUnique({
    where: { publicToken: token },
  });

  if (!card || card.status !== "active" || !card.clientId) {
    return NextResponse.json({ error: "Card not found or inactive" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { requestId, confirmationCode } = body;

    if (!requestId || !confirmationCode) {
      return NextResponse.json(
        { error: "Missing requestId or confirmationCode" },
        { status: 400 }
      );
    }

    const result = await purchaseRequestsService.confirmPurchaseRequest({
      requestId,
      confirmationCode: String(confirmationCode).trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Purchase confirmed successfully.",
      invoice: result.invoice,
      balance: result.balance,
    });
  } catch (err: any) {
    const message = err?.message || "Failed to confirm purchase request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const sinceStr = searchParams.get("since");
  let validSinceDate: Date | null = null;

  if (sinceStr) {
    const parsedDate = new Date(sinceStr);
    if (!isNaN(parsedDate.getTime())) {
      validSinceDate = parsedDate;
    }
  }

  try {
    const [
      unpaidInvoices,
      demandsCount,
      proposalsCount,
      checkInsCount,
      swimCount,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          status: "unpaid",
          notes: {
            startsWith: "{",
            endsWith: "}",
          },
        },
        select: {
          notes: true,
        },
      }),
      prisma.cardDemand.count({
        where: { status: "pending" },
      }),
      prisma.activityProposal.count({
        where: { status: "pending" },
      }),
      validSinceDate
        ? prisma.checkIn.count({
            where: {
              status: "SUCCESS",
              scannedAt: {
                gt: validSinceDate,
              },
            },
          })
        : Promise.resolve(0),
      prisma.swimLead.count({
        where: { status: "pending" },
      }),
    ]);

    let pendingInvoicesCount = 0;
    for (const inv of unpaidInvoices) {
      if (inv.notes) {
        try {
          const parsed = JSON.parse(inv.notes);
          if (parsed && (parsed.type === "package" || parsed.type === "custom")) {
            pendingInvoicesCount++;
          }
        } catch {
          // Ignore malformed JSON notes
        }
      }
    }

    return NextResponse.json({
      invoices: pendingInvoicesCount,
      demands: demandsCount,
      proposals: proposalsCount,
      checkIns: checkInsCount,
      swim: swimCount,
    });
  } catch (err: unknown) {
    logger.error("GET admin nav-counts API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch navigation counts" },
      { status: 500 }
    );
  }
}

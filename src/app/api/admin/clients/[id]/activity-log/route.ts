import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export type ActivityLogEntry = {
  id: string;
  type:
    | "redeem"
    | "topup"
    | "manual_adjustment"
    | "invoice_paid"
    | "invoice_unpaid"
    | "invoice_refunded"
    | "invoice_created"
    | "card_issued";
  timestamp: string;
  title: string;
  subtitle: string | null;
  delta: number | null; // credit change
  amountDA: number | null; // monetary amount in DA
  staff: string | null;
  meta: Record<string, string | number | null>;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    // Fetch all data in parallel
    const [ledgerEntries, redemptions, invoices, cards] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          delta: true,
          type: true,
          reason: true,
          createdAt: true,
          redemptionId: true,
          package: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      }),
      prisma.redemption.findMany({
        where: { clientId: id },
        orderBy: { redeemedAt: "desc" },
        select: {
          id: true,
          creditsUsed: true,
          redeemedAt: true,
          notes: true,
          activity: { select: { name: true } },
          session: { select: { sessionDate: true, location: true } },
          staff: { select: { name: true } },
        },
      }),
      prisma.invoice.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceCode: true,
          amount: true,
          status: true,
          category: true,
          items: true,
          notes: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      prisma.card.findMany({
        where: { clientId: id },
        orderBy: { issuedAt: "desc" },
        select: {
          id: true,
          cardCode: true,
          status: true,
          issuedAt: true,
        },
      }),
    ]);

    const entries: ActivityLogEntry[] = [];

    // 1. Process redemptions
    const redemptionIds = new Set(redemptions.map((r) => r.id));
    for (const r of redemptions) {
      entries.push({
        id: `redeem-${r.id}`,
        type: "redeem",
        timestamp: r.redeemedAt.toISOString(),
        title: `Activity redeemed: ${r.activity.name}`,
        subtitle: r.session
          ? `Session: ${new Date(r.session.sessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${r.session.location ? ` · ${r.session.location}` : ""}`
          : r.notes ?? null,
        delta: -r.creditsUsed,
        amountDA: null,
        staff: r.staff?.name ?? null,
        meta: {
          activityName: r.activity.name,
          creditsUsed: r.creditsUsed,
          sessionDate: r.session?.sessionDate
            ? new Date(r.session.sessionDate).toISOString()
            : null,
          location: r.session?.location ?? null,
          notes: r.notes ?? null,
        },
      });
    }

    // 2. Process ledger entries that are NOT linked to a redemption (avoid double-counting)
    for (const entry of ledgerEntries) {
      if (entry.redemptionId && redemptionIds.has(entry.redemptionId)) {
        // This is the credit debit for a redemption — already covered above
        continue;
      }

      let type: ActivityLogEntry["type"];
      let title: string;

      if (entry.delta > 0) {
        if (entry.package) {
          type = "topup";
          title = `Top-up: ${entry.package.name}`;
        } else {
          type = "topup";
          title = entry.reason ? `Top-up: ${entry.reason}` : "Credit top-up";
        }
      } else if (entry.type === "REDEEM" || entry.type === "redeem") {
        // Orphan redeem ledger entry (activity was deleted etc.)
        type = "redeem";
        title = entry.reason ? `Redeem: ${entry.reason}` : "Activity redeemed";
      } else {
        type = "manual_adjustment";
        title = entry.reason
          ? `Adjustment: ${entry.reason}`
          : `Manual adjustment (${entry.delta > 0 ? "+" : ""}${entry.delta.toFixed(2)} credits)`;
      }

      entries.push({
        id: `ledger-${entry.id}`,
        type,
        timestamp: entry.createdAt.toISOString(),
        title,
        subtitle: entry.package?.name
          ? null
          : entry.reason
            ? null
            : null,
        delta: entry.delta,
        amountDA: null,
        staff: entry.createdBy?.name ?? null,
        meta: {
          ledgerType: entry.type,
          reason: entry.reason ?? null,
          packageName: entry.package?.name ?? null,
        },
      });
    }

    // 3. Process invoices — one entry per invoice (creation + paid events)
    for (const inv of invoices) {
      // Invoice created
      entries.push({
        id: `invoice-created-${inv.id}`,
        type: "invoice_created",
        timestamp: inv.createdAt.toISOString(),
        title: `Invoice created: ${inv.invoiceCode}`,
        subtitle: inv.items,
        delta: null,
        amountDA: inv.amount,
        staff: null,
        meta: {
          invoiceCode: inv.invoiceCode,
          status: inv.status,
          category: inv.category,
          items: inv.items,
        },
      });

      // If paid and paidAt differs from createdAt (status change event)
      if (inv.status === "paid" && inv.paidAt) {
        const paidAt = new Date(inv.paidAt);
        const createdAt = new Date(inv.createdAt);
        const diffMs = Math.abs(paidAt.getTime() - createdAt.getTime());
        // Only emit a separate "paid" event if paid more than 1 minute after creation
        if (diffMs > 60_000) {
          entries.push({
            id: `invoice-paid-${inv.id}`,
            type: "invoice_paid",
            timestamp: paidAt.toISOString(),
            title: `Invoice paid: ${inv.invoiceCode}`,
            subtitle: `${inv.amount.toLocaleString()} DA`,
            delta: null,
            amountDA: inv.amount,
            staff: null,
            meta: {
              invoiceCode: inv.invoiceCode,
              category: inv.category,
              items: inv.items,
            },
          });
        }
      }

      if (inv.status === "refunded") {
        entries.push({
          id: `invoice-refunded-${inv.id}`,
          type: "invoice_refunded",
          timestamp: inv.paidAt ? new Date(inv.paidAt).toISOString() : inv.createdAt.toISOString(),
          title: `Invoice refunded: ${inv.invoiceCode}`,
          subtitle: `${inv.amount.toLocaleString()} DA`,
          delta: null,
          amountDA: inv.amount,
          staff: null,
          meta: {
            invoiceCode: inv.invoiceCode,
            category: inv.category,
            items: inv.items,
          },
        });
      }

      if (inv.status === "unpaid") {
        entries.push({
          id: `invoice-unpaid-${inv.id}`,
          type: "invoice_unpaid",
          timestamp: inv.createdAt.toISOString(),
          title: `Invoice marked unpaid: ${inv.invoiceCode}`,
          subtitle: `${inv.amount.toLocaleString()} DA`,
          delta: null,
          amountDA: inv.amount,
          staff: null,
          meta: {
            invoiceCode: inv.invoiceCode,
            category: inv.category,
            items: inv.items,
          },
        });
      }
    }

    // 4. Card issuance events
    for (const card of cards) {
      entries.push({
        id: `card-${card.id}`,
        type: "card_issued",
        timestamp: card.issuedAt.toISOString(),
        title: card.status === "voided" ? `Card voided: ${card.cardCode}` : `Card issued: ${card.cardCode}`,
        subtitle: card.status === "voided" ? "Card deactivated (reissued)" : "Physical card assigned to client",
        delta: null,
        amountDA: null,
        staff: null,
        meta: {
          cardCode: card.cardCode,
          status: card.status,
        },
      });
    }

    // Sort all entries by timestamp desc (most recent first)
    entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json(entries, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (err: unknown) {
    logger.error("GET client activity-log API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 },
    );
  }
}

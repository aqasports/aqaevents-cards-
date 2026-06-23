import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const CONFIRM_PHRASE = "ERASE ALL DATA";

const resetSchema = z.object({
  scope: z.enum([
    "transactions",   // ledger + invoices
    "redemptions",    // redemptions only
    "sessions",       // activity sessions
    "expenses",       // activity expenses
    "clients",        // clients + cards + all their data
    "invoices",       // invoices only
    "all_operational",// everything except admin users, packages, activities config
  ]),
  confirm: z.string(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  // Only super_admin can erase data
  if (session.user.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only super admins can erase data." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = resetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { scope, confirm } = parsed.data;

  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation phrase must be exactly: "${CONFIRM_PHRASE}"` },
      { status: 400 },
    );
  }

  try {
    let deleted: Record<string, number | string> = {};

    switch (scope) {
      case "invoices": {
        const r = await prisma.invoice.deleteMany();
        deleted = { invoices: r.count };
        break;
      }

      case "transactions": {
        const [le, inv] = await prisma.$transaction([
          prisma.ledgerEntry.deleteMany(),
          prisma.invoice.deleteMany(),
        ]);
        deleted = { ledgerEntries: le.count, invoices: inv.count };
        break;
      }

      case "redemptions": {
        // ledger entries linked to redemptions are cascade-deleted via DB
        const r = await prisma.redemption.deleteMany();
        deleted = { redemptions: r.count };
        break;
      }

      case "sessions": {
        const r = await prisma.activitySession.deleteMany();
        deleted = { sessions: r.count };
        break;
      }

      case "expenses": {
        const r = await prisma.activityExpense.deleteMany();
        deleted = { expenses: r.count };
        break;
      }

      case "clients": {
        // Cascades: cards, ledgerEntries, redemptions, invoices
        const r = await prisma.client.deleteMany();
        deleted = { clients: r.count };
        break;
      }

      case "all_operational": {
        // Order matters for FK constraints — delete children first
        await prisma.$transaction([
          prisma.ledgerEntry.deleteMany(),
          prisma.invoice.deleteMany(),
          prisma.redemption.deleteMany(),
          prisma.activitySession.deleteMany(),
          prisma.activityExpense.deleteMany(),
          prisma.card.deleteMany(),
          prisma.client.deleteMany(),
        ]);
        deleted = { cleared: "all operational data erased" };

        break;
      }
    }

    await logAdminAction(
      session.user.id,
      "RESET_DATA",
      `Scope: ${scope}`,
      `Reset data scope: ${scope}. Deleted records: ${JSON.stringify(deleted)}`
    );

    return NextResponse.json({
      success: true,
      scope,
      deleted,
      message: `Data scope "${scope}" has been permanently erased.`,
    });
  } catch (err: unknown) {
    console.error("Data reset error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Database error during data reset: ${details}` },
      { status: 500 },
    );
  }
}

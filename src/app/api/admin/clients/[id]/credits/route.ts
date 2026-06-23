import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { getClientBalance } from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { sendSimulatedNotification } from "@/lib/notifications";

function generateInvoiceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "INV-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueInvoiceCode(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  let code = generateInvoiceCode();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await tx.invoice.findUnique({ where: { invoiceCode: code } });
    if (!existing) return code;
    code = generateInvoiceCode();
  }
}

const addCreditsSchema = z.object({
  // Credit fields
  packageId: z.string().optional(),
  customAmount: z.number().int().optional(),
  reason: z.string().optional(),
  // Invoice fields (all optional — omit to skip invoice creation)
  invoice: z
    .object({
      amount: z.number().int().positive(),
      category: z.enum(["package", "custom", "adhoc"]).default("custom"),
      items: z.string().min(1),
      notes: z.string().optional(),
      status: z.enum(["paid", "unpaid"]).default("paid"),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: clientId } = await params;
  const body = await request.json();
  const parsed = addCreditsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { cards: { where: { status: "active" }, take: 1 } },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let delta = parsed.data.customAmount ?? 0;
  let packageId: string | undefined;
  let reason = parsed.data.reason;
  let pkgData: { name: string; creditAmount: number; bonusCredits: number; totalCredits: number; price: number } | null = null;

  if (parsed.data.packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: parsed.data.packageId },
    });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    delta = pkg.totalCredits;
    packageId = pkg.id;
    pkgData = pkg;
    reason = reason ?? `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`;
  }

  if (delta === 0) {
    return NextResponse.json(
      { error: "Provide packageId or a non-zero customAmount" },
      { status: 400 },
    );
  }

  try {
    const { entry, invoice } = await prisma.$transaction(async (tx) => {
      // 1. Create ledger entry
      const ledger = await tx.ledgerEntry.create({
        data: {
          clientId,
          cardId: client.cards[0]?.id || null,
          packageId: packageId || null,
          delta,
          type: delta > 0 ? "credit" : "debit",
          reason: reason || (delta > 0 ? "Manual credit addition" : "Manual debit adjustment"),
          createdById: session.user.id,
        },
      });

      // 2. Optionally create linked invoice
      let inv = null;
      if (parsed.data.invoice) {
        const { amount, category, items, notes, status } = parsed.data.invoice;
        const code = await uniqueInvoiceCode(tx);
        inv = await tx.invoice.create({
          data: {
            clientId,
            invoiceCode: code,
            amount,
            category,
            items,
            notes: notes ?? null,
            status,
            paidAt: status === "paid" ? new Date() : null,
          },
        });
      } else if (pkgData) {
        // Auto-generate a package invoice even if caller didn't provide one
        const code = await uniqueInvoiceCode(tx);
        inv = await tx.invoice.create({
          data: {
            clientId,
            invoiceCode: code,
            amount: pkgData.price,
            category: "package",
            items: `${pkgData.name} Package — ${pkgData.creditAmount} credits + ${pkgData.bonusCredits} bonus (${pkgData.totalCredits} total)`,
            notes: reason ?? null,
            status: "paid",
            paidAt: new Date(),
          },
        });
      }

      return { entry: ledger, invoice: inv };
    });

    const balance = await getClientBalance(clientId);

    // 1. Audit Log Action
    await logAdminAction(
      session.user.id,
      "RECHARGE_CLIENT",
      `Client ${client.fullName}`,
      `Recharged ${client.fullName} with ${delta} credits. Reason: ${reason}. New Balance: ${balance} credits.`
    );

    // 2. Simulated Notifications
    const notificationMessage = `Hello ${client.fullName}, a balance adjustment of ${delta > 0 ? `+${delta}` : delta} credits has been applied to your AQA Sports event card. Your current balance is: ${balance} credits.`;

    if (client.phone) {
      await sendSimulatedNotification(
        clientId,
        "sms",
        client.phone,
        `AQA Sports: ${notificationMessage}`
      );
    }

    if (client.email) {
      await sendSimulatedNotification(
        clientId,
        "email",
        client.email,
        notificationMessage,
        "AQA Sports Event Card Balance Update"
      );
    }

    return NextResponse.json({ entry, invoice, balance });
  } catch (err: unknown) {
    console.error("Add credits API database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Database error during credit transaction: ${details}. If you recently reset the database, please try logging out of the admin panel and logging back in to refresh your session.`,
      },
      { status: 500 },
    );
  }
}

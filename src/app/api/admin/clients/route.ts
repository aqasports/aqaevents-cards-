import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { getClientBalances } from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
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

const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  packageId: z.string().optional(),
  issueCard: z.boolean().default(true),
  preCardCode: z.string().optional(), // existing pre-printed blank card code to claim
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") ?? "0", 10) || undefined;

  const where = search
    ? {
        OR: [
          { fullName: { contains: search } },
        ],
      }
    : undefined;

  const clients = await prisma.client.findMany({
    where,
    include: {
      cards: {
        where: { status: "active" },
        take: 1,
        orderBy: { issuedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const balances = await getClientBalances(clients.map((client) => client.id));

  return NextResponse.json(
    clients.map((client) => ({
      id: client.id,
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      balance: balances.get(client.id) ?? 0,
      card: client.cards[0] ?? null,
      createdAt: client.createdAt,
    })),
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          fullName: data.fullName,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
        },
      });

      let card = null;
      if (data.preCardCode) {
        // Claim a pre-printed blank card by its code
        const existing = await tx.card.findUnique({
          where: { cardCode: data.preCardCode.trim().toUpperCase() },
        });
        if (!existing) throw new Error(`Card code "${data.preCardCode}" not found. Generate it first from the Print page.`);
        if (existing.clientId) throw new Error(`Card ${data.preCardCode} is already assigned to another client.`);
        card = await tx.card.update({
          where: { id: existing.id },
          data: { clientId: client.id },
        });
      } else if (data.issueCard) {
        // Generate a brand-new card
        card = await tx.card.create({
          data: {
            clientId: client.id,
            publicToken: generatePublicToken(),
            cardCode: generateCardCode(),
          },
        });
      }

      if (data.packageId) {
        const pkg = await tx.package.findUnique({ where: { id: data.packageId } });
        if (!pkg) {
          throw new Error("Package not found");
        }

        await tx.ledgerEntry.create({
          data: {
            clientId: client.id,
            cardId: card?.id || null,
            packageId: pkg.id,
            delta: pkg.totalCredits,
            type: "credit",
            reason: `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`,
            createdById: session.user.id,
          },
        });

        // Auto-create invoice for initial package
        let invoiceCode = generateInvoiceCode();
        let codeExists = await tx.invoice.findUnique({ where: { invoiceCode } });
        while (codeExists) {
          invoiceCode = generateInvoiceCode();
          codeExists = await tx.invoice.findUnique({ where: { invoiceCode } });
        }
        await tx.invoice.create({
          data: {
            clientId: client.id,
            invoiceCode,
            amount: pkg.price,
            category: "package",
            items: `${pkg.name} Package — ${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus (${pkg.totalCredits} total) · New client signup`,
            status: "paid",
            paidAt: new Date(),
          },
        });
      }

      return { client, card };
    });

    const balance = await getClientBalances([result.client.id]);
    const finalBalance = balance.get(result.client.id) ?? 0;

    // 1. Audit Log Action
    await logAdminAction(
      session.user.id,
      "CREATE_CLIENT",
      `Client ${result.client.fullName}`,
      `Created client ${result.client.fullName} (${result.client.email || "No email"}). Card code: ${result.card?.cardCode || "None"}. Initial Balance: ${finalBalance} credits.`
    );

    // 2. Welcome Email
    if (result.client.email) {
      await sendSimulatedNotification(
        result.client.id,
        "email",
        result.client.email,
        `Welcome to AQA Sports, ${result.client.fullName}! Your prepaid card is now active. Card Code: ${result.card?.cardCode || "None"}. Scan the QR code to track your activity balance online anytime.`,
        "Welcome to AQA Sports!"
      );
    }

    // 3. Welcome SMS
    if (result.client.phone) {
      await sendSimulatedNotification(
        result.client.id,
        "sms",
        result.client.phone,
        `AQA Sports: Welcome ${result.client.fullName}! Your event card is active. Code: ${result.card?.cardCode || "None"}. Initial Balance: ${finalBalance} credits.`
      );
    }

    // 4. Recharge SMS (if package purchased)
    if (data.packageId && result.client.phone) {
      await sendSimulatedNotification(
        result.client.id,
        "sms",
        result.client.phone,
        `AQA Sports: Recharge successful. Loaded package credits. Your current balance is: ${finalBalance} activities.`
      );
    }

    return NextResponse.json(
      {
        ...result.client,
        balance: finalBalance,
        card: result.card,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Create client API database error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Database error during client creation: ${details}. If you recently reset the database, please try logging out of the admin panel and logging back in to refresh your session.`
      },
      { status: 500 }
    );
  }
}

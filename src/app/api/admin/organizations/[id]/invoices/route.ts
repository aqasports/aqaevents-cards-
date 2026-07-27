import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveCreditRateForClient } from "@/lib/organizations";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

function generateInvoiceCode(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "INV-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueInvoiceCode(): Promise<string> {
  let code = generateInvoiceCode();
  while (true) {
    const existing = await prisma.invoice.findUnique({ where: { invoiceCode: code } });
    if (!existing) return code;
    code = generateInvoiceCode();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: organizationId } = await params;

  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json(invoices);
  } catch (err: unknown) {
    console.error("GET organization invoices error:", err);
    return NextResponse.json(
      { error: "Failed to fetch organization invoices" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: organizationId } = await params;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { clients: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!org.clients || org.clients.length === 0) {
      return NextResponse.json(
        { error: "Organization has no member clients to attach invoice to" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { category, items, notes, totalCreditsPurchased, customAmount } = body;

    const firstClientId = org.clients[0].id;
    const effectiveRate = await getEffectiveCreditRateForClient(firstClientId);

    let amount = 0;
    const creditsToTopUp = Number(totalCreditsPurchased) || 0;
    const specifiedCustomAmount = Number(customAmount) || 0;

    if (specifiedCustomAmount > 0) {
      amount = Math.round(specifiedCustomAmount);
    } else if (creditsToTopUp > 0) {
      amount = Math.round(creditsToTopUp * effectiveRate);
    } else {
      return NextResponse.json(
        { error: "Either customAmount > 0 or totalCreditsPurchased > 0 is required" },
        { status: 400 }
      );
    }

    const invoiceCode = await uniqueInvoiceCode();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          clientId: firstClientId,
          organizationId,
          invoiceCode,
          amount,
          category: category?.trim() || "B2B Organization",
          items: items?.trim() || `Consolidated B2B Invoice for ${org.name}`,
          notes: notes?.trim() || null,
          status: "paid",
          paidAt: new Date(),
        },
      });

      if (creditsToTopUp > 0) {
        await tx.organization.update({
          where: { id: organizationId },
          data: {
            sharedCreditPool: {
              increment: creditsToTopUp,
            },
          },
        });
      }

      return createdInvoice;
    });

    await logAdminAction(
      session.user.id,
      "CREATE_ORG_INVOICE",
      `Invoice ${invoiceCode} for Org ${org.name}`,
      `Consolidated invoice created. Amount: ${amount} DA, Credits added to pool: ${creditsToTopUp}`,
      ip
    );

    return NextResponse.json(invoice, { status: 201 });
  } catch (err: unknown) {
    console.error("POST organization invoice error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Invoice creation failed: ${details}` },
      { status: 500 }
    );
  }
}

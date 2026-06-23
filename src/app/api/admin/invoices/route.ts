import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";

function generateInvoiceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "INV-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "paid" | "unpaid" | "refunded" | null
  const search = searchParams.get("search"); // client name or invoice code

  const where: Record<string, unknown> = {};
  if (status && status !== "all") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { invoiceCode: { contains: search } },
      { client: { fullName: { contains: search } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: {
        select: { id: true, fullName: true, phone: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Financial totals
  const [totals] = await prisma.$queryRaw<
    { total_invoiced: number; paid_amount: number; unpaid_amount: number; refunded_amount: number }[]
  >`
    SELECT
      COALESCE(SUM(amount), 0) as total_invoiced,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
      COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) as unpaid_amount,
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refunded_amount
    FROM Invoice
  `;

  const [expenseTotals] = await prisma.$queryRaw<{ total_expenses: number }[]>`
    SELECT COALESCE(SUM(amount), 0) as total_expenses FROM ActivityExpense
  `;

  const paidAmount = Number(totals.paid_amount);
  const expenses = Number(expenseTotals.total_expenses);

  return NextResponse.json({
    invoices,
    stats: {
      totalInvoiced: Number(totals.total_invoiced),
      paidRevenue: paidAmount,
      unpaidOutstanding: Number(totals.unpaid_amount),
      refundedAmount: Number(totals.refunded_amount),
      totalExpenses: expenses,
      netProfit: paidAmount - expenses,
    },
  });
}

const createInvoiceSchema = z.object({
  clientId: z.string(),
  amount: z.number().positive(),
  category: z.enum(["package", "custom", "adhoc"]),
  items: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(["paid", "unpaid"]).default("paid"),
  // Credit-affecting fields (optional, only for package/custom)
  packageId: z.string().optional(),
  creditDelta: z.number().optional(),
  creditReason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    clientId,
    amount,
    category,
    items,
    notes,
    status,
    packageId,
    creditDelta,
    creditReason,
  } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { cards: { where: { status: "active" }, take: 1 } },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Generate a unique invoice code
  let invoiceCode = generateInvoiceCode();
  // Retry if collision (extremely rare)
  let codeExists = await prisma.invoice.findUnique({ where: { invoiceCode } });
  while (codeExists) {
    invoiceCode = generateInvoiceCode();
    codeExists = await prisma.invoice.findUnique({ where: { invoiceCode } });
  }

  // Run as a transaction to keep invoice + optional ledger atomic
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        clientId,
        invoiceCode,
        amount,
        category,
        items,
        notes: notes ?? null,
        status,
        paidAt: status === "paid" ? new Date() : null,
      },
    });

    let ledgerEntry = null;
    if (creditDelta && creditDelta !== 0 && category !== "adhoc") {
      let pkgIdVal: string | null = null;
      if (packageId) {
        const pkg = await tx.package.findUnique({ where: { id: packageId } });
        if (pkg) pkgIdVal = pkg.id;
      }
      ledgerEntry = await tx.ledgerEntry.create({
        data: {
          clientId,
          cardId: client.cards[0]?.id ?? null,
          packageId: pkgIdVal,
          delta: creditDelta,
          type: creditDelta > 0 ? "credit" : "debit",
          reason: creditReason ?? `Invoice ${invoiceCode}: ${items}`,
          createdById: session.user.id,
        },
      });
    }

    return { invoice, ledgerEntry };
  });

  const balance = await getClientBalance(clientId);

  return NextResponse.json({ ...result, balance }, { status: 201 });
}

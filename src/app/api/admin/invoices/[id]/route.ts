import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";
import { syncClientCRM } from "@/lib/crm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, fullName: true, phone: true, email: true },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

const patchSchema = z.object({
  status: z.enum(["paid", "unpaid", "refunded"]).optional(),
  notes: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  category: z.enum(["package", "custom", "adhoc"]).optional(),
  items: z.string().min(1).optional(),
  createdAt: z.string().optional(),
  paidAt: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { include: { cards: { where: { status: "active" }, take: 1 } } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { status, notes, amount, category, items, createdAt, paidAt } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes;
  if (amount !== undefined) updateData.amount = amount;
  if (category !== undefined) updateData.category = category;
  if (items !== undefined) updateData.items = items;
  if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);
  if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null;

  if (status) {
    updateData.status = status;
    if (status === "paid" && invoice.status !== "paid") {
      if (paidAt === undefined) {
        updateData.paidAt = new Date();
      }
    } else if (status === "unpaid") {
      updateData.paidAt = null;
    }
    // If refunding a paid invoice that credited the client, write a reversal debit
    if (status === "refunded" && invoice.status === "paid" && invoice.category !== "adhoc") {
      // Find the ledger entry created alongside this invoice by matching reason
      const matchingEntry = await prisma.ledgerEntry.findFirst({
        where: {
          clientId: invoice.clientId,
          reason: { contains: invoice.invoiceCode },
        },
        orderBy: { createdAt: "desc" },
      });

      if (matchingEntry && matchingEntry.delta > 0) {
        await prisma.ledgerEntry.create({
          data: {
            clientId: invoice.clientId,
            cardId: invoice.client.cards[0]?.id ?? null,
            delta: -matchingEntry.delta,
            type: "debit",
            reason: `Refund: Invoice ${invoice.invoiceCode} reversed`,
            createdById: session.user.id,
          },
        });
      }
    }
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      client: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  });

  await syncClientCRM(invoice.clientId);
  const balance = await getClientBalance(invoice.clientId);
  return NextResponse.json({ invoice: updated, balance });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  await prisma.invoice.delete({ where: { id } });
  await syncClientCRM(invoice.clientId);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/clients/[id]/not-paid
 * Returns whether the client currently has a "not paid" flag active.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  const flag = await prisma.invoice.findFirst({
    where: { clientId: id, category: "not_paid_flag" },
    select: { id: true },
  });

  return NextResponse.json({ isNotPaid: !!flag });
}

/**
 * POST /api/admin/clients/[id]/not-paid
 * Sets the "not paid" flag on the client by creating a marker invoice.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  // Ensure client exists
  const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Idempotent: if flag already exists, return it
  const existing = await prisma.invoice.findFirst({
    where: { clientId: id, category: "not_paid_flag" },
  });
  if (existing) {
    return NextResponse.json({ isNotPaid: true });
  }

  // Generate a unique invoice code for the marker
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  const invoiceCode = `NP-${ts}-${rand}`;

  await prisma.invoice.create({
    data: {
      clientId: id,
      invoiceCode,
      amount: 0,
      category: "not_paid_flag",
      items: "Not Paid Flag",
      notes: "Admin-flagged as not paid. Visible on client portal.",
      status: "unpaid",
    },
  });

  return NextResponse.json({ isNotPaid: true });
}

/**
 * DELETE /api/admin/clients/[id]/not-paid
 * Clears the "not paid" flag by removing all marker invoices for this client.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  await prisma.invoice.deleteMany({
    where: { clientId: id, category: "not_paid_flag" },
  });

  return NextResponse.json({ isNotPaid: false });
}

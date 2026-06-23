import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { getClientBalance } from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { syncClientCRM } from "@/lib/crm";
const updateClientSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      cards: { orderBy: { issuedAt: "desc" } },
      ledgerEntries: {
        include: {
          package: true,
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      redemptions: {
        include: {
          activity: true,
          session: true,
          staff: { select: { name: true } },
        },
        orderBy: { redeemedAt: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const balance = await getClientBalance(id);

  return NextResponse.json({ ...client, balance });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email === "" ? null : parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      leadSource: parsed.data.leadSource,
    },
  });

  await syncClientCRM(id);

  await logAdminAction(
    session.user.id,
    "UPDATE_CLIENT",
    `Client ${client.fullName}`,
    `Updated client information for ${client.fullName} (email: ${client.email}, phone: ${client.phone}).`
  );

  return NextResponse.json(client);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const hasHistory = await prisma.$transaction(async (tx) => {
      const ledgerCount = await tx.ledgerEntry.count({
        where: { clientId: id },
      });
      if (ledgerCount > 0) {
        return true;
      }

      // If no history, delete child records and the client
      // 1. Delete all redemptions
      await tx.redemption.deleteMany({
        where: { clientId: id },
      });

      // 2. Delete all cards
      await tx.card.deleteMany({
        where: { clientId: id },
      });

      // 3. Delete the client
      await tx.client.delete({
        where: { id },
      });

      return false;
    });

    if (hasHistory) {
      return NextResponse.json(
        { error: "Cannot delete a client with financial ledger history. Archive them or update their status in notes instead." },
        { status: 400 },
      );
    }

    await logAdminAction(
      session.user.id,
      "DELETE_CLIENT",
      `Client ID ${id}`,
      `Deleted client ID ${id} and all related non-financial records.`
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Delete client database error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error during client deletion." },
      { status: 500 },
    );
  }
}

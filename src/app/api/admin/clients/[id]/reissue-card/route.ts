import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const card = await prisma.$transaction(async (tx) => {
    await tx.card.updateMany({
      where: { clientId, status: "active" },
      data: { status: "replaced" },
    });

    return tx.card.create({
      data: {
        clientId,
        publicToken: generatePublicToken(),
        cardCode: generateCardCode(),
      },
    });
  });

  return NextResponse.json(card);
}

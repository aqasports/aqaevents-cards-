import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generatePublicToken, generateOrgCardPrefix, getEventCardUrl } from "@/lib/tokens";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

const createOrgCardsSchema = z.object({
  count: z.number().int().min(1).max(200),
  qrSize: z.number().int().min(100).max(800).default(400),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id: orgId } = await params;

  try {
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          { organizationId: orgId },
          { client: { organizationId: orgId } },
        ],
      },
      orderBy: { cardCode: "asc" },
      select: {
        id: true,
        cardCode: true,
        publicToken: true,
        status: true,
        issuedAt: true,
        clientId: true,
        organizationId: true,
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(cards);
  } catch (err: unknown) {
    logger.error("GET org cards error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch cards" },
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

  const { id: orgId } = await params;

  try {
    const body = await request.json();
    const { count, qrSize } = createOrgCardsSchema.parse(body);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const prefix = generateOrgCardPrefix(org.name);

    const created: Array<{ id: string; cardCode: string; publicToken: string; url: string; qrDataUrl: string }> = [];

    await prisma.$transaction(
      async (tx) => {
        const latest = await tx.card.findFirst({
          where: { cardCode: { startsWith: `${prefix}-` } },
          orderBy: { cardCode: "desc" },
          select: { cardCode: true },
        });

        let nextNum = 1;
        if (latest) {
          const parts = latest.cardCode.split("-");
          const num = parseInt(parts[1] ?? "0", 10);
          if (!isNaN(num)) nextNum = num + 1;
        }

        for (let i = 0; i < count; i++) {
          const cardCode = `${prefix}-${String(nextNum + i).padStart(6, "0")}`;
          const publicToken = generatePublicToken();

          const card = await tx.card.create({
            data: {
              clientId: null,
              organizationId: orgId,
              publicToken,
              cardCode,
              status: "active",
            },
          });

          const url = getEventCardUrl(publicToken);
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: qrSize,
            margin: 1,
            color: { dark: "#0f172a", light: "#ffffff" },
          });

          created.push({ id: card.id, cardCode, publicToken, url, qrDataUrl });
        }
      },
      { timeout: 60000 }
    );

    await logAdminAction(
      session.user.id,
      "CREATE_ORG_CARDS",
      org.name,
      `Generated ${count} blank cards for ${org.name} (${prefix}-prefixed)`
    );

    return NextResponse.json({
      cards: created,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    logger.error("POST org cards error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create cards" },
      { status: 500 }
    );
  }
}

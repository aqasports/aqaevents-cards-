import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generatePublicToken } from "@/lib/tokens";
import QRCode from "qrcode";
import { getEventCardUrl } from "@/lib/tokens";

const batchSchema = z.object({
  count: z.number().int().min(1).max(200),
  qrSize: z.number().int().min(100).max(800).default(400),
});

// Generate a sequential card code: AQA-000001, AQA-000002, …
async function nextCardCode(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  // Find highest existing sequential code
  const latest = await tx.card.findFirst({
    where: { cardCode: { startsWith: "AQA-" } },
    orderBy: { cardCode: "desc" },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.cardCode.split("-");
    const num = parseInt(parts[1] ?? "0", 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `AQA-${String(nextNum).padStart(6, "0")}`;
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { count, qrSize } = parsed.data;

  try {
    // Generate cards one at a time so sequential codes don't collide
    const created: { id: string; cardCode: string; publicToken: string; url: string; qrDataUrl: string }[] = [];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < count; i++) {
        const cardCode = await nextCardCode(tx);
        const publicToken = generatePublicToken();

        const card = await tx.card.create({
          data: {
            clientId: null, // blank / pre-printed — no client yet
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
    }, { timeout: 60000 });

    return NextResponse.json({ cards: created, generatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error("Batch card generation error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to generate batch: ${details}` }, { status: 500 });
  }
}

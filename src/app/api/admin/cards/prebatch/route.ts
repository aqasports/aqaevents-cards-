import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { CardsService } from "@/domains/cards/cards.service";

const cardsService = new CardsService();

const batchSchema = z.object({
  count: z.number().int().min(1).max(200),
  qrSize: z.number().int().min(100).max(800).default(400),
});

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
    const created = await cardsService.generatePrebatch(count, qrSize);
    return NextResponse.json({ cards: created, generatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error("POST cards prebatch API error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to generate batch: ${details}` }, { status: 500 });
  }
}

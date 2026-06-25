import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { CardsService } from "@/modules/cards/service";
import { batchSchema } from "@/modules/cards/validators";

const cardsService = new CardsService();

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

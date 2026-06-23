import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { CardsService } from "@/domains/cards/cards.service";

const cardsService = new CardsService();

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const clientIds: string[] = body.clientIds ?? [];
  const qrSize: number = typeof body.qrSize === "number" ? Math.min(800, Math.max(100, body.qrSize)) : 400;
  const mode: "client" | "blank" | "all" = body.mode ?? "client";

  try {
    const items = await cardsService.exportCardsWithQrs({ clientIds, qrSize, mode });
    return NextResponse.json({ items, generatedAt: new Date().toISOString() });
  } catch (err: unknown) {
    console.error("POST cards export API error:", err);
    return NextResponse.json({ error: "Failed to export cards" }, { status: 500 });
  }
}
